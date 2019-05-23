'use strict';

const Boom = require('@hapi/boom');
const HttpStatus = require('http-status-codes');
const PouchDB = require('pouchdb');

function isConflictOrNotFound(error) {
  const code = error.status || (error.output || {}).statusCode;
  return code === HttpStatus.CONFLICT || code === HttpStatus.NOT_FOUND;
}

function wrapTryCatchWithBoomify(logger, handlerFn) {
  return async (request, h) => {
    try {
      // console.log('wat', handlerFn);
      const response = await handlerFn(request, h);
      return response;
    } catch (error) {
      // TODO: this is getting more and more complicated, we need to make sure that what we are doing
      // is proper not just making tests pass.
      console.log('ERROR ERROR ERROR', error);
      if (!isConflictOrNotFound(error)) {
        console.log('wrapTryCatchWithBoomify, catch before logger.error');
        logger.error(error);
      }
      console.log('wrapTryCatchWithBoomify, catch before throw boom', new Error(error));
      const newError = error instanceof Error ? error : new Error(error.message);
      const myErr = Boom.boomify(newError, { statusCode: error.status, decorate: error.data });
      // this is unfortunately needed as per this post: https://github.com/hapijs/boom/issues/153
      myErr.output.payload.data = error.data;
      throw myErr;
    }
  };
}
const getTwigletInfoAndMakeDB = async ({
  name,
  contextualConfig,
  getTwigletInfoByName,
  twigletKeys,
  beBad
}) => {
  const twigletInfoOrError = await getTwigletInfoByName(name, contextualConfig);
  const db = new PouchDB(contextualConfig.getTenantDatabaseString(twigletInfoOrError.twigId), {
    skip_setup: true
  });
  const twigletDocs = twigletKeys
    ? await db.allDocs({
        include_docs: true,
        keys: twigletKeys
      })
    : undefined;
  /*if(beBad) {
    console.log("HERE");
    return {twigletInfoOrError, db}
  }*/

  return {
    twigletInfoOrError,
    db,
    ...(twigletKeys
      ? {
          twigletData: twigletDocs.rows.reduce((obj, row) => {
            obj[row.id] = row.doc;
            return obj;
          }, {})
        }
      : {})

    /*...(twigletKeys
        ? {
            twigletData: twigletDocs.rows.reduce((obj, row) => ({
                ...obj,
                [row.id] : row.doc && row.doc.data
                    ? row.doc.data
                    // This might be wrong
                    : row.doc
            }),
            {})
        }
        :{}
    )
    */
  };
};

module.exports = {
  wrapTryCatchWithBoomify,
  getTwigletInfoAndMakeDB
};
