'use strict';
const Boom = require('boom');
const Joi = require('joi');

const updateViewsRequest = Joi.object({
  _rev: Joi.string().required(),
  views: Joi.array().required().items(Joi.object({
    _id: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().required(),
  })),
  commitMessage: Joi.string().required(),
});

const getViewsResponse = updateViewsRequest.keys({
  url: Joi.string().uri().required(),
});

module.exports.routes = [
  {
    method: ['GET'],
    path: '/twiglets/{id}/views',
    handler: (request, reply) => reply(Boom.notImplemented()),
    config: {
      auth: { mode: 'optional' },
      response: { schema: getViewsResponse },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/twiglets/{id}/views',
    handler: (request, reply) => reply(Boom.notImplemented()),
    config: {
      validate: {
        payload: updateViewsRequest,
      },
      response: { schema: getViewsResponse },
      tags: ['api'],
    }
  },
];
