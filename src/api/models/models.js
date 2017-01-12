'use strict';
const Boom = require('boom');
const Joi = require('joi');

const createModelRequest = Joi.object({
  _id: Joi.string().required(),
  entities: Joi.object().pattern(/[\S\s]*/, Joi.object({
    type: Joi.string().required(),
    color: Joi.string().required(),
    size: Joi.string().required(),
    class: Joi.string().required(),
    image: Joi.string().required(),
  })),
});

const updateModelRequest = createModelRequest.keys({
  _rev: Joi.string().required(),
});

const getModelResponse = updateModelRequest.keys({
  url: Joi.string().uri().required()
});

const getModelsResponse = Joi.array().items(getModelResponse);

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
    handler: (request, reply) => reply(Boom.notImplemented()),
    config: {
      auth: { mode: 'optional' },
      response: { schema: getModelsResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/models/{id}',
    handler: (request, reply) => reply(Boom.notImplemented()),
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
  getModelResponse,
  updateModelRequest,
  routes,
};
