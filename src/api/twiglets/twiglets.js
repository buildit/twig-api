'use strict';
const Boom = require('boom');
const Joi = require('joi');
const R = require('ramda');
const PouchDB = require('pouchdb');
const uuidV4 = require('uuid/v4');
const config = require('../../config');
const logger = require('../../log')('TWIGLETS');
const Changelog = require('./changelog');
const Model = require('../models/');

const createTwigletRequest = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required().allow(''),
  model: Joi.string().required(),
  cloneTwiglet: Joi.string().allow(''),
  twiglet: Joi.string(), // twiglet to copy from...could be url instead?
  googlesheet: Joi.string().uri().allow(''),
  commitMessage: Joi.string().required(),
});

const baseTwigletRequest = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required().allow(''),
});

const updateTwigletRequest = baseTwigletRequest.keys({
  _rev: Joi.string().required(),
  nodes: Joi.array().required(),
  links: Joi.array().required(),
  commitMessage: Joi.string().required(),
  doReplacement: Joi.boolean(),
});

const baseTwigletResponse = {
  url: Joi.string().uri().required(),
  model_url: Joi.string().uri().required(),
  changelog_url: Joi.string().uri().required(),
  views_url: Joi.string().uri().required(),
};

const getTwigletResponse = updateTwigletRequest.keys(baseTwigletResponse).keys({
  commitMessage: Joi.disallow(),
  latestCommit: Joi.object({
    message: Joi.string().required(),
    user: Joi.string().required(),
    timestamp: Joi.date().iso(),
    replacement: Joi.bool(),
  })
});

const getTwigletsResponse = Joi.array().required().items(
  baseTwigletRequest.keys(baseTwigletResponse).unknown()
);

const getTwigletInfoByName = (name) => {
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  return twigletLookupDb.allDocs({ include_docs: true })
  .then(twigletsRaw => {
    const modelArray = twigletsRaw.rows.filter(row => row.doc.name === name);
    if (modelArray.length) {
      const twiglet = modelArray[0].doc;
      twiglet.twigId = twiglet._id;
      return twiglet;
    }
    const error = Error('Not Found');
    error.status = 404;
    throw error;
  });
};

const getTwiglet = (name, urlBuilder) =>
  getTwigletInfoByName(name)
  .then(twigletInfo => {
    const dbString = config.getTenantDatabaseString(twigletInfo.twigId);
    const db = new PouchDB(dbString, { skip_setup: true });
    return db.allDocs({
      include_docs: true,
      keys: ['nodes', 'links', 'changelog']
    })
    .then(twigletDocs => {
      const url = urlBuilder(`/twiglets/${name}`);
      const modelUrl = urlBuilder(`/twiglets/${name}/model`);
      const changelogUrl = urlBuilder(`/twiglets/${name}/changelog`);
      const viewsUrl = urlBuilder(`/twiglets/${name}/views`);
      const twigletData = twigletDocs.rows.reduce((obj, row) => {
        obj[row.id] = row.doc;
        return obj;
      }, {});
      return R.merge(
        R.omit(['changelog', 'views'], twigletData),
        {
          _rev: `${twigletInfo._rev}:${twigletData.nodes._rev}:${twigletData.links._rev}`,
          name: twigletInfo.name,
          description: twigletInfo.description,
          latestCommit: twigletData.changelog.data[0],
          nodes: twigletData.nodes.data,
          links: twigletData.links.data,
          url,
          model_url: modelUrl,
          changelog_url: changelogUrl,
          views_url: viewsUrl,
        });
    });
  });

const getTwigletHandler = (request, reply) =>
  getTwiglet(request.params.name, request.buildUrl)
    .then((twiglet) => reply(twiglet))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });

const createTwigletHandler = (request, reply) => {
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  return twigletLookupDb.allDocs({ include_docs: true })
  .then(docs => {
    if (docs.rows.some(row => row.doc.name === request.payload.name)) {
      return reply(Boom.conflict('Twiglet already exists'));
    }
    const newTwiglet = R.pick(['name', 'description'], request.payload);
    newTwiglet._id = `twig-${uuidV4()}`;
    return twigletLookupDb.post(newTwiglet)
    .then(twigletInfo => {
      const dbString = config.getTenantDatabaseString(twigletInfo.id);
      const createdDb = new PouchDB(dbString);
      if (request.payload.cloneTwiglet === 'N/A' || !request.payload.cloneTwiglet) {
        return Model.getModel(request.payload.model)
        .then(model =>
          Promise.all([
            createdDb.bulkDocs([
              { _id: 'model', data: model.data },
              { _id: 'nodes', data: [] },
              { _id: 'links', data: [] },
              { _id: 'views', data: [] },
            ]),
            Changelog.addCommitMessage(twigletInfo.id,
              request.payload.commitMessage,
              request.auth.credentials.user.name),
          ])
        );
      }
      return getTwigletInfoByName(request.payload.cloneTwiglet)
      .then(twigletToBeClonedInfo => {
        const cloneString = config.getTenantDatabaseString(twigletToBeClonedInfo.twigId);
        const clonedDb = new PouchDB(cloneString, { skip_setup: true });
        return clonedDb.allDocs({
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
            Changelog.addCommitMessage(twigletInfo.id,
              request.payload.commitMessage,
              request.auth.credentials.user.name),
          ])
        );
      });
    })
    .then(() =>
      getTwiglet(request.payload.name, request.buildUrl)
    )
    .then((twiglet) => {
      reply(twiglet).created(twiglet.url);
    });
  })
  .catch((error) => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });
};

const getTwigletsHandler = (request, reply) => {
  const dbString = config.getTenantDatabaseString('twiglets');
  const db = new PouchDB(dbString, { skip_setup: true });
  return db.allDocs({ include_docs: true })
    .then((doc) => {
      const twiglets = doc.rows
      .map((twiglet) =>
        R.merge(
          R.omit(['_rev', '_id'], twiglet.doc),
          {
            url: request.buildUrl(`/twiglets/${twiglet.doc.name}`),
            model_url: request.buildUrl(`/twiglets/${twiglet.doc.name}/model`),
            changelog_url: request.buildUrl(`/twiglets/${twiglet.doc.name}/changelog`),
            views_url: request.buildUrl(`/twiglets/${twiglet.doc.name}/views`),
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
  return getTwigletInfoByName(request.params.name)
  .then(twigletInfo => {
    const dbString = config.getTenantDatabaseString(twigletInfo.twigId);
    const db = new PouchDB(dbString, { skip_setup: true });
    return db.allDocs({
      include_docs: true,
      keys: ['nodes', 'links']
    })
    .then(twigletDocs => {
      const twigletData = twigletDocs.rows.reduce((obj, row) => {
        obj[row.id] = row.doc;
        return obj;
      }, {});
      if (twigletInfo._rev !== _revs[0]
          || twigletData.nodes._rev !== _revs[1]
          || twigletData.links._rev !== _revs[2]) {
        return getTwiglet(request.params.name, request.buildUrl)
        .then(twiglet => {
          const error = Error('Your revision number is out of date');
          error.status = 409;
          error.twiglet = twiglet;
          throw error;
        });
      }
      twigletInfo.name = request.payload.name;
      twigletInfo.description = request.payload.description;
      const twigIdVar = twigletInfo.twigId;
      delete twigletInfo.twigId;
      twigletData.nodes.data = request.payload.nodes;
      twigletData.links.data = request.payload.links;
      return Promise.all([
        twigletLookupDb.put(twigletInfo),
        db.put(twigletData.nodes),
        db.put(twigletData.links),
        Changelog.addCommitMessage(
          twigIdVar,
          request.payload.commitMessage,
          request.auth.credentials.user.name,
          request.payload.doReplacement
        ),
      ]);
    });
  })
  .then(() =>
    getTwiglet(request.payload.name, request.buildUrl)
  )
  .then((twiglet) => reply(twiglet).code(200))
  .catch((error) => {
    if (error.status !== 409) {
      logger.error(JSON.stringify(error));
    }
    const boomError = Boom.create(error.status || 500, error.message);
    boomError.output.payload.data = error.twiglet;
    return reply(boomError);
  });
};

const deleteTwigletHandler = (request, reply) => {
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  return getTwigletInfoByName(request.params.name)
  .then(twigletInfo => {
    const dbString = config.getTenantDatabaseString(twigletInfo.twigId);
    const db = new PouchDB(dbString, { skip_setup: true });
    return db.destroy()
      .then(() => twigletLookupDb.remove(twigletInfo._id, twigletInfo._rev))
      .then(() => reply().code(204));
  })
  .catch((error) => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });
};

module.exports = {
  getTwigletInfoByName,
  routes: [
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
      path: '/twiglets/{name}',
      handler: getTwigletHandler,
      config: {
        auth: { mode: 'optional' },
        response: { schema: getTwigletResponse },
        tags: ['api'],
      }
    },
    {
      method: ['PUT'],
      path: '/twiglets/{name}',
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
      path: '/twiglets/{name}',
      handler: deleteTwigletHandler,
      config: {
        tags: ['api'],
      }
    },
  ],
};
