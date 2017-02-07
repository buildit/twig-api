'use strict';
const PouchDb = require('pouchdb');
const Boom = require('boom');
const Joi = require('joi');
const config = require('../../../config');
const logger = require('../../../log')('CHANGELOG');

// probably want to return raw array rather than object (been flipping on this)
// but that would now be a breaking change
// thinking was object because that is extensible to include paging metadata
// but now maybe it's better to use Link headers (this is what GitHub does)
const getChangelogResponse = Joi.object({
  changelog: Joi.array().required().items(Joi.object({
    message: Joi.string().required(),
    user: Joi.string().required(),
    timestamp: Joi.date().iso(),
  }))
});

const getChangelogHandler = (request, reply) => {
  const db = new PouchDb(config.getTenantDatabaseString('organisation-models'));
  return db.get(request.params.id)
    .then((doc) => reply({ changelog: doc.data.changelog }))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const routes = [
  {
    method: ['GET'],
    path: '/models/{id}/changelog',
    handler: getChangelogHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getChangelogResponse },
      tags: ['api'],
    }
  },
];

module.exports = { routes };
