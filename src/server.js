const Hapi = require('hapi');
const Basic = require('hapi-auth-basic');
const dynogels = require('dynogels');
const logger = require('./utils/log')('SERVER');
const config = require('./utils/config');
const ldap = require('ldapjs');

const server = new Hapi.Server();

server.connection({
  port: config.getEnv('SERVER_PORT')
});

function validate (request, username, password, callback) {
  const opts = {
    url: 'ldap://corp.riglet.io',
    timeout: 5000,
    connectTimeout: 10000
  };
  const client = ldap.createClient(opts);
  const dn = `${username}@corp.riglet.io`;
  return client.bind(dn, password, (err) => {
    const status = (err ? err.message : false) || 'OK';
    client.unbind();
    if (status !== 'OK') {
      return callback(null, false);
    }
    return callback(err, true, {
      id: username
    });
  });
}

server.register(Basic, (err) => {
  if (err) throw err;
  server.auth.strategy('simple', 'basic', { validateFunc: validate });
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

server.route({
  method: 'GET',
  path: '/login',
  config: { auth: 'simple' },
  handler: (request, reply) => {
    reply(`hello, ${request.auth.credentials.id}`);
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
