'use strict';
const Boom = require('boom');
const Models = require('../../models');

module.exports.routes = [
  {
    method: ['GET'],
    path: '/twiglets/{id}/model',
    handler: (request, reply) => reply(Boom.notImplemented()),
    config: {
      auth: { mode: 'optional' },
      response: { schema: Models.getModelResponse },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/twiglets/{id}/model',
    handler: (request, reply) => reply(Boom.notImplemented()),
    config: {
      validate: {
        payload: Models.updateModelRequest
      },
      response: { schema: Models.getModelResponse },
      tags: ['api'],
    }
  },
];
