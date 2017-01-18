'use strict';
const Boom = require('boom');
const PouchDb = require('pouchdb');
const config = require('../../../config');
const logger = require('../../../log')('CHANGELOG');
const Joi = require('joi');
const R = require('ramda');

const twigletModelBase = Joi.object({
  _rev: Joi.string(),
  entities: Joi.object().pattern(/[\S\s]*/, Joi.object({
    type: Joi.string(),
    color: Joi.string(),
    size: [Joi.string(), Joi.number()],
    class: Joi.string().required(),
    image: Joi.string().required(),
  })),
});

const getModelHandler = (request, reply) => {
  const db = new PouchDb(config.getTenantDatabaseString(request.params.id), { skip_setup: true });
  return db.info()
    .then(() => db.get('model')
      .then((doc) => {
        reply({
          _rev: doc._rev,
          entities: doc.data.entities,
        });
      })
      .catch((error) => {
        if (error.status !== 404) {
          throw error;
        }
        error.message = 'please upload a model for this twiglet';
        return reply(Boom.create(error.status, error.message, error));
      }))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const putModelHandler = (request, reply) => {
  const db = new PouchDb(config.getTenantDatabaseString(request.params.id), { skip_setup: true });
  return db.info()
    .then(() => db.get('model'))
    .then((doc) => {
      if (doc._rev === request.payload._rev) {
        doc.data = R.omit(['_rev'], request.payload);
        return db.put(doc)
          .then(() => doc);
      }
      const error = Error('Conflict, bad revision number');
      error.status = 409;
      error._rev = doc._rev;
      reply(Boom.create(error.status, error.message, error));
      throw error;
    })
    .then((doc) =>
      reply({
        _rev: doc._rev,
        entities: doc.data.entities,
      }).ok()
    )
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
      response: { schema: twigletModelBase },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/twiglets/{id}/model',
    handler: putModelHandler,
    config: {
      validate: {
        payload: twigletModelBase,
      },
      response: { schema: twigletModelBase },
      tags: ['api'],
    }
  },
];
