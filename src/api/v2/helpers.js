'use strict';

const Boom = require('@hapi/boom');
const HttpStatus = require('http-status-codes');
const PouchDB = require('pouchdb');
const { getTwigletInfoByName } = require('./twiglets/twiglets.helpers');

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
    catch (error) {
      // TODO: this is getting more and more complicated, we need to make sure that what we are
      // doing is proper not just making tests pass.
      if (!isConflictOrNotFound(error)) {
        logger.error(error);
      }
      const newError = error instanceof Error ? error : new Error(error.message);
      const myErr = Boom.boomify(newError, { statusCode: error.status, decorate: error.data });
      // this is unfortunately needed as per this post: https://github.com/hapijs/boom/issues/153
      myErr.output.payload.data = error.data;
      throw myErr;
    }
  };
}

/**
 * In most get/put/patch requests there is a common pattern of getting twigletinfo, creating a db,
 * and querying that db. This does those steps and returns the created data.
 * @param {required: string} name: name of the twiglet to get
 * @param {required: object} contextualConfig: config object
 * @param {optional: array[string]} twigletKeys: keys to get from the db
 * @param {optional: string} tableString: name of the table to query
 * @param {optional: function} seedEmptyFunc: a function to replace empties
 * @return {
 *   twigletInfoOrError,
 *   db,
 *   data,
 * }
 */
const getTwigletInfoDbAndData = async ({
  name,
  contextualConfig,
  twigletKeys,
  tableString,
  seedEmptyFunc,
}) => {
  const twigletInfoOrError = await getTwigletInfoByName(name, contextualConfig);
  const db = new PouchDB(contextualConfig.getTenantDatabaseString(twigletInfoOrError.twigId), {
    skip_setup: true,
  });
  const twigletDocs = twigletKeys
    ? await db.allDocs({
      include_docs: true,
      keys: twigletKeys,
    })
    : undefined;

  let data;
  if (tableString) {
    if (seedEmptyFunc) {
      data = await db.get(tableString).catch(seedEmptyFunc(db));
    }
    else {
      data = await db.get(tableString);
    }
  }

  return Object.assign(
    {
      twigletInfoOrError,
      db,
    },
    twigletKeys
      ? {
        data: twigletDocs.rows.reduce((obj, row) => {
          obj[row.id] = row.doc;
          return obj;
        }, {}),
      }
      : {},
    tableString
      ? {
        data,
      }
      : {},
  );
};

module.exports = {
  wrapTryCatchWithBoomify,
  getTwigletInfoDbAndData,
};
