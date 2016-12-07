const Hapi = require('hapi');
const cookieAuth = require('hapi-auth-cookie');
const cls = require('continuation-local-storage');
const logger = require('./log')('SERVER');
const Ping = require('./api/ping');
const Changelog = require('./api/twiglets/changelog');
const Auth = require('./api/auth');
const Node = require('./api/twiglets/node');
const NavSettings = require('./api/twiglets/navsettings');

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
      ],
      credentials: true,
    }
  }
});

server.ext('onRequest', (req, reply) => {
  ns.bindEmitter(req.raw.req);
  ns.bindEmitter(req.raw.res);
  ns.run(() => {
    ns.set('host', req.headers.host);
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

server.route(Ping.routes);
server.route(Changelog.routes);
server.route(Auth.routes);
server.route(Node.routes);
server.route(NavSettings.routes);

server.start(err => {
  if (err) {
    throw err;
  }
  logger.log('Server running at:', server.info.uri);
});
