'use strict';
const Boom = require('boom');
const Models = require('../../models');
const PouchDb = require('pouchdb');
const config = require('../../../config');
const logger = require('../../../log')('CHANGELOG');

const getModelHandler = (request, reply) => {
  const db = new PouchDb(config.getTenantDatabaseString(request.params.id), { skip_setup: true });
  return db.info()
    .then(() => db.get('model')
      .then((doc) => {
        reply({ changelog: doc.data });
      })
      .catch((error) => {
        if (error.status !== 404) {
          throw error;
        }
        return reply({ changelog: [] });
      }))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

module.exports.routes = [
  {
    method: ['GET'],
    path: '/twiglets/{id}/model',
    handler: getModelHandler,
    config: {
      auth: { mode: 'optional' },
      // response: { schema: Models.getModelResponse },
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
