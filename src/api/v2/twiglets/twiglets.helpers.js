'use strict';

const PouchDB = require('pouchdb');
const Boom = require('boom');
const HttpStatus = require('http-status-codes');

async function getTwigletInfoByNameWithDb (name, db) {
  const twigletsRaw = await db.allDocs({ include_docs: true });
  const twigletsArray = twigletsRaw.rows.filter(row => row.doc.name === name);
  if (twigletsArray.length) {
    const twiglet = twigletsArray[0].doc;
    twiglet.twigId = twiglet._id;
    return twiglet;
  }
  throw Boom.notFound();
}

async function getTwigletInfoByName (name, contextualConfig) {
  const twigletLookupDb = new PouchDB(contextualConfig.getTenantDatabaseString('twiglets'));
  const twiglet = await getTwigletInfoByNameWithDb(name, twigletLookupDb);
  return twiglet;
}

async function throwIfTwigletNameNotUnique (name, db) {
  try {
    await getTwigletInfoByNameWithDb(name, db);
    throw Boom.conflict('Twiglet already exists');
  }
  catch (error) {
    if (error.output.statusCode !== HttpStatus.NOT_FOUND) {
      throw error;
    }
  }
}

module.exports = {
  getTwigletInfoByName,
  throwIfTwigletNameNotUnique
};
