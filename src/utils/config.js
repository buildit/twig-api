// Going to try 12factor style config a try instead...get all from environment
// https://12factor.net/config
const ramda = require('ramda');
const cls = require('continuation-local-storage');

const config = {
  _secrets: {
    _db_url: process.env.TWIG_API_DB_URL,
  },
  LDAP_URL: process.env.TWIG_API_LDAP_URL,
  LOG_CONSOLE: process.env.TWIG_API_LOG_CONSOLE === 'true',
  LOG_FILE: process.env.TWIG_API_LOG_FILE === 'true',
  LOG_LEVEL: process.env.TWIG_API_LOG_LEVEL,
  get DB_URL () {
    if (this._secrets._db_url) {
      return this._secrets._db_url;
    }
    return `http://${cls.getNamespace('hapi-request').get('host')
      .replace('twig.staging', 'couchdb').replace('twig', 'couchdb')
      .split(':', 1)[0]}:5984`;
  },
};

function clearEnvVars () {
  ramda.keys(config).forEach((key) => {
    process.env[key] = '';
  });
}

clearEnvVars();

module.exports = config;
