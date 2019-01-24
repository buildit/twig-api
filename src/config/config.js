'use strict';

// Going to try 12factor style config a try instead... get all from environment
// https://12factor.net/config
const ramda = require('ramda');

function getDbUrl (hostname) {
  if (process.env.TWIG_API_DB_URL) {
    return process.env.TWIG_API_DB_URL;
  }
  if (hostname.startsWith('localhost')) {
    return 'http://localhost:5984';
  }
  return 'http://couchdb.riglet:5984';
}

function getTenant (hostname) {
  if (process.env.TWIG_API_TENANT || process.env.TWIG_API_TENANT === '') {
    return process.env.TWIG_API_TENANT;
  }
  if (hostname.includes('.twig-api')) {
    return hostname.split('.twig-api', 1)[0];
  }
  if (hostname.includes('-twig-api')) {
    return hostname.split('-twig-api', 1)[0];
  }
  return '';
}

function getContextualConfig (request) {
  const { host } = request.info;
  const DB_URL = getDbUrl(host);

  const TENANT = getTenant(host);

  return {
    DB_URL,
    TENANT,
    getTenantDatabaseString (dbName) {
      return TENANT
        ? `${DB_URL}/${TENANT}_${dbName}`
        : `${DB_URL}/${dbName}`;
    },
  };
}

const config = {
  LOG_CONSOLE: process.env.TWIG_API_LOG_CONSOLE === 'true',
  LOG_FILE: process.env.TWIG_API_LOG_FILE === 'true',
  LOG_LEVEL: process.env.TWIG_API_LOG_LEVEL,
  SECURE_COOKIES: process.env.NODE_ENV === 'production',
};

function clearEnvVars () {
  ramda.keys(config).forEach((key) => {
    process.env[`TWIG_API_${key}`] = '';
  });
}

clearEnvVars();

module.exports = { config, getContextualConfig };
