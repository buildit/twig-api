'use strict';
const Boom = require('boom');
const PouchDb = require('pouchdb');
const config = require('../../../config');
const logger = require('../../../log')('MODEL');
const Joi = require('joi');
const R = require('ramda');

const twigletModelBase = Joi.object({
  _rev: Joi.string(),
  entities: Joi.object().pattern(/[\S\s]*/, Joi.object({
    type: Joi.string(),
    color: Joi.string(),
    size: [Joi.string().allow(''), Joi.number()],
    class: Joi.string().required(),
    image: Joi.string().required(),
  })),
});

const getTwigletInfoByName = (name) => {
  const twigletLookupDb = new PouchDb(config.getTenantDatabaseString('twiglets'));
  return twigletLookupDb.allDocs({ include_docs: true })
  .then(twigletsRaw => {
    const modelArray = twigletsRaw.rows.filter(row => row.doc.name === name);
    if (modelArray.length) {
      return modelArray[0].doc;
    }
    const error = Error('Not Found');
    error.status = 404;
    throw error;
  });
};

const getModelHandler = (request, reply) => {
  getTwigletInfoByName(request.params.name)
  .then(twigletInfo => {
    const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('model');
  })
  .then((doc) => {
    reply({
      _rev: doc._rev,
      entities: doc.data.entities,
    });
  })
  .catch((error) => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });
};

const putModelHandler = (request, reply) => {
  getTwigletInfoByName(request.params.name)
    .then(twigletInfo => {
      const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
      return db.get('model')
      .then((doc) => {
        if (doc._rev === request.payload._rev) {
          doc.data = R.omit(['_rev', 'name'], request.payload);
          return db.put(doc)
            .then(() => doc);
        }
        const error = Error('Conflict, bad revision number');
        error.status = 409;
        error._rev = doc._rev;
        throw error;
      });
    })
    .then((doc) =>
      reply({
        _rev: doc._rev,
        entities: doc.data.entities,
      }).code(200)
    )
    .catch((error) => {
      logger.error(JSON.stringify(error));
      const boomError = Boom.create(error.status || 500, error.message);
      boomError.output.payload._rev = error._rev;
      return reply(boomError);
    });
};

module.exports.routes = [
  {
    method: ['GET'],
    path: '/twiglets/{name}/model',
    handler: getModelHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: twigletModelBase },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/twiglets/{name}/model',
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
