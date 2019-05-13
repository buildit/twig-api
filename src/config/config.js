'use strict';

// Going to try 12factor style config a try instead... get all from environment
// https://12factor.net/config
const ramda = require('ramda');

function getDbUrl () {
  // TODO: JB051319 This code change is probably OK
  // NODE_ENV set to production in docker-compose.yml.template
  // we should probably double check before we're done
  if (process.env.NODE_ENV === 'production') {
    if (process.env.TWIG_API_DB_URL) {
      return process.env.TWIG_API_DB_URL;
    }
    return 'http://localhost:5984';
  }
  console.log('process.env.NODE_ENV: ', process.env.NODE_ENV);
  return 'foo';
}

function getTenant (hostname) {
  console.log('are we in getTenant?', process.env.TWIG_API_TENANT);
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

const config = {
  // TODO: JB051319
  // At least one of LOG_CONSOLE and LOG_FILE must be set to true
  // or we get a winston error about no defined transports
  // LOG_CONSOLE: process.env.TWIG_API_LOG_CONSOLE === 'true',
  // LOG_FILE: process.env.TWIG_API_LOG_FILE === 'true',
  LOG_CONSOLE: true,
  LOG_FILE: true,
  LOG_LEVEL: process.env.TWIG_API_LOG_LEVEL,
  SECURE_COOKIES: process.env.NODE_ENV === 'production',
  DB_URL: getDbUrl(),
};

function getContextualConfig (request) {
  console.log('request?', request)
  const { host } = request.info;
  console.log('host?', host);
  const TENANT = getTenant(host);
  console.log('TENANT', TENANT);
  return {
    TENANT,
    getTenantDatabaseString (dbName) {
      return TENANT
        ? `${config.DB_URL}/${TENANT}_${dbName}`
        : `${config.DB_URL}/${dbName}`;
    },
  };
}

function clearEnvVars () {
  ramda.keys(config).forEach((key) => {
    process.env[`TWIG_API_${key}`] = '';
  });
}

clearEnvVars();

module.exports = { config, getContextualConfig };
