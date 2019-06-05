'use strict';

const Hapi = require('@hapi/hapi');
const cookieAuth = require('@hapi/cookie');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const semver = require('semver');
const {
  version,
  engines,
} = require('../package');
const helpers = require('./server.helpers');
const v2 = require('./api/v2');
const { config } = require('./config');
const logger = require('./log')('SERVER');
require('./db-init');

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
  const protocol = req.headers['x-forwarded-proto'] || req.server.info.protocol;
  const host = req.headers['x-forwarded-host'] || req.info.hostname;
  if (host === 'localhost' || protocol === 'https') {
    return reply.continue;
  }
  return reply
    .redirect(`https://${host}${req.url.path}`)
    .permanent();
});

async function init () {
  try {
    await server.register(
      [
        cookieAuth,
        Inert,
        Vision,
        {
          plugin: HapiSwagger,
          options,
        },
      ],
    );

    server.auth.strategy('session', 'cookie', {
      cookie: {
        password: 'V@qj65#r6t^wvdq,p{ejrZadGHyununZ',
        isSecure: config.SECURE_COOKIES,
      },
    });

    server.auth.default('session');

    Reflect.ownKeys(v2).forEach(key => server.route(v2[key].routes));
    // adding root route for load balance health check
    server.route({
      method: 'GET',
      path: '/',
      handler: (request, h) => h.response().code(204),
    });
    await server.start();
    logger.log('Server running at:', server.info.uri);
  }
  catch (error) {
    console.error(error);
    logger.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}

init();
