'use strict';

const PouchDB = require('pouchdb');
const Boom = require('@hapi/boom');
const HttpStatus = require('http-status-codes');

async function getTwigletInfoByNameWithDb (name, db) {
  console.log(`getTwigletInfoByNameWithDb 1 name: ${name}, db: ${JSON.stringify(db)}`);
  try {
    const twigletsRaw = await db.allDocs({ include_docs: true });
    console.log('getTwigletInfoByNameWithDb 2 twigletsRaw', twigletsRaw);
    const twigletsArray = twigletsRaw.rows.filter(row => row.doc.name === name);
    if (twigletsArray.length) {
      const twiglet = twigletsArray[0].doc;
      twiglet.twigId = twiglet._id;
      return twiglet;
    }
    return Boom.notFound();
  }
  catch (error) {
    console.log('getTwigletInfoByNameWithDb caught error', error);
    return Boom.notFound();
  }
}

async function getTwigletInfoByName (name, contextualConfig) {
  console.log('getTwigletInfoByName 1');
  const twigletLookupDb = new PouchDB(contextualConfig.getTenantDatabaseString('twiglets'));
  console.log(`getTwigletInfoByName 2 name: ${name}, twigletLookupDb ${twigletLookupDb}`);
  const twiglet = await getTwigletInfoByNameWithDb(name, twigletLookupDb);
  console.log('getTwigletInfoByName 3', twiglet);
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
