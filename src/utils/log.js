const winston = require('winston');
const WinstonDailyRotateFile = require('winston-daily-rotate-file');
const { join } = require('path');
const fs = require('fs');
const glob = require('glob');
const config = require('./config');

const LOG_FOLDER = join(__dirname, '../../logs');

winston.loggers.add('all', transportFactory('all.log'));
winston.loggers.add('db', transportFactory('db.log'));
winston.loggers.add('routes', transportFactory('routes.log'));

function transportFactory(fileName) {
  const transports = [];

  if ((/local|testing/i).test(config.getMode())) {
    transports.push(new WinstonDailyRotateFile({
      name: 'file',
      datePattern: '.yyyy-MM-ddTHH',
      filename: join(LOG_FOLDER, fileName),
      maxFileSize: 10485760,
      json: true,
      prettyPrint: true
    }));
  } else {
    // TODO: Production Logs would go here. Decide on whether Logzio, or other.
  }

  transports.push(new (winston.transports.Console)({
    prettyPrint: true,
    colorize: true,
    json: false,
    level: config.getEnv('LOG_LEVEL')
  }) );

  return { transports };
}

const logger = winston.loggers.get('all');

/**
 * Main Log function. By default, it uses the 'all' winston logger defined above. But you can specify your own by
 * defining it like this:
 *
 * winston.loggers.add('images', {
 *  transports: [
 *    new winston.transports.DailyRotateFile({
 *      name: 'file',
 *      datePattern: '.yyyy-MM-ddTHH',
 *      filename: path.join(__dirname, '../logs', 'image-errors.log'),
 *      maxFileSize: 104857600
 *    })
 *  ]
 * });
 *
 * And then instantiating an instance of the logger like so:
 *
 * const Log = require('./log');
 * const winston = require('winston');
 * const imageErrorLogger = winston.loggers.get('images');
 * const logger = Log(NS, imageErrorLogger);
 *
 * And then just doing `logger.log('Hi')`
 *
 * @param {string} ns The module namespace. e.g. API/Server
 * @param {object} log Winston log object
 * @returns {*}
 * @constructor
 */
function Log(ns = 'Logger', log = logger){
  ns = ns + '::';
  return [
    'log', 'error', 'warn', 'info', 'debug'
  ].reduce((type, fn) => {
    if (fn === 'error') {
      type[fn] = err => {
        if (err.message && err.stack) {
          log.error(ns + ' ' + err.message, err.stack);
        } else {
          log.error(ns + ' ' + err);
        }
      }
    }
    else {
      type[fn] = (...messages) => {
        var arr = [ns];
        arr = arr.concat(messages);
        (fn === 'log') ? log.info.apply(null, arr) : log[fn].apply(null, arr);
      };
    }
    return type;
  }, {});
}

/**
 * Cleans up the logs directory
 */
function deleteLogFiles() {
  const files = glob.sync('logs/*log*');
  files.forEach(logFile => fs.unlinkSync(logFile));
}

module.exports = Log;
