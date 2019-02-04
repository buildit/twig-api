'use strict';

const Boom = require('boom');

function wrapTryCatchWithBoomify (logger, handlerFn) {
  return async (request, h) => {
    try {
      const response = await handlerFn(request, h);
      return response;
    }
    catch (error) {
      console.log(error);
      logger.error(error);
      throw Boom.boomify(error, { statusCode: error.status });
    }
  };
}

module.exports = {
  wrapTryCatchWithBoomify,
};
