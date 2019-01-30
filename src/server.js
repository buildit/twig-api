'use strict';

const Hapi = require('hapi');
const cookieAuth = require('hapi-auth-cookie');
const cls = require('continuation-local-storage');
const logger = require('./log')('SERVER');
const Inert = require('inert');
const Vision = require('vision');
const HapiSwagger = require('hapi-swagger');
const { version, engines } = require('../package');
const helpers = require('./server.helpers');
const v2 = require('./api/v2');
const config = require('./config');
const semver = require('semver');
require('../scripts/init-new-db');

const options = {
  info: {
    title: 'Twig API',
    version,
    license: {
      name: 'Apache-2.0'
    }
  }
};

if (!semver.satisfies(process.version, engines.node)) {
  throw new Error(`Node version '${process.version}' does not satisfy range '${engines.node}'`);
}

const ns = cls.createNamespace('hapi-request');

const server = new Hapi.Server();

server.connection({
  port: 3000,
  routes: {
    cors: {
      origin: [
        '*://localhost:*',
        'https://*.buildit.tools',
        '*://*.riglet',
        '*://*.kube.local:*',
        'http://twig-ui-redesign-user-testing.s3-website-us-west-2.amazonaws.com'
      ],
      credentials: true,
    },
    payload: { maxBytes: 500000000 }
  }
});

server.decorate('request', 'buildUrl', request => helpers.buildUrl(request), { apply: true });


server.ext('onRequest', (req, reply) => {
  ns.bindEmitter(req.raw.req);
  ns.bindEmitter(req.raw.res);
  ns.run(() => {
    ns.set('host', req.headers.host);
    reply.continue();
  });
});

server.ext('onRequest', (req, reply) => {
  const protocol = req.headers['x-forwarded-proto'] || req.connection.info.protocol;
  const host = req.headers['x-forwarded-host'] || req.info.hostname;
  if (host === 'localhost' || protocol === 'https') {
    return reply.continue();
  }
  return reply
    .redirect(`https://${host}${req.url.path}`)
    .permanent();
});

server.register(
  [
    cookieAuth,
    Inert,
    Vision,
    {
      register: HapiSwagger,
      options
    }
  ],
  (err) => {
    if (err) {
      throw err;
    }

    server.auth.strategy('session', 'cookie', 'required', {
      password: 'V@qj65#r6t^wvdq,p{ejrZadGHyununZ',
      isSecure: config.SECURE_COOKIES
    });
  }
);

Reflect.ownKeys(v2).forEach(key => server.route(v2[key].routes));

server.start((err) => {
  if (err) {
    throw err;
  }
  logger.log('Server running at:', server.info.uri);
});
