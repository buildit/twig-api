const join = require('path').join;
const parse = require('toml').parse;
const compose = require('ramda').compose;
const fs = require('fs');

let config;
let mode;

/**
 * Initialises the config.
 * @param {string} file Path of config.toml file
 * @param {string} defaultMode Name of the default dev mode. Usually you wouldn't pass this in
 */
function init (file, defaultMode = 'local') {
  mode = process.env.MODE || process.env.NODE_ENV || defaultMode;
  const configPath = join(__dirname, file);

  if (fs.existsSync(configPath)) {
    console.log(`Loading config [${mode}] from ${configPath}...`);
    const reader = compose(parse, fs.readFileSync);
    config = reader(configPath)[mode];
  }
  else {
    console.log('config.toml file not found. Environment variables will be used.');
  }
}

/**
 * Gets the provided key for the bootstrapped environment.
 *
 * So the reason the conditional is a bit convoluted is that if you're running locally, you want
 * to get the key specified from the config file as priority uno rather than what's in your
 * environment variable in bash. The reason being that on local dev machines, you could have the
 * same keys in your bash profile as globals that could potentially override the config file ones.
 *
 * @param {string} key The key that you're looking for
 * @returns {string} The value of the key
 */
function getEnv (key) {
  if (mode === 'local') {
    if (config) {
      return config[key];
    }
    if (process.env[key]) {
      return process.env[key];
    }
  }
  else {
    if (process.env[key]) {
      return process.env[key];
    }
    if (config) {
      return config[key];
    }
  }
  return 'local';
}

/**
 * Returns the environment mode
 *
 * Local, Development, Staging, Production
 * @returns {string} mode
 */
function getMode () {
  return mode;
}

init('../../config.toml');

module.exports = {
  init,
  getEnv,
  getMode
};
