'use strict';

const Boom = require('boom');
const toJSON = require('utils-error-to-json');

function wrapTryCatchWithBoomify (logger, handlerFn) {
  return async (request, h) => {
    try {
      const response = await handlerFn(request, h);
      return response;
    }
    catch (error) {
      console.error(error);
      logger.error(toJSON(error));
      throw Boom.boomify(error, { statusCode: error.status });
    }
  };
}

module.exports = {
  wrapTryCatchWithBoomify,
};
