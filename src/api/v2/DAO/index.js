'use strict';
const config = require('../../../config');
const CouchDB = require('./couchdb');

function getDao () {
  switch (config._secrets._db_type) {
    default: return new CouchDB();
  }
}

module.exports = getDao();
