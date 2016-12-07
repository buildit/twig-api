// Going to try 12factor style config a try instead...get all from environment
// https://12factor.net/config
const ramda = require('ramda');
const cls = require('continuation-local-storage');

const config = {
  _secrets: {
    _db_url: process.env.TWIG_API_DB_URL,
    _tenant: process.env.TWIG_API_TENANT,
  },
  LDAP_URL: process.env.TWIG_API_LDAP_URL,
  LOG_CONSOLE: process.env.TWIG_API_LOG_CONSOLE === 'true',
  LOG_FILE: process.env.TWIG_API_LOG_FILE === 'true',
  LOG_LEVEL: process.env.TWIG_API_LOG_LEVEL,
  get DB_URL () {
    if (this._secrets._db_url) {
      return this._secrets._db_url;
    }
    const hostname = cls.getNamespace('hapi-request').get('host');
    const splitHostname = hostname.split('twig', 2);
    if (splitHostname[0].startsWith('localhost')) {
      return 'http://localhost:5984';
    }
    const twigDomain = splitHostname.length < 2 ? '' : splitHostname[1];
    return `http://couchdb${twigDomain.split(':', 1)[0]}:5984`;
  },
  set DB_URL (value) {
    this._secrets._db_url = value;
  },
  get TENANT () {
    if (this._secrets._tenant || this._secrets._tenant === '') {
      return this._secrets._tenant;
    }
    const hostname = cls.getNamespace('hapi-request').get('host');
    if (hostname === 'localhost') {
      return '';
    }
    if (hostname.startsWith('twig') || !hostname.includes('.twig')) {
      return '';
    }

    return hostname.split('.twig', 1)[0];
  },
  set TENANT (value) {
    this._secrets._tenant = value;
  },
  getTenantDatabaseString (dbName) {
    return this.TENANT
      ? `${this.DB_URL}/${this.TENANT}_${dbName}`
      : `${this.DB_URL}/${dbName}`;
  }
};

function clearEnvVars () {
  ramda.keys(config).forEach((key) => {
    process.env[key] = '';
  });
}

clearEnvVars();

module.exports = config;
