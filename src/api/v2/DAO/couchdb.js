'use strict';
const Models = require('./models/couchdb');

class CouchDB {
  constructor () {
    this.models = new Models();
  }
}

module.exports = CouchDB;
