'use strict';
const restler = require('restler');
const Boom = require('boom');
const config = require('../../../config');
const logger = require('../../../log')('NODE');

// We need to disable certain js linting rules because the couchdb functions
// we are creating for map and reduce do not work with ES6.
/* eslint-disable func-names */
/* eslint-disable no-var */
/* eslint-disable vars-on-top */
/* eslint-disable no-undef */
/* eslint-disable quote-props */
module.exports.buildMapFunc = () => {
  const mapFunc = function (doc) {
    var value;
    const values = [];
    const data = doc.data;
    const key = doc._id;

    if (key === 'nodes' && data && Array.isArray(data)) {
      for (node in data) {
        if ({}.hasOwnProperty.call(data, node)) {
          value = {
            type: data[node].type,
            name: data[node].name,
            attrs: data[node].attrs
          };

          values.push(value);
        }
      }

      emit(key, values);
    }
  };

  let mapFuncStr = mapFunc.toLocaleString();

  mapFuncStr = mapFuncStr.replace(/[\r\n]/g, '');

  return mapFuncStr;
};

module.exports.buildReduceFunc = () => {
  const reduceFunc = function (key, values) {
    const result = [];
    const valuesEmitted = values[0];

    for (var i = 0; i < valuesEmitted.length; i++) {
      var found = false;
      var foundIndex = 0;

      for (var j = 0; j < result.length; j++) {
        if (result[j].type === valuesEmitted[i].type) {
          found = true;
          foundIndex = j;
          break;
        }
      }

      if (found) {
        result[foundIndex].names = result[foundIndex].names.concat(valuesEmitted[i].name);

        for (attr in valuesEmitted[i].attrs) {
          if (result[foundIndex].attrs.indexOf(valuesEmitted[i].attrs[attr].key) === -1) {
            result[foundIndex].attrs.push(valuesEmitted[i].attrs[attr].key);
          }
        }
      }
      else {
        const attrs = [];

        for (attr in valuesEmitted[i].attrs) {
          if ({}.hasOwnProperty.call(valuesEmitted[i].attrs, attr)) {
            attrs.push(valuesEmitted[i].attrs[attr].key);
          }
        }

        result.push({
          'type': valuesEmitted[i].type,
          'names': [valuesEmitted[i].name],
          'attrs': attrs
        });
      }
    }

    return result;
  };

  let reduceFuncStr = reduceFunc.toLocaleString();

  reduceFuncStr = reduceFuncStr.replace(/[\r\n]/g, '');

  return reduceFuncStr;
};
/* eslint-enable func-names */
/* eslint-enable no-var */
/* eslint-enable vars-on-top */
/* eslint-enable no-undef */
/* eslint-enable quote-props */

module.exports.buildViewJson = (mapFunc, reduceFunc) => {
  const viewJson = {
    views: {
      node_rollup: {
        map: mapFunc,
        reduce: reduceFunc
      }
    }
  };

  return viewJson;
};

module.exports.publishView = (database, viewJson) => {
  const nodesURL = `${config.getTenantDatabaseString(database)}/_design/nodes/`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  return new Promise((resolve, reject) => {
    restler.put(nodesURL, { headers, data: JSON.stringify(viewJson) })
      .on('complete', (data, response) => {
        if (response && response.statusCode !== 201) {
          logger.error(`FAIL: ${response.statusCode} MESSAGE ${response.statusMessage}`);
          const error = Boom.create(response.statusCode,
            `Error publishing nodes rollup view: ${response.statusMessage}`);
          reject(error);
        }

        resolve(data);
      }).on('fail', (data, response) => {
        logger.debug('publishView - FAIL');
        logger.error(`FAIL: ${response.statusCode} - MESSAGE ${response.statusMessage}`);
        const error = Boom.create(response.statusCode,
          `Error publishing nodes rollup view: ${response.statusMessage}`);
        reject(error);
      }).on('error', (data, response) => {
        logger.debug('publishView - ERROR');
        logger.error(`FAIL: ${response.statusCode} - MESSAGE ${response.statusMessage}`);
        const error = Boom.create(response.statusCode,
          `Error publishing nodes rollup view: ${response.statusMessage}`);
        reject(error);
      });
  });
};

module.exports.nodeRollupViewDoesNotExists = (database) => {
  let doesNotExist = true;
  const nodesURL = `${config.getTenantDatabaseString(database)}/_design/nodes/`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  return new Promise((resolve, reject) => {
    restler.get(nodesURL, { headers })
      .on('complete', (data, response) => {
        if (response && response.statusCode === 200) {
          doesNotExist = false;
        }
        else if (response && response.statusCode === 404) {
          doesNotExist = true;
        }
        else {
          logger.error(`FAIL: ${response.statusCode} MESSAGE ${response.statusMessage}`);
          const error = Boom.create(response.statusCode,
            `Error checking if nodes rollup view exists: ${response.statusMessage}`);
          reject(error);
        }

        resolve(doesNotExist);
      });
  });
};

module.exports.nodeRollupViewData = (database) => {
  const nodesURL =
    `${config.getTenantDatabaseString(database)}/_design/nodes/_view/node_rollup?group=true`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  return new Promise((resolve, reject) => {
    restler.get(nodesURL, { headers })
      .on('complete', (data, response) => {
        if (response && response.statusCode === 200) {
          resolve(data);
        }
        else {
          logger.error(`FAIL: ${response.statusCode} MESSAGE ${response.statusMessage}`);
          const error = Boom.create(response.statusCode,
            `Error getting node rollup view data: ${response.statusMessage}`);
          reject(error);
        }
      }).on('error', (data, response) => {
        logger.debug('nodeRollupViewData - ERROR');
        logger.error(`FAIL: ${response.statusCode} - MESSAGE ${response.statusMessage}`);
        const error = Boom.create(response.statusCode,
          `Error getting node rollup view data: ${response.statusMessage}`);
        reject(error);
      });
  });
};

module.exports.nodeRollupView = (request, reply) => {
  const twig = request.params.id;

  return this.nodeRollupViewDoesNotExists(twig)
    .then((viewDoesNotExists) => {
      if (viewDoesNotExists) {
        console.log('here1');
        const mapFunc = this.buildMapFunc();
        console.log('here2');
        const reduceFunc = this.buildReduceFunc();
        console.log('here3');
        const viewJson = this.buildViewJson(mapFunc, reduceFunc);
        console.log('here4');

        return this.publishView(twig, viewJson)
          .then(() => {
            console.log('here5');
            logger.debug('Created node rolled up view.');
            console.log('here6');
          });
      }

      return {};
    })
    .then(() => {
      logger.debug('Fetching view data...');
      console.log('here7');
      return this.nodeRollupViewData(twig)
        .then((data) => {
          console.log('here8');
          logger.debug(`Found view data: ${JSON.stringify(data)}`);
          console.log('here9');
          return reply(data);
        });
    })
    .catch((error) => {
      console.log('here10');
      logger.error(`Error getting node rolled up data: ${JSON.stringify(error)}`);
      console.log('here11');
      return reply(Boom.wrap(error, error.statusCode, error.message));
    })
    .catch((error) => {
      console.log('Are there even more errors?', error);
    });
};

module.exports.routes = {
  method: ['GET'],
  path: '/twiglets/{id}/nodes/rolledup',
  handler: this.nodeRollupView,
  config: {
    auth: false,
    tags: ['api'],
  }
};
