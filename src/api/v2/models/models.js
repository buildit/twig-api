'use strict';
const Boom = require('boom');
const Joi = require('joi');
const dao = require('../DAO');
const logger = require('../../../log')('MODELS');

const createModelRequest = Joi.object({
  cloneModel: Joi.string().allow('').allow(null),
  commitMessage: Joi.string().required(),
  entities: Joi.object().pattern(/[\S\s]*/, Joi.object({
    class: Joi.string().required(),
    color: Joi.string(),
    image: Joi.string().required(),
    size: [Joi.string().allow('').allow(null), Joi.number()],
    type: Joi.string(),
    attributes: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      dataType: Joi.string().required(),
      required: Joi.bool().required(),
    })),
  })),
  name: Joi.string().required(),
});

const updateModelRequest = createModelRequest.keys({
  _rev: Joi.string().required(),
  doReplacement: Joi.bool(),
});

const getModelResponse = updateModelRequest.keys({
  url: Joi.string().uri().required(),
  changelog_url: Joi.string().uri().required(),
  commitMessage: Joi.invalid(),
  latestCommit: Joi.object({
    message: Joi.string().required(),
    user: Joi.string().required(),
    timestamp: Joi.date().iso(),
    replacement: Joi.bool(),
  }),
});

const getModelsResponse = Joi.array().items(Joi.object({
  name: Joi.string().required(),
  url: Joi.string().required(),
}));

const postModelsHandler = (request, reply) => {
  function respond (promise) {
    return promise
    .then(() => dao.models.getOne(request.payload.name))
    .then(newModel => {
      const modelResponse = {
        entities: newModel.data.entities,
        _rev: newModel._rev,
        name: newModel.data.name,
        url: request.buildUrl(`/v2/models/${newModel.data.name}`),
        changelog_url: request.buildUrl(`/v2/models/${newModel.data.name}/changelog`)
      };
      return reply(modelResponse).code(201);
    })
    .catch(e => {
      logger.error(JSON.stringify(e));
      return reply(Boom.create(e.status || 500, e.message, e));
    });
  }
  if (!request.payload.cloneModel) {
    respond(dao.models.create(request.payload, request.auth.credentials.user.name));
  }
  else {
    respond(dao.models.clone(request.payload, request.auth.credentials.user.name));
  }
};

const getModelsHandler = (request, reply) => {
  dao.models.getAll()
  .then(modelsRaw => {
    const orgModels = modelsRaw
    .map(row =>
      ({
        name: row.data.name,
        url: request.buildUrl(`/v2/models/${row.data.name}`),
      })
    );
    return reply(orgModels);
  })
  .catch((error) => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });
};

const getModelHandler = (request, reply) => {
  dao.models.getOne(request.params.name)
    .then(model => {
      const modelResponse = {
        entities: model.data.entities,
        name: model.data.name,
        _rev: model._rev,
        latestCommit: model.data.changelog[0],
        url: request.buildUrl(`/v2/models/${model.data.name}`),
        changelog_url: request.buildUrl(`/v2/models/${model.data.name}/changelog`)
      };
      return reply(modelResponse);
    })
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const putModelHandler = (request, reply) => {
  dao.models.update(request.payload, request.params.name, request.auth.credentials.user.name)
  .then(() => dao.models.getOne(request.payload.name))
  .then(model => {
    const modelResponse = {
      name: model.data.name,
      _rev: model._rev,
      entities: model.data.entities,
      url: request.buildUrl(`/v2/models/${model.data.name}`),
      changelog_url: request.buildUrl(`/v2/models/${model.data.name}/changelog`)
    };
    return reply(modelResponse).code(200);
  })
  .catch((error) => {
    if (error.status !== 409) {
      logger.error(JSON.stringify(error));
    }
    const boomError = Boom.create(error.status || 500, error.message);
    if (error.model) {
      boomError.output.payload.data = error.model;
      boomError.output.payload.data.url = request.buildUrl(`/v2/models/${error.model.name}`);
      boomError.output.payload.data.changelog_url =
        request.buildUrl(`/v2/models/${error.model.name}/changelog`);
    }
    return reply(boomError);
  });
};

const deleteModelsHandler = (request, reply) => {
  dao.models.delete(request.params).then(() => reply().code(204))
  .catch(error => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });
};

const routes = [
  {
    method: ['POST'],
    path: '/v2/models',
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
    path: '/v2/models',
    handler: getModelsHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getModelsResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/v2/models/{name}',
    handler: getModelHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getModelResponse },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/v2/models/{name}',
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
    path: '/v2/models/{name}',
    handler: deleteModelsHandler,
    config: {
      tags: ['api'],
    }
  },
];

module.exports = {
  getModelResponse,
  updateModelRequest,
  routes,
};
