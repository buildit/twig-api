const config = require('./utils/config');
const logger = require('./utils/log')('SERVER');
const restler = require('restler');

// We need to disable certain js linting rules because the couchdb functions
// we are creating for map and reduce do not work with ES6.
/* eslint-disable func-names */
/* eslint-disable no-var */
/* eslint-disable vars-on-top */
/* eslint-disable no-undef */
/* eslint-disable quote-props */
exports.buildMapFunc = () => {
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

exports.buildReduceFunc = () => {
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

exports.buildViewJson = (mapFunc, reduceFunc) => {
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

exports.publishView = (host, database, viewJson) => {
  const nodesURL = `${host}/${database}/_design/nodes/`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  return new Promise((resolve, reject) => {
    restler.put(nodesURL, { headers, data: JSON.stringify(viewJson) })
      .on('complete', (data, response) => {
        if (response && response.statusCode !== 201) {
          logger.error(`FAIL: ${response.statusCode} MESSAGE ${response.statusMessage}`);
          reject({
            error: {
              statusCode: response.statusCode,
              message: `Error creating nodes rollup view: ${response.statusMessage}`
            }
          });
        }

        resolve(data);
      }).on('fail', (data, response) => {
        logger.debug('publishView - FAIL');
        logger.error(`FAIL: ${response.statusCode} - MESSAGE ${response.statusMessage}`);
        reject({
          error: {
            statusCode: response.statusCode,
            message: `Error creating nodes rollup view: ${response.statusMessage}`
          }
        });
      }).on('error', (data, response) => {
        logger.debug('getTimeEntries - ERROR');
        logger.error(`FAIL: ${response.statusCode} - MESSAGE ${response.statusMessage}`);
        reject({
          error: {
            statusCode: response.statusCode,
            message: `Error creating nodes rollup view: ${response.statusMessage}`
          }
        });
      });
  });
};

exports.nodeRollupView = (request, reply) => {
  const twigDb = request.payload.twigDb;
  const couchdbHost = config.COUCHDB_URL;
  const mapFunc = this.buildMapFunc();
  const reduceFunc = this.buildReduceFunc();
  const viewJson = this.buildViewJson(mapFunc, reduceFunc);

  return this.publishView(couchdbHost, twigDb, viewJson)
    .then((data) => {
      console.log(`Publish View Data: ${JSON.stringify(data)}`);
      return reply({
        statusCode: 201,
        message: 'Nodes Rollup View Created'
      });
    })
    .catch((error) =>
      reply({
        statusCode: error.error.statusCode,
        message: error.error.message
      })
    );
};
