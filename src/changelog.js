const PouchDb = require('pouchdb');
const config = require('./utils/config');
const Boom = require('boom');

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
    .catch((error) => reply(Boom.wrap(error, error.status, error.message)));
};
