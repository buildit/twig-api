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
      console.log("here1");
      const response = await handlerFn(request, h);
      console.log("here2");
      return response;
    }
    catch (error) {
      console.log('ERROR ERROR ERROR', error);
      if (!isConflictOrNotFound(error)) {
        logger.error(error);
        console.log("in isnotconflictornotfound");
      }
      //console.log("error.status", error.status);
      //throw Boom.boomify(error, { statusCode: error.status });
      //console.log('boom:', something);
      throw Boom.boomify(new Error(error.message), { statusCode: error.status });
    }
  };
}

module.exports = {
  wrapTryCatchWithBoomify,
};
