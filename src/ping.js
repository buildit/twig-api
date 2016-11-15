const config = require('./utils/config');
const ramda = require('ramda');
const version = require('../package').version;

const ping = (request, reply) =>
  reply({
    version,
    config: ramda.omit('_secrets')(config)
  });

exports.routes = {
  method: ['GET'],
  path: '/ping',
  handler: ping,
  config: {
    auth: false,
  }
};

