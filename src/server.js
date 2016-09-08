const Hapi = require('hapi');
const cookieAuth = require('hapi-auth-cookie');
const dynogels = require('dynogels');
const logger = require('./utils/log')('SERVER');
const config = require('./utils/config');
const ldap = require('ldapjs');
const Joi = require('joi');

const server = new Hapi.Server();

server.connection({
  port: config.getEnv('SERVER_PORT')
});

const validate = (request, username, password, callback) => {
  const opts = {
    url: 'ldap://corp.riglet.io',
    timeout: 5000,
    connectTimeout: 10000
  };
  const client = ldap.createClient(opts);
  return client.bind(username, password, (err) => {
    const status = (err ? err.message : false) || 'OK';
    client.unbind();
    if (status !== 'OK') {
      return callback(null, false);
    }
    return callback(err, true, {
      id: username,
      name: username
    });
  });
};

const home = (request, reply) => {
  reply(`<html><head><title>Login page</title></head><body><h3>Welcome
      ${request.auth.credentials.name}
      !</h3><br/><form method="get" action="/logout">
      <input type="submit" value="Logout">
      </form></body></html>`);
};

const loginGet = (request, reply) => {
  if (request.auth.isAuthenticated) {
    return reply.redirect('/');
  }

  return reply(`<html><head><title>Login page</title></head><body>
      <form method="post" action="/login">
      Username: <input type="text" name="username"><br>
      Password: <input type="password" name="password"><br/>
      <input type="submit" value="Login"></form></body></html>`);
};

const loginPost = (request, reply) => {
  if (request.auth.isAuthenticated) {
    return reply.redirect('/');
  }

  return validate(request, request.payload.username, request.payload.password, (err, success, user) => {
    if (err) throw err;
    if (!success) {
      return reply.redirect('/login');
    }

    request.cookieAuth.set(user);
    return reply.redirect('/');
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
};

const logout = (request, reply) => {
  request.cookieAuth.clear();
  return reply.redirect('/');
};

server.register(cookieAuth, (err) => {
  if (err) {
    throw err;
  }

  // const cache = server.cache({ segment: 'sessions', expiresIn: 3 * 24 * 60 * 60 * 1000 });
  // server.app.cache = cache;

  server.auth.strategy('session', 'cookie', true, {
    password: 'password-should-be-32-characters',
    redirectTo: '/login',
    isSecure: false,
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
    handler: home
  },
  {
    method: ['GET'],
    path: '/login',
    handler: loginGet,
    config: {
      auth: {
        mode: 'try',
        strategy: 'session'
      },
      plugins: { 'hapi-auth-cookie': { redirectTo: false } }
    }
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
      validate: {
        payload: {
          username: Joi.string().email().required(),
          password: Joi.string().required()
        }
      },
      plugins: { 'hapi-auth-cookie': { redirectTo: false } }
    }
  },
  { method: 'GET', path: '/logout', handler: logout }
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
