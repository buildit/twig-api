'use strict';

const Boom = require('boom');
const Joi = require('joi');
const rp = require('request-promise');
const jwt = require('jsonwebtoken');
const { getContextualConfig } = require('../../../config');
const logger = require('../../../log')('AUTH');

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

  const decodedJwt = jwt.decode(token, {
    complete: true
  });

  function findKeyAsCert (keys, jwtKid) {
    return `-----BEGIN CERTIFICATE-----
${keys.keys.filter(key => key.kid === jwtKid)[0].x5c[0]}
-----END CERTIFICATE-----`;
  }

  return rp.get({
    url: oidConfigUrl
  })
    .then(oidConfig => JSON.parse(oidConfig))
    .then(oidConfig => rp.get({
      url: oidConfig.jwks_uri
    }))
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

const validateLocal = (email, password) => {
  if (email !== 'local@user' || password !== 'password') {
    throw new Error('Bad local username/password');
  }

  return {
    id: email,
    name: email
  };
};

const login = (request) => {
  const contextualConfig = getContextualConfig(request);
  const enableTestUser = process.env.ENABLE_TEST_USER;
  try {
    if (contextualConfig.DB_URL.includes('localhost') || enableTestUser === true || enableTestUser === 'true') {
      const user = validateLocal(request.payload.email, request.payload.password);
      request.cookieAuth.set({
        user
      });
      return { user };
    }
    throw new Error('Please login via mothership');
  }
  catch (error) {
    throw Boom.unauthorized(error.message);
  }
};

const validateJwt = async (request) => {
  try {
    const user = await validateMothershipJwt(request.payload.jwt);
    request.cookieAuth.set({
      user
    });
    return {
      user
    };
  }
  catch (error) {
    logger.error(error);
    throw Boom.unauthorized('Authentication failed');
  }
};

const logout = (request, h) => {
  request.cookieAuth.clear();
  return h.response({}).code(204);
};

module.exports.routes = [{
  method: ['POST'],
  path: '/v2/login',
  handler: login,
  options: {
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
  options: {
    auth: false,
    tags: ['api'],
  }
},
{
  method: 'POST',
  path: '/v2/validateJwt',
  handler: validateJwt,
  options: {
    auth: false,
    tags: ['api'],
  }
}
];
