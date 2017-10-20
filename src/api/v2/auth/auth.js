'use strict';

const Boom = require('boom');
const Joi = require('joi');
const config = require('../../../config');
const logger = require('../../../log')('AUTH');
const rp = require('request-promise');
const jwt = require('jsonwebtoken');

const oldVerify = jwt.verify;

jwt.verify = (token, cert, callback) => {
  if (callback) {
    return oldVerify(token, cert, callback);
  }
  return new Promise((resolve, reject) => {
    oldVerify(token, cert, (err, verified) => {
      if (err) {
        return reject(err);
      }
      return resolve(verified);
    });
  });
};

const validateMothershipJwt = (token) => {
  const oidConfigUrl = 'https://login.microsoftonline.com/258ac4e4-146a-411e-9dc8-79a9e12fd6da/.well-known/openid-configuration';

  const decodedJwt = jwt.decode(token, { complete: true });

  function findKeyAsCert (keys, jwtKid) {
    return `-----BEGIN CERTIFICATE-----
${keys.keys.filter(key => key.kid === jwtKid)[0].x5c[0]}
-----END CERTIFICATE-----`;
  }

  return rp.get({ url: oidConfigUrl })
    .then(oidConfig => JSON.parse(oidConfig))
    .then(oidConfig => rp.get({ url: oidConfig.jwks_uri }))
    .then(keys => JSON.parse(keys))
    .then((keys) => {
      const cert = findKeyAsCert(keys, decodedJwt.header.kid);
      return jwt.verify(token, cert);
    })
    .then(verified => ({
      id: verified.upn,
      name: verified.name
    }));
};

const validateLocal = (email, password) =>
  new Promise((resolve, reject) => {
    if (email !== 'local@user' || password !== 'password') {
      return reject('Bad local username/password');
    }

    return resolve({
      id: email,
      name: email
    });
  });

const login = (request, reply) =>
  Promise.resolve()
    .then(() => {
      if (config.DB_URL.includes('localhost') || process.env.ENABLE_TEST_USER === true || process.env.ENABLE_TEST_USER === 'true') {
        return validateLocal(request.payload.email, request.payload.password);
      }
      throw new Error(`Please login via mothership: ${JSON.stringify(process.env)}`);
    })
    .then((user) => {
    // put user in cache w/ a session id as key..put session id in cookie
    // const sid = String(++this.uuid);
    // request.server.app.cache.set(sid, { user }, 0, (error) => {
    //   if (error) {
    //     reply(error);
    //   }

    //   request.cookieAuth.set({ sid });
    //   return reply.redirect('/');
    // });
      request.cookieAuth.set({ user });
      return reply({
        user
      });
    })
    .catch((error) => {
      logger.log(error);
      reply(Boom.unauthorized(error.message));
    });

const validateJwt = (request, reply) => {
  validateMothershipJwt(request.payload.jwt)
    .then((user) => {
      request.cookieAuth.set({ user });
      return reply({
        user
      });
    })
    .catch((err) => {
      console.log(err);
      reply(Boom.unauthorized('Authentication failed'));
    });
};

const logout = (request, reply) => {
  request.cookieAuth.clear();
  return reply({}).code(204);
};

module.exports.routes = [{
  method: ['POST'],
  path: '/v2/login',
  handler: login,
  config: {
    auth: {
      mode: 'try',
      strategy: 'session'
    },
    validate: {
      payload: Joi.object({
        email: Joi.string().email().required().trim(),
        password: Joi.string().required().trim()
      })
    },
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        payloadType: 'form'
      }
    }
  },
},
{
  method: 'POST',
  path: '/v2/logout',
  handler: logout,
  config: {
    auth: false,
    tags: ['api'],
  }
},
{
  method: 'POST',
  path: '/v2/validateJwt',
  handler: validateJwt,
  config: {
    auth: false,
    tags: ['api'],
  }
}];
