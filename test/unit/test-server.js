'use strict';

const Hapi = require('@hapi/hapi');
const cookieAuth = require('@hapi/cookie');
const helpers = require('../../src/server.helpers');

async function init (routes) {
  const server = new Hapi.Server();

  server.decorate('request', 'buildUrl', request => helpers.buildUrl(request), { apply: true });

  await server.register([cookieAuth]);

  server.auth.strategy('session', 'cookie', {
    cookie: {
      password: 'V@qj65#r6t^wvdq,p{ejrZadGHyununZ',
      isSecure: false
    }
  });

  server.auth.default('session');

  server.route(routes);

  await server.start();

  return server;
}

module.exports = init;
