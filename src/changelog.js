const PouchDb = require('pouchdb');
const config = require('./utils/config');
const Boom = require('boom');
const logger = require('./utils/log')('SERVER');

module.exports.get = (request, reply) => {
  const db = new PouchDb(`${config.DB_URL}/${request.params.id}`, { skip_setup: true });
  return db.info()
    .then(() => db.get('changelog')
      .then((doc) => reply({ changelog: doc.data }))
      .catch((error) => {
        if (error.status !== 404) {
          throw error;
        }
        return reply({ changelog: [] });
      }))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.wrap(error, error.status, error.message));
    });
};

module.exports.add = (request, reply) => {
  const db = new PouchDb(`${config.DB_URL}/${request.params.id}`, { skip_setup: true });
  return db.info()
    .then(() => db.get('changelog')
      .catch((error) => {
        if (error.status !== 404) {
          throw error;
        }
        return { _id: 'changelog', data: [] };
      }))
    .then((doc) => {
      const commit = {
        message: request.payload.commitMessage,
        user: request.auth.credentials.user.name,
        timestamp: new Date().toISOString(),
      };
      doc.data.unshift(commit);
      return db.put(doc);
    })
    .then(() => reply({}).code(204))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.wrap(error, error.status, error.message));
    });
};
