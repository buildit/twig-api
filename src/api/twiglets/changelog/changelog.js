'use strict';
const PouchDb = require('pouchdb');
const Boom = require('boom');
const Joi = require('joi');
const config = require('../../../config');
const logger = require('../../../log')('CHANGELOG');

const get = (request, reply) => {
  const db = new PouchDb(config.getTenantDatabaseString(request.params.id), { skip_setup: true });
  return db.info()
    .then(() => db.get('changelog')
      .then((doc) => reply({ changelog: doc.data }))
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

const add = (request, reply) => {
  const db = new PouchDb(config.getTenantDatabaseString(request.params.id), { skip_setup: true });
  return db.info()
    .then(() => db.get('changelog')
      .catch((error) => {
        if (error.status !== 404) {
          throw error;
        }
        return { _id: 'changelog', data: [] };
      }))
    .then((doc) => {
      const commit = {
        message: request.payload.commitMessage,
        user: request.auth.credentials.user.name,
        timestamp: new Date().toISOString(),
      };
      doc.data.unshift(commit);
      return db.put(doc);
    })
    .then(() => reply({}).code(204))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

module.exports.routes = [
  {
    method: ['POST'],
    path: '/twiglets/{id}/changelog',
    handler: add,
    config: {
      validate: {
        payload: {
          commitMessage: Joi.string().required().trim(),
        }
      },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/twiglets/{id}/changelog',
    handler: get,
    config: {
      auth: { mode: 'optional' },
      tags: ['api'],
    }
  },
];
