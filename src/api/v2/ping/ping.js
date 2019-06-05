'use strict';

const rp = require('request-promise');
const { config, getContextualConfig } = require('../../../config');
const { version } = require('../../../../package');
const logger = require('../../../log')('DB');

const ping = async (request) => {
  const contextualConfig = getContextualConfig(request);
  let couchDbResponse = { version: 'COUCH NOT UP' };
  try {
    couchDbResponse = JSON.parse(await rp.get(contextualConfig.DB_URL));
  }
  catch (err) {
    logger.error('Could not connect to couch');
  }

  return {
    version,
    couchdbVersion: couchDbResponse.version,
    config: Object.assign({}, config, contextualConfig),
    authenticated: request.auth.credentials,
  };
};

module.exports.routes = [
  {
    method: ['GET'],
    path: '/v2/ping',
    handler: ping,
    options: {
      auth: { mode: 'try' },
      tags: ['api'],
    },
  },
  {
    method: ['GET'],
    path: '/ping',
    handler: ping,
    options: {
      auth: { mode: 'try' },
      tags: ['api'],
    },
  },
  {
    method: ['GET'],
    path: '/',
    handler: (request, h) => h.response().code(204),
    options: {
      auth: { mode: 'try' },
      tags: ['api'],
    },
  },
];
