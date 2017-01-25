'use strict';
const Boom = require('boom');
const Joi = require('joi');
const R = require('ramda');
const PouchDB = require('pouchdb');
const config = require('../../config');
const logger = require('../../log')('TWIGLETS');
const Changelog = require('./changelog');
const Model = require('../models/');

const createTwigletRequest = Joi.object({
  _id: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required().allow(''),
  model: Joi.string().required(),
  cloneTwiglet: Joi.string(),
  twiglet: Joi.string(), // twiglet to copy from...could be url instead?
  googlesheet: Joi.string().uri().allow(''),
  commitMessage: Joi.string().required(),
});

const baseTwigletRequest = Joi.object({
  _id: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required().allow(''),
});

const updateTwigletRequest = baseTwigletRequest.keys({
  _id: Joi.string(),
  _rev: Joi.string().required(),
  nodes: Joi.array().required(),
  links: Joi.array().required(),
  commitMessage: Joi.string().required(),
});

const baseTwigletResponse = {
  url: Joi.string().uri().required(),
  model_url: Joi.string().uri().required(),
  changelog_url: Joi.string().uri().required(),
  views_url: Joi.string().uri().required(),
};

const getTwigletResponse = updateTwigletRequest.keys(baseTwigletResponse);

const getTwigletsResponse = Joi.array().required().items(
  baseTwigletRequest.keys(baseTwigletResponse).unknown()
);

const getTwiglet = (id, urlBuilder) => {
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  const dbString = config.getTenantDatabaseString(id);
  const db = new PouchDB(dbString, { skip_setup: true });
  return Promise.all([
    twigletLookupDb.get(id),
    db.allDocs({
      include_docs: true,
      keys: ['nodes', 'links', 'changelog']
    }),
  ])
  .then(([twigletInfo, twigletDocs]) => {
    const url = urlBuilder(`/twiglets/${id}`);
    const modelUrl = urlBuilder(`/twiglets/${id}/model`);
    const changelogUrl = urlBuilder(`/twiglets/${id}/changelog`);
    const viewsUrl = urlBuilder(`/twiglets/${id}/views`);
    const twigletData = twigletDocs.rows.reduce((obj, row) => {
      obj[row.id] = row.doc;
      return obj;
    }, {});
    return R.merge(
      R.omit(['changelog'], twigletData),
      {
        _id: id,
        _rev: `${twigletInfo._rev}:${twigletData.nodes._rev}:${twigletData.links._rev}`,
        name: twigletInfo.name,
        description: twigletInfo.description,
        commitMessage: twigletData.changelog.data[0].message,
        nodes: twigletData.nodes.data,
        links: twigletData.links.data,
        url,
        model_url: modelUrl,
        changelog_url: changelogUrl,
        views_url: viewsUrl,
      });
  });
};

const getTwigletHandler = (request, reply) =>
  getTwiglet(request.params.id, request.buildUrl)
    .then((twiglet) => reply(twiglet))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });

const createTwigletHandler = (request, reply) => {
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  const dbString = config.getTenantDatabaseString(request.payload._id);
  const db = new PouchDB(dbString, { skip_setup: true });
  return db
    .info()
    .then(() => reply(Boom.conflict('Twiglet already exists')))
    .catch(error => {
      if (error.status === 404) {
        const createdDb = new PouchDB(dbString);
        return createdDb.info()
          .then(() => {
            if (!request.payload.cloneTwiglet) {
              return Model.getModel(request.payload.model)
              .then(model => {
                delete model._id;
                delete model._rev;
                delete model.url;
                return model;
              })
              .then(model => Promise.all([
                createdDb.bulkDocs([
                  { _id: 'model', data: model },
                  { _id: 'nodes', data: [] },
                  { _id: 'links', data: [] },
                  { _id: 'views', data: [] },
                ]),
                twigletLookupDb.put(R.pick(['_id', 'name', 'description'], request.payload)),
                Changelog.addCommitMessage(request.payload, request.auth.credentials.user.name),
              ]));
            }
            const cloneString = config.getTenantDatabaseString(request.payload.cloneTwiglet);
            const cloneDb = new PouchDB(cloneString, { skip_setup: true });
            return cloneDb.allDocs({
              include_docs: true,
              keys: ['links', 'model', 'nodes', 'views']
            })
            .then(twigletDocs =>
              Promise.all([
                createdDb.bulkDocs([
                  { _id: 'links', data: twigletDocs.rows[0].doc.data },
                  { _id: 'model', data: twigletDocs.rows[1].doc.data },
                  { _id: 'nodes', data: twigletDocs.rows[2].doc.data },
                  { _id: 'views', data: twigletDocs.rows[3].doc.data },
                ]),
                twigletLookupDb.put(R.pick(['_id', 'name', 'description'], request.payload)),
                Changelog.addCommitMessage(request.payload, request.auth.credentials.user.name),
              ])
            );
          })
          .then(() =>
            getTwiglet(request.payload._id, request.buildUrl)
          )
          .then((twiglet) => {
            reply(twiglet).created(twiglet.url);
          })
          .catch((err) => {
            logger.error(JSON.stringify(err));
            return reply(Boom.create(err.status || 500, err.message, err));
          });
      }
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const getTwigletsHandler = (request, reply) => {
  const dbString = config.getTenantDatabaseString('twiglets');
  const db = new PouchDB(dbString, { skip_setup: true });
  return db.allDocs({ include_docs: true })
    .then((doc) => {
      const twiglets = doc.rows.map((twiglet) =>
        R.merge(
          R.omit(['_rev'], twiglet.doc),
          {
            url: request.buildUrl(`/twiglets/${twiglet.doc._id}`),
            model_url: request.buildUrl(`/twiglets/${twiglet.doc._id}/model`),
            changelog_url: request.buildUrl(`/twiglets/${twiglet.doc._id}/changelog`),
            views_url: request.buildUrl(`/twiglets/${twiglet.doc._id}/views`),
          })
      );
      return reply(twiglets);
    })
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const putTwigletHandler = (request, reply) => {
  const _revs = request.payload._rev.split(':');
  if (_revs.length !== 3) {
    return reply(
      Boom.badRequest('_rev must be in the form of twigletInfo._rev:nodes._rev:links._rev')
    );
  }
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  const dbString = config.getTenantDatabaseString(request.params.id);
  const db = new PouchDB(dbString, { skip_setup: true });
  return Promise.all([
    twigletLookupDb.get(request.params.id),
    db.allDocs({
      include_docs: true,
      keys: ['nodes', 'links']
    }),
  ])
  .then(([twigletInfo, twigletDocs]) => {
    const twigletData = twigletDocs.rows.reduce((obj, row) => {
      obj[row.id] = row.doc;
      return obj;
    }, {});
    if (twigletInfo._rev !== _revs[0]
        || twigletData.nodes._rev !== _revs[1]
        || twigletData.links._rev !== _revs[2]) {
      const error = Error('Your revision number is out of date');
      error.status = 409;
      error._rev = `${twigletInfo._rev}:${twigletData.nodes._rev}:${twigletData.links._rev}`;
      throw error;
    }
    twigletInfo.name = request.payload.name;
    twigletInfo.description = request.payload.description;
    twigletData.nodes.data = request.payload.nodes;
    twigletData.links.data = request.payload.links;
    return Promise.all([
      twigletLookupDb.put(twigletInfo),
      db.put(twigletData.nodes),
      db.put(twigletData.links),
      Changelog.addCommitMessage(
        {
          _id: request.params.id,
          commitMessage: request.payload.commitMessage
        },
        request.auth.credentials.user.name),
    ]);
  })
  .then(() =>
    getTwiglet(request.params.id, request.buildUrl)
  )
  .then((twiglet) => {
    reply(twiglet).code(200);
  })
  .catch((error) => {
    logger.error(JSON.stringify(error));
    const boomError = Boom.create(error.status || 500, error.message);
    boomError.output.payload._rev = error._rev;
    return reply(boomError);
  });
};

const deleteTwigletHandler = (request, reply) => {
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  const dbString = config.getTenantDatabaseString(request.params.id);
  const db = new PouchDB(dbString, { skip_setup: true });
  return db.destroy()
    .then(() => twigletLookupDb.get(request.params.id))
    .then(doc => twigletLookupDb.remove(doc._id, doc._rev))
    .then(() => reply().code(204))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

module.exports.routes = [
  {
    method: ['POST'],
    path: '/twiglets',
    handler: createTwigletHandler,
    config: {
      validate: {
        payload: createTwigletRequest,
      },
      response: { schema: getTwigletResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/twiglets',
    handler: getTwigletsHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getTwigletsResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/twiglets/{id}',
    handler: getTwigletHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getTwigletResponse },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/twiglets/{id}',
    handler: putTwigletHandler,
    config: {
      validate: {
        payload: updateTwigletRequest
      },
      response: { schema: getTwigletResponse },
      tags: ['api'],
    }
  },
  {
    method: ['DELETE'],
    path: '/twiglets/{id}',
    handler: deleteTwigletHandler,
    config: {
      tags: ['api'],
    }
  },
];
