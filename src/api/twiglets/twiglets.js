'use strict';
const Boom = require('boom');
const Joi = require('joi');
const PouchDB = require('pouchdb');
const config = require('../../config');
const logger = require('../../log')('TWIGLETS');

const twigletSchema = {
  _id: Joi.string().required(),
};

const createTwiglet = (request, reply) => {
  const dbString = config.getTenantDatabaseString(request.payload._id);
  const db = new PouchDB(dbString, { skip_setup: true });
  return db
    .info()
    .then(() => reply(Boom.conflict('Twiglet already exists')))
    .catch(error => {
      if (error.status === 404) {
        const createdDb = new PouchDB(dbString);
        return createdDb.info().then(() => {
          const url = request.buildUrl(`/twiglets/${request.payload._id}`);
          return reply({ url }).created(url);
        });
      }
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const getTwiglet = (request, reply) => {
  const dbString = config.getTenantDatabaseString(request.params.id);
  const db = new PouchDB(dbString, { skip_setup: true });
  return db.info()
    .then(() => reply({
      _id: request.params.id
    }))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const deleteTwiglet = (request, reply) => {
  const dbString = config.getTenantDatabaseString(request.params.id);
  const db = new PouchDB(dbString, { skip_setup: true });
  return db.destroy()
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
        payload: twigletSchema,
      }
    }
  },
  {
    method: ['GET'],
    path: '/twiglets/{id}',
    handler: getTwiglet,
    config: {
      auth: { mode: 'optional' },
    }
  },
  {
    method: ['DELETE'],
    path: '/twiglets/{id}',
    handler: deleteTwiglet,
  },
];
