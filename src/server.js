const Hapi = require('hapi');
const cookieAuth = require('hapi-auth-cookie');
const logger = require('./utils/log')('SERVER');
const Joi = require('joi');
const Auth = require('./auth');
const Ping = require('./ping');
const Node = require('./node');

const server = new Hapi.Server();

server.connection({
  port: 3000,
  routes: {
    cors: true
  }
});

server.register(cookieAuth, (err) => {
  if (err) {
    throw err;
  }

  // const cache = server.cache({ segment: 'sessions', expiresIn: 3 * 24 * 60 * 60 * 1000 });
  // server.app.cache = cache;

  server.auth.strategy('session', 'cookie', false, {
    password: 'V@qj65#r6t^wvdq,p{ejrZadGHyununZ',
    isSecure: false
    // validate cookie is still in cache and/or user still exists/valid
    // validateFunc: (request, session, callback) => {
    //   cache.get(session.sid, (error, cached) => {
    //     if (error) {
    //       return callback(err, false);
    //     }

    //     if (!cached) {
    //       return callback(null, false);
    //     }

    //     return callback(null, true, cached.account);
    //   });
    // }
  });
});

server.route([
  {
    method: ['GET'], path: '/ping', handler: Ping.ping
  },
  {
    method: 'POST', path: '/nodes', handler: Node.nodeRollupView
  },
  {
    method: ['POST'],
    path: '/login',
    handler: Auth.login,
    config: {
      auth: {
        mode: 'try',
        strategy: 'session'
      },
      validate: {
        payload: {
          email: Joi.string().email().required(),
          password: Joi.string().required()
        }
      },
    }
  },
  {
    method: 'POST',
    path: '/logout',
    handler: Auth.logout
  }
]);

server.start(err => {
  if (err) {
    throw err;
  }
  logger.log('Server running at:', server.info.uri);
});
