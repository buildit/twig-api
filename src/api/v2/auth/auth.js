'use strict';

const ldap = require('ldapjs');
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

const validate = (email, password) => {
  const client = ldap.createClient({
    url: config.LDAP_URL,
    timeout: 5000,
    connectTimeout: 10000
  });
  return new Promise((resolve, reject) =>
    client.bind(email, password, (err) => {
      const status = (err ? err.message : false) || 'OK';
      client.unbind();
      if (status !== 'OK') {
        logger.log(status);
        return reject();
      }

      return resolve({
        id: email,
        name: email
      });
    }));
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

const validateHeimdall = (email, password) =>
  rp({
    method: 'POST',
    url: 'http://staging.heimdall.riglet/auth/local',
    form: {
      username: email,
      password,
    },
  })
  .then(user => JSON.parse(user))
  .then(user =>
    ({
      id: user.emails[0].value,
      name: `${user.name.familyName}, ${user.name.givenName}`
    })
  );

const validateLocal = (email, password) =>
  new Promise((resolve, reject) => {
    if (password !== 'password') {
      return reject();
    }

    return resolve({
      id: email,
      name: email
    });
  });

const login = (request, reply) =>
  Promise.resolve()
  .then(() => {
    if (request.payload.email === 'testuser@test.com') {
      return validateHeimdall(request.payload.email, request.payload.password);
    }
    if (request.payload.email === 'local@user' && config.DB_URL.includes('localhost')) {
      return validateLocal(request.payload.email, request.payload.password);
    }
    return validate(request.payload.email, request.payload.password);
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
  .catch(() => reply(Boom.unauthorized('Invalid email/password')));

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
