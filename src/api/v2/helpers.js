'use strict';

const Boom = require('@hapi/boom');
const HttpStatus = require('http-status-codes');


function isConflictOrNotFound (error) {
  const code = error.status || (error.output || {}).statusCode;
  return code === HttpStatus.CONFLICT || code === HttpStatus.NOT_FOUND;
}

function wrapTryCatchWithBoomify (logger, handlerFn) {

  return async (request, h) => {
    try {
      // console.log('wat', handlerFn);
      const response = await handlerFn(request, h);
      return response;
    }
    catch (error) {
      console.log('ERROR ERROR ERROR', JSON.stringify(error));
      if (!isConflictOrNotFound(error)) {
        console.log('wrapTryCatchWithBoomify, catch before logger.error');
        logger.error(error);
      }
      console.log('wrapTryCatchWithBoomify, catch before throw boom');
      // throw error;
      throw Boom.boomify(error, { statusCode: error.status });
    }
  };
}

module.exports = {
  wrapTryCatchWithBoomify,
};
