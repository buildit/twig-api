'use strict';
const Boom = require('boom');
const Joi = require('joi');
const R = require('ramda');
const PouchDB = require('pouchdb');
const config = require('../../config');
const logger = require('../../log')('TWIGLETS');

const createTwigletRequest = Joi.object({
  _id: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  model: Joi.string().required(), // could be url instead?
  twiglet: Joi.string(), // twiglet to copy from...could be url instead?
  googlesheet: Joi.string().uri(),
  commitMessage: Joi.string().required(),
});

const baseTwigletRequest = Joi.object({
  _id: Joi.string().required(),
  _rev: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
});

const updateTwigletRequest = baseTwigletRequest.keys({
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

const getTwigletsResponse = Joi.array().items(
  baseTwigletRequest.keys(baseTwigletResponse)
);

const createTwiglet = (request, reply) => {
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
          .then(() => twigletLookupDb.put(
            R.pick(['_id', '_rev', 'name', 'description'], request.payload)
          ))
          .then(() => twigletLookupDb.get(request.payload._id))
          .then((doc) => {
            const url = request.buildUrl(`/twiglets/${request.payload._id}`);
            const modelUrl = request.buildUrl(`/twiglets/${request.payload._id}/model`);
            const changelogUrl = request.buildUrl(`/twiglets/${request.payload._id}/changelog`);
            const viewsUrl = request.buildUrl(`/twiglets/${request.payload._id}/views`);
            return reply(R.merge(
              doc,
              {
                url,
                model_url: modelUrl,
                changelog_url: changelogUrl,
                views_url: viewsUrl,
                nodes: [],
                links: [],
                commitMessage: request.payload.commitMessage,
              })).created(url);
          });
      }
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const getTwiglet = (request, reply) => {
  const dbString = config.getTenantDatabaseString(request.params.id);
  const db = new PouchDB(dbString, { skip_setup: true });
  return db.allDocs({ include_docs: true })
    .then((doc) => {
      const url = request.buildUrl(`/twiglets/${request.params._id}`);
      const modelUrl = request.buildUrl(`/twiglets/${request.params._id}/model`);
      const changelogUrl = request.buildUrl(`/twiglets/${request.params._id}/changelog`);
      const viewsUrl = request.buildUrl(`/twiglets/${request.params._id}/views`);
      reply(R.merge(
        doc,
        {
          url,
          model_url: modelUrl,
          changelog_url: changelogUrl,
          views_url: viewsUrl,
        }
      ));
    })
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const getTwiglets = (request, reply) => {
  const dbString = config.getTenantDatabaseString('twiglets');
  const db = new PouchDB(dbString, { skip_setup: true });
  return db.allDocs({ include_docs: true })
    .then((doc) => {
      const twiglets = doc.rows.map((twiglet) => R.merge(
        twiglet.doc,
        {
          url: request.buildUrl(`/twiglets/${twiglet.doc._id}`),
          model_url: request.buildUrl(`/twiglets/${twiglet.doc._id}/model`),
          changelog_url: request.buildUrl(`/twiglets/${twiglet.doc._id}/changelog`),
          views_url: request.buildUrl(`/twiglets/${twiglet.doc._id}/views`),
        }));
      return reply(twiglets);
    })
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const deleteTwiglet = (request, reply) => {
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
    handler: createTwiglet,
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
    handler: getTwiglets,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getTwigletsResponse, failAction: 'log' },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/twiglets/{id}',
    handler: getTwiglet,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getTwigletResponse },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/twiglets/{id}',
    handler: (request, reply) => reply(Boom.notImplemented()),
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
    handler: deleteTwiglet,
    config: {
      tags: ['api'],
    }
  },
];
