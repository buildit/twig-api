'use strict';
const Boom = require('boom');
const Joi = require('joi');
const PouchDB = require('pouchdb');
const config = require('../../config');
const logger = require('../../log')('MODELS');

const createModelRequest = Joi.object({
  _id: Joi.string().required(),
  entities: Joi.object().pattern(/[\S\s]*/, Joi.object({
    class: Joi.string().required(),
    color: Joi.string(),
    image: Joi.string().required(),
    size: [Joi.string().allow(''), Joi.number()],
    type: Joi.string(),
  })),
});

const updateModelRequest = createModelRequest.keys({
  _rev: Joi.string().required(),
});

const getModelResponse = updateModelRequest.keys({
  url: Joi.string().uri().required()
});

const getModelsResponse = Joi.array().items(Joi.object({
  _id: Joi.string().required(),
  url: Joi.string().required(),
}));

const getModelsHandler = (request, reply) => {
  const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
  return db.allDocs({ include_docs: true })
    .then(modelsRaw => {
      const orgModels = modelsRaw.rows.reduce((array, model) => {
        const object = {
          _id: model.id,
          url: request.buildUrl(`/models/${model.id}`),
        };
        array.push(object);
        return array;
      }, []);
      return reply(orgModels);
    })
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const getModel = (id) => {
  const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
  return db.get(id);
};

const getModelHandler = (request, reply) => {
  getModel(request.params.id)
    .then(model => {
      console.log('model', model);
      const modelResponse = {
        entities: model.data.entities,
        _id: model._id,
        _rev: model._rev,
        url: request.buildUrl(`/models/${model._id}`),
      };
      reply(modelResponse);
    })
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const routes = [
  {
    method: ['POST'],
    path: '/models',
    handler: (request, reply) => reply(Boom.notImplemented()),
    config: {
      validate: {
        payload: createModelRequest
      },
      response: { schema: getModelResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/models',
    handler: getModelsHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getModelsResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/models/{id}',
    handler: getModelHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getModelResponse },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/models/{id}',
    handler: (request, reply) => reply(Boom.notImplemented()),
    config: {
      validate: {
        payload: updateModelRequest
      },
      response: { schema: getModelResponse },
      tags: ['api'],
    }
  },
  {
    method: ['DELETE'],
    path: '/models/{id}',
    handler: (request, reply) => reply(Boom.notImplemented()),
    config: {
      tags: ['api'],
    }
  },
];

module.exports = {
  getModel,
  getModelResponse,
  updateModelRequest,
  routes,
};
