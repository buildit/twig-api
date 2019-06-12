'use strict';

console.log('in server before importing.');
const Hapi = require('@hapi/hapi');

console.log('in server after importing Hapi.');
const cookieAuth = require('@hapi/cookie');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');

console.log('in server after importing HapiSwagger.');
const semver = require('semver');
const { version, engines } = require('../package');
const helpers = require('./server.helpers');
const v2 = require('./api/v2');
const { config } = require('./config');
const logger = require('./log')('SERVER');
require('./db-init');

console.log('in server after importing.');

const options = {
  info: {
    title: 'Twig API',
    version,
    license: {
      name: 'Apache-2.0',
    },
  },
};

if (!semver.satisfies(process.version, engines.node)) {
  throw new Error(`Node version '${process.version}' does not satisfy range '${engines.node}'`);
}

const server = new Hapi.Server({
  port: 3000,
  routes: {
    cors: {
      origin: [
        '*://localhost:*',
        'https://*.buildit.tools',
        '*://*.riglet',
        '*://*.kube.local:*',
        'http://twig-ui-redesign-user-testing.s3-website-us-west-2.amazonaws.com',
      ],
      credentials: true,
    },
    payload: {
      maxBytes: 500000000,
    },
  },
});

server.decorate('request', 'buildUrl', request => helpers.buildUrl(request), {
  apply: true,
});

server.ext('onRequest', (req, reply) => {
  console.log('in server.onRequest');
  const protocol = req.headers['x-forwarded-proto'] || req.server.info.protocol;
  console.log('protocol', protocol);
  const host = req.headers['x-forwarded-host'] || req.info.hostname;
  console.log('host', host);
  if (host === 'localhost' || protocol === 'https') {
    console.log('in if block onRequest');
    return reply.continue;
  }
  const myUrl = `https://${host}${req.url.path}`;
  console.log('if block onRequest skipped: returning reply.redirect to:', myUrl);
  return reply.redirect(myUrl).permanent();
});

async function init () {
  try {
    console.log('in server.init try block');
    await server.register([
      cookieAuth,
      Inert,
      Vision,
      {
        plugin: HapiSwagger,
        options,
      },
    ]);
    console.log('in server.init try block, after register');

    server.auth.strategy('session', 'cookie', {
      cookie: {
        password: 'V@qj65#r6t^wvdq,p{ejrZadGHyununZ',
        isSecure: config.SECURE_COOKIES,
      },
    });

    console.log('in server.init try block, after auth.strategy');

    server.auth.default('session');
    console.log('in server.init try block, after auth.default');

    Reflect.ownKeys(v2).forEach(key => server.route(v2[key].routes));
    await server.start();
    console.log('in server.init try block, server.start()');
    logger.log('Server running at:', server.info.uri);
    console.log('in server.init try block, server.info.uri');
  }
  catch (error) {
    console.log('in server.init catch block, error about to happen');
    console.error(error);
    logger.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}

init();
