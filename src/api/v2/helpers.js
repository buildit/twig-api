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
      const response = await handlerFn(request, h);
      return response;
    }
    // TODO: this is getting more and more complicated, we need to make sure that what we are doing
    // is proper not just making tests pass.
    catch (error) {
      if (!isConflictOrNotFound(error)) {
        logger.error(error);
      }
      const newError = error instanceof Error ? error : new Error(error.message);
      const myErr = Boom.boomify(newError, { statusCode: error.status, decorate: error.data });
      // TODO: BLASPHEMY, why do I have to do this?
      myErr.output.payload.data = error.data;
      throw myErr;
    }
  };
}

module.exports = {
  wrapTryCatchWithBoomify,
};
