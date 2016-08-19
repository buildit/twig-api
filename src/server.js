const Hapi = require('hapi');
const dynogels = require('dynogels');
const Log = require('./utils/log');
const config = require('./utils/config');
const server = new Hapi.Server();
const logger = Log('SERVER');

server.connection({
  port: config.getEnv('SERVER_PORT')
});

server.route({
  method: 'GET',
  path: '/',
  handler: (request, reply) => {
    reply({
      status: 200,
      message: 'Hello World!'
    });
  }
});

dynogels.AWS.config.update({
  accessKeyId: config.getEnv('AWS_KEY'),
  secretAccessKey: config.getEnv('AWS_SECRET'),
  region: config.getEnv('AWS_REGION')
});

server.start(err => {
  if (err) {
    throw err;
  }
  logger.log('Server running at:', server.info.uri);
});
