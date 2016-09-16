const Hapi = require('hapi');
const cookieAuth = require('hapi-auth-cookie');
const dynogels = require('dynogels');
const logger = require('./utils/log')('SERVER');
const config = require('./utils/config');
const ldap = require('ldapjs');
const Joi = require('joi');
const Boom = require('boom');

const server = new Hapi.Server();

server.connection({
  port: 3000
});

const validate = (request, username, password, callback) => {
  const opts = {
    url: config.getEnv('LDAP_URL'),
    timeout: 5000,
    connectTimeout: 10000
  };
  const client = ldap.createClient(opts);
  return client.bind(username, password, (err) => {
    const status = (err ? err.message : false) || 'OK';
    client.unbind();
    if (status !== 'OK') {
      logger.log(status);
      return callback(null, false);
    }
    return callback(err, true, {
      id: username,
      name: username
    });
  });
};

const home = (request, reply) => {
  reply({
    statusCode: 200,
    message: `Hello ${request.auth.isAuthenticated ? request.auth.credentials.name : 'World'}`
  });
};

const loginPost = (request, reply) =>
  validate(request, request.payload.email, request.payload.password,
    (err, success, user) => {
      if (err) throw err;
      if (!success) {
        return reply(Boom.unauthorized('Invalid email/password'));
      }

      request.cookieAuth.set(user);
      return reply({
        user
      });
      // put user in cache w/ a session id as key..put session id in cookie
      // const sid = String(++this.uuid);
      // request.server.app.cache.set(sid, { user }, 0, (error) => {
      //   if (error) {
      //     reply(error);
      //   }

      //   request.cookieAuth.set({ sid });
      //   return reply.redirect('/');
      // });
    });

const logout = (request, reply) => {
  request.cookieAuth.clear();
  return reply({
    statusCode: 200,
    message: 'Logged Out'
  });
};

const loginGet = (request, reply) => {
  if (request.auth.isAuthenticated) {
    return reply.redirect('/');
  }

  return reply(`<html><head><title>Login page</title></head><body>
      <form method="post" action="/login">
      Email: <input type="text" name="email"><br>
      Password: <input type="password" name="password"><br/>
      <input type="submit" value="Login"></form></body></html>`);
};

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
    method: 'GET',
    path: '/',
    config: {
      auth: {
        mode: 'try',
        strategy: 'session'
      },
    },
    handler: home
  },
  {
    method: 'GET',
    path: '/login',
    handler: loginGet
  },
  {
    method: ['POST'],
    path: '/login',
    handler: loginPost,
    config: {
      auth: {
        mode: 'try',
        strategy: 'session'
      },
      cors: true,
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
    config: {
      cors: true,
    },
    handler: logout
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
