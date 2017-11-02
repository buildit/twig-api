'use strict';

const ramda = require('ramda');
const config = require('../../../config');
const version = require('../../../../package').version;
const rp = require('request-promise');

const ping = (request, reply) =>
  rp.get(config.DB_URL)
    .then(couchdbResponse => JSON.parse(couchdbResponse))
    .then(couchdbResponse => reply({
      version,
      couchdbVersion: couchdbResponse.version,
      config: ramda.omit('_secrets')(config),
      authenticated: request.auth.credentials,
    }));

module.exports.routes = [
  {
    method: ['GET'],
    path: '/v2/ping',
    handler: ping,
    config: {
      auth: { mode: 'try' },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/ping',
    handler: ping,
    config: {
      auth: { mode: 'try' },
      tags: ['api'],
    }
  },
];

