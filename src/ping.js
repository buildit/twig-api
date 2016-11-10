const config = require('./utils/config');
const ramda = require('ramda');
const version = require('../package').version;

module.exports.ping = (request, reply) =>
  reply({
    version,
    config: ramda.omit('_secrets')(config)
  });
