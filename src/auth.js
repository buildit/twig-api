const config = require('./utils/config');
const ldap = require('ldapjs');
const Boom = require('boom');
const logger = require('./utils/log')('SERVER');

const validate = (username, password) => {
  const client = ldap.createClient({
    url: config.getEnv('LDAP_URL'),
    timeout: 5000,
    connectTimeout: 10000
  });
  return new Promise((resolve, reject) =>
    client.bind(username, password, (err) => {
      const status = (err ? err.message : false) || 'OK';
      client.unbind();
      if (status !== 'OK') {
        logger.log(status);
        return reject();
      }

      return resolve({
        id: username,
        name: username
      });
    }));
};

exports.login = (request, reply) =>
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

exports.logout = (request, reply) => {
  request.cookieAuth.clear();
  return reply({
    statusCode: 200,
    message: 'Logged Out'
  });
};
