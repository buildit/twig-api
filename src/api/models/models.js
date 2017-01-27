'use strict';
const Boom = require('boom');
const Joi = require('joi');
const PouchDB = require('pouchdb');
const config = require('../../config');
const logger = require('../../log')('MODELS');
const R = require('ramda');

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

const getModel = (id) => {
  const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
  return db.get(id);
};

const postModelsHandler = (request, reply) => {
  const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
  return db.get(request.payload._id)
    .then(() => reply(`Model "${request.payload._id}" already exists`).code(409))
    .catch(error => {
      if (error.status !== 404) {
        logger.error(JSON.stringify(error));
        return reply(Boom.create(error.status || 500, error.message, error));
      }
      return db.put({
        _id: request.payload._id,
        data: {
          entities: request.payload.entities,
        }
      })
        .then(() => getModel(request.payload._id))
        .then(newModel => {
          console.log('newModel', newModel);
          const modelResponse = {
            entities: newModel.data.entities,
            _id: newModel._id,
            _rev: newModel._rev,
            url: request.buildUrl(`/models/${newModel._id}`),
          };
          console.log('here???', modelResponse);
          reply(modelResponse).code(201);
        })
        .catch(e => {
          console.log('error', error);
          logger.error(JSON.stringify(e));
          return reply(Boom.create(e.status || 500, e.message, e));
        });
    });
};

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

const getModelHandler = (request, reply) => {
  getModel(request.params.id)
    .then(model => {
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

const putModelHandler = (request, reply) => {
  const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
  getModel(request.payload._id)
    .then(model => {
      if (model._rev === request.payload._rev) {
        model.data = R.omit(['_rev', '_id'], request.payload);
        return db.put(model);
      }
      const error = Error('Conflict, bad revision number');
      error.status = 409;
      error._rev = model._rev;
      throw error;
    })
    .then(() => getModel(request.payload._id))
    .then(model => {
      const modelResponse = {
        entities: model.data.entities,
        _id: model._id,
        _rev: model._rev,
        url: request.buildUrl(`/models/${model._id}`),
      };
      return reply(modelResponse).code(200);
    })
    .catch((error) => {
      logger.error(JSON.stringify(error));
      const boomError = Boom.create(error.status || 500, error.message);
      if (error._rev) {
        boomError.output.payload._rev = error._rev;
      }
      return reply(boomError);
    });
};

const deleteModelsHandler = (request, reply) => {
  const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
  return db.get(request.params.id)
    .then(({ _rev }) => db.remove(request.params.id, _rev))
    .then(() => reply().code(204))
    .catch(error => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const routes = [
  {
    method: ['POST'],
    path: '/models',
    handler: postModelsHandler,
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
    handler: putModelHandler,
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
    handler: deleteModelsHandler,
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
