'use strict';

// const rp = require('request-promise');
const { config, getContextualConfig } = require('../../../config');
const { version } = require('../../../../package');
// TODO: used to log errors in ping -- need to refactor ping
// const logger = require('../../../log')('DB');

const ping = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const couchDbResponse = { version: 'COUCH NOT UP (not really, this is wrong...)' };

  // hold in variable to log
  const ret = {
    version,
    couchdbVersion: couchDbResponse.version,
    config: Object.assign({}, config, contextualConfig),
    authenticated: request.auth.credentials,
  };
  return ret;
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
    // because the aws load balancer health check hits this route
    method: ['GET'],
    path: '/',
    handler: () => 'I could put anything here',
    options: {
      auth: { mode: 'try' },
      tags: ['api'],
    },
  },
];
