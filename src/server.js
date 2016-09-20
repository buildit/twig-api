const Hapi = require('hapi');
const cookieAuth = require('hapi-auth-cookie');
const dynogels = require('dynogels');
const logger = require('./utils/log')('SERVER');
const config = require('./utils/config');
const Joi = require('joi');
const Auth = require('./auth');

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
