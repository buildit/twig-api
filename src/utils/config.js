// Going to try 12factor style config a try instead...get all from environment
// https://12factor.net/config
const ramda = require('ramda');

const config = {
  _secrets: ['_secrets'],
  LDAP_URL: process.env.TWIG_API_LDAP_URL,
  LOG_CONSOLE: process.env.TWIG_API_LOG_CONSOLE === 'true',
  LOG_FILE: process.env.TWIG_API_LOG_FILE === 'true',
  LOG_LEVEL: process.env.TWIG_API_LOG_LEVEL,
};

function clearEnvVars () {
  ramda.keys(config).forEach((key) => {
    process.env[key] = '';
  });
}

clearEnvVars();

module.exports = config;
