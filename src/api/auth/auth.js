'use strict';
const ldap = require('ldapjs');
const Boom = require('boom');
const Joi = require('joi');
const config = require('../../config');
const logger = require('../../log')('AUTH');

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

const login = (request, reply) =>
  validate(request.payload.email, request.payload.password)
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

const logout = (request, reply) => {
  request.cookieAuth.clear();
  return reply({}).code(204);
};

module.exports.routes = [{
  method: ['POST'],
  path: '/login',
  handler: login,
  config: {
    auth: {
      mode: 'try',
      strategy: 'session'
    },
    validate: {
      payload: {
        email: Joi.string().email().required().trim(),
        password: Joi.string().required().trim()
      }
    },
    tags: ['api'],
  }
},
{
  method: 'POST',
  path: '/logout',
  handler: logout,
  config: {
    auth: false,
    tags: ['api'],
  }
}];
