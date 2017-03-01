'use strict';
const Boom = require('boom');
const Joi = require('joi');
const PouchDb = require('pouchdb');
const config = require('../../../config');
const logger = require('../../../log')('VIEWS');

const updateViewsRequest = Joi.object({
  _rev: Joi.string().required(),
  views: Joi.array().required().items(Joi.object({
    _id: Joi.string().required(),
    collapsed_nodes: Joi.array().required().allow([]),
    description: Joi.string().required().allow(''),
    display_name: Joi.string().required().allow(''),
    fixed_nodes: Joi.object().required().allow({}),
    link_types: Joi.object().required().allow({}),
    name: Joi.string().required(),
    nav: Joi.object({
      'date-slider': Joi.number(),
      scale: Joi.string(),
      'show-node-label': Joi.boolean(),
    }),
    node_types: Joi.object().required().allow({}),
  })),
});

const getViewsResponse = updateViewsRequest.keys({
  url: Joi.string().uri().required(),
});

const getTwigletInfoByName = (name) => {
  const twigletLookupDb = new PouchDb(config.getTenantDatabaseString('twiglets'));
  return twigletLookupDb.allDocs({ include_docs: true })
  .then(twigletsRaw => {
    const modelArray = twigletsRaw.rows.filter(row => row.doc.name === name);
    if (modelArray.length) {
      const twiglet = modelArray[0].doc;
      twiglet.originalId = twiglet._id;
      twiglet._id = `twig-${twiglet._id}`;
      return twiglet;
    }
    const error = Error('Not Found');
    error.status = 404;
    throw error;
  });
};

const getViewsHandler = (request, reply) => {
  getTwigletInfoByName(request.params.name)
  .then(twigletInfo => {
    const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('views');
  })
  .then((doc) => {
    reply({
      _rev: doc._rev,
      views: doc.data,
      url: request.buildUrl(`/twiglets/${request.params.name}/views`),
    });
  })
  .catch((error) => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });
};

module.exports.routes = [
  {
    method: ['GET'],
    path: '/twiglets/{name}/views',
    handler: getViewsHandler,
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
