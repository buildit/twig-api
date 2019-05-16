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
    // TODO: this is getting more and more complicated, we need to make sure that what we are doing
    // is proper not just making tests pass.
    catch (error) {
      console.log('ERROR ERROR ERROR', error);
      if (!isConflictOrNotFound(error)) {
        console.log('wrapTryCatchWithBoomify, catch before logger.error');
        logger.error(error);
      }
      console.log('wrapTryCatchWithBoomify, catch before throw boom', new Error(error));
      const newError = error instanceof Error ? error : new Error(error.message);
      const myErr = Boom.boomify(newError, { statusCode: error.status, decorate: error.data });
      console.log('myErr', myErr);
      // TODO: BLASPHEMY, why do I have to do this?
      myErr.output.payload.data = error.data;
      console.log('myErr2', myErr);
      throw myErr;
    }
  };
}

module.exports = {
  wrapTryCatchWithBoomify,
};
