const config = require('./utils/config');
const ramda = require('ramda');

module.exports.ping = (request, reply) => {
  return reply({ config: ramda.omit(config._secrets)(config) });
};
