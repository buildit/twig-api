'use strict';

const Hapi = require('hapi');
const cookieAuth = require('hapi-auth-cookie');
const cls = require('continuation-local-storage');
const helpers = require('../../src/server.helpers');

const ns = cls.createNamespace('hapi-request');
const server = new Hapi.Server();

server.connection();

server.decorate('request', 'buildUrl', request =>
  helpers.buildUrl(request),
  { apply: true });

server.ext('onRequest', (req, reply) => {
  ns.bindEmitter(req.raw.req);
  ns.bindEmitter(req.raw.res);
  ns.run(() => {
    ns.set('host', 'foo');
    reply.continue();
  });
});

server.register(cookieAuth, (err) => {
  if (err) {
    throw err;
  }

  server.auth.strategy('session', 'cookie', 'required', {
    password: 'V@qj65#r6t^wvdq,p{ejrZadGHyununZ',
    isSecure: false
  });
});

module.exports = server;
