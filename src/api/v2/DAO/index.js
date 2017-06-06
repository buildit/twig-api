'use strict';
const config = require('../../../config');
const CouchDB = require('./couchdb');
const DynamoDB = require('./dynamodb');

function getDB () {
  switch (config._secrets._database_type) {
    case 'dynamodb': return DynamoDB;
    default: return CouchDB;
  }
}

module.exports = getDB();
