'use strict';

// const rp = require('request-promise');
const { config, getContextualConfig } = require('../../../config');
const { version } = require('../../../../package');
const logger = require('../../../log')('DB');

// TODO: get rid of these, just for testing
let countPing = 0;
let countRoot = 0;

console.log('ping.js init');

const ping = async (request) => {
  console.log('incoming request to ping:', request);
  countPing += 1;
  console.log('countPing num:', countPing);
  console.log('start ping');
  const contextualConfig = getContextualConfig(request);
  console.log('contextualConfig', contextualConfig);
  const couchDbResponse = { version: 'COUCH NOT UP (not really, this is wrong...)' };
  console.log('couchDbResponse', couchDbResponse);
  // TODO: this is obviously doing nothing, need to get rid of it soon.
  try {
    // couchDbResponse = JSON.parse(await rp.get(contextualConfig.DB_URL));
  }
  catch (err) {
    logger.error('Could not connect to couch');
  }

  // hold in variable to log
  const ret = {
    version,
    couchdbVersion: couchDbResponse.version,
    config: Object.assign({}, config, contextualConfig),
    authenticated: request.auth.credentials,
  };
  console.log('ping return', ret);
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
    handler: () => {
      countRoot += 1;
      console.log('countRoot num:', countRoot);
      console.log("I AM THE ROUTE ROOT HANDLER '/', you have hit this route");
      return 'I could put anything here';
    },
    options: {
      auth: { mode: 'try' },
      tags: ['api'],
    },
  },
];
