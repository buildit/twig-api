'use strict';
const PouchDB = require('pouchdb');
const config = require('../../../config');

class CouchDbConnection {
  /**
   * Creates an instance of CouchDbConnection.
   * @param {any} dbName the name of the database to connect to.
   * @param {boolean} [createIfNotExists=true] this will create the DB if it doesn't already exist
   *
   * @memberof CouchDbConnection
   */
  constructor (dbName, createIfNotExists = true) {
    this.db =
      new PouchDB(config.getTenantDatabaseString(dbName), { skip_setup: !createIfNotExists });
  }

  /**
   * Gets the specific document, if no id is specified, it gets all of them.
   *
   * @param {any} id
   * @returns promise containing document.
   *
   * @memberof CouchDbConnection
   */
  get (ids) {
    if (ids) {
      if (Array.isArray(ids)) {
        return this.db.allDocs({
          include_docs: true,
          keys: ids,
        });
      }
      return this.db.get(ids);
    }
    return this.db.allDocs({ include_docs: true });
  }

  /**
   * Posts data to the database, does not provide an id.
   *
   * @param {any} payload the data to be posted.
   *
   * @memberof CouchDbConnection
   */
  post (payload) {
    return this.db.post(payload);
  }

  /**
   * Puts data to the databse, use already provided id.
   *
   * @param {any} payload the data to be put, single doc or array of docs.
   * @returns
   *
   * @memberof CouchDbConnection
   */
  put (payload) {
    if (Array.isArray(payload)) {
      return this.db.bulkDocs(payload);
    }
    return this.db.put(payload);
  }

  /**
   * Removes data from the database.
   *
   * @param {any} { _id, _rev }
   * @returns
   *
   * @memberof CouchDbConnection
   */
  remove ({ _id, _rev }) {
    return this.db.remove(_id, _rev);
  }

  /**
   * Removes the entire database.
   *
   *
   * @memberof CouchDbConnection
   */
  destroy () {
    return this.db.destroy();
  }
}

module.exports = CouchDbConnection;
