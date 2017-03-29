'use strict';
const ramda = require('ramda');
const config = require('../../../config');
const version = require('../../../../package').version;

const ping = (request, reply) =>
  reply({
    version,
    config: ramda.omit('_secrets')(config),
    authenticated: request.auth.credentials,
  });

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
];

