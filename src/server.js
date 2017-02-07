'use strict';
const Hapi = require('hapi');
const cookieAuth = require('hapi-auth-cookie');
const cls = require('continuation-local-storage');
const logger = require('./log')('SERVER');
const Ping = require('./api/ping');
const Changelog = require('./api/twiglets/changelog');
const Auth = require('./api/auth');
const Node = require('./api/twiglets/node');
const NavSettings = require('./api/twiglets/navsettings');
const Twiglets = require('./api/twiglets');
const Views = require('./api/twiglets/views');
const Model = require('./api/twiglets/model');
const Models = require('./api/models');
const ModelsChangelog = require('./api/models/changelog');
const Inert = require('inert');
const Vision = require('vision');
const HapiSwagger = require('hapi-swagger');
const version = require('../package').version;
const helpers = require('./server.helpers');

const options = {
  info: {
    title: 'Twig API',
    version,
    license: {
      name: 'Apache-2.0'
    }
  }
};

const ns = cls.createNamespace('hapi-request');

const server = new Hapi.Server();

server.connection({
  port: 3000,
  routes: {
    cors: {
      origin: [
        'http://localhost:*',
        'https://localhost:*',
        'http://*.riglet',
        'https://*.riglet',
        'http://*.kube.local:*',
        'https://*.kube.local:*'
      ],
      credentials: true,
    }
  }
});

server.decorate('request', 'buildUrl', (request) =>
  helpers.buildUrl(request),
  { apply: true });


server.ext('onRequest', (req, reply) => {
  ns.bindEmitter(req.raw.req);
  ns.bindEmitter(req.raw.res);
  ns.run(() => {
    ns.set('host', req.headers.host);
    reply.continue();
  });
});

server.register([cookieAuth, Inert, Vision,
  {
    register: HapiSwagger,
    options
  }],
  (err) => {
    if (err) {
      throw err;
    }

    server.auth.strategy('session', 'cookie', 'required', {
      password: 'V@qj65#r6t^wvdq,p{ejrZadGHyununZ',
      isSecure: false
    });
  });

server.route(Ping.routes);
server.route(Twiglets.routes);
server.route(Changelog.routes);
server.route(Auth.routes);
server.route(Node.routes);
server.route(NavSettings.routes);
server.route(Views.routes);
server.route(Models.routes);
server.route(ModelsChangelog.routes);
server.route(Model.routes);

server.start(err => {
  if (err) {
    throw err;
  }
  logger.log('Server running at:', server.info.uri);
});
