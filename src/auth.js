const config = require('./utils/config');
const ldap = require('ldapjs');
const Boom = require('boom');
const logger = require('./utils/log')('SERVER');

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

exports.login = (request, reply) =>
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

exports.logout = (request, reply) => {
  request.cookieAuth.clear();
  return reply({
    statusCode: 200,
    message: 'Logged Out'
  });
};
