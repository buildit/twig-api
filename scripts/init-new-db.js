'use strict';

const PouchDB = require('pouchdb');
const orgModelsFromJson = require('./organization-models.json');
const twigletsFromJson = require('./twiglets.json');
const uuidV4 = require('uuid/v4');
const { checkNodesAreInModel } = require('../src/api/v2/twiglets');

const env = process.env.MODE || process.env.NODE_ENV || 'local';
let dbURL = '';

switch (env) {
  case 'local':
    dbURL = 'http://localhost:5984';
    break;

  case 'development':
    dbURL = 'https://cklattlenifecomplerstedi:9ebdadbce84b650c3b60facc73361e1606507fb4@shahzain-wipro.cloudant.com';
    break;

  case 'production':
    dbURL = 'http://couchdb.riglet:5984';
    break;

  default:
    dbURL = 'http://localhost:5984';
    break;
}

console.warn(`Using ${env} DB URL: ${dbURL}`);

function importModels (orgModels) {
  const dbName = 'organisation-models';
  const db = new PouchDB(`${dbURL}/${dbName}`);

  orgModels.forEach((model) => {
    db
      .get(model._id)
      .then((doc) => {
        doc.data = model.data;
        return db.put(doc, doc._rev);
      })
      .catch((error) => {
        if (error.status === 404) {
          return db.post(model);
        }
        return console.error(error);
      })
      .then(() => {
        console.log(`Organisation ${model._id} migrated successfully.`);
      });
  });
}

function importTwiglets (twigletsArray) {
  const dbName = 'twiglets';
  const twigletLookupDb = new PouchDB(`${dbURL}/${dbName}`);

  twigletsArray.forEach(twiglet =>
    twigletLookupDb.allDocs({ include_docs: true })
      .then((docs) => {
        if (docs.rows.some(row => row.doc.name === twiglet.name)) {
          return console.error(`Twiglet with a name ${twiglet.name} already exists, not imported`);
        }
        const newTwiglet = { name: twiglet.name, description: twiglet.description };
        newTwiglet._id = `twig-${uuidV4()}`;
        return twigletLookupDb.post(newTwiglet);
      })
      .then((twigletInfo) => {
        const dbString = `${dbURL}/${twigletInfo.id}`;
        const createdDb = new PouchDB(dbString);
        checkNodesAreInModel(twiglet.data.model, twiglet.data.nodes);
        return Promise.all([
          createdDb.bulkDocs([
            { _id: 'model', data: twiglet.data.model },
            { _id: 'nodes', data: twiglet.data.nodes },
            { _id: 'links', data: twiglet.data.links },
            { _id: 'views_2', data: twiglet.data.views },
            { _id: 'events', data: twiglet.data.events || [] },
            { _id: 'sequences', data: twiglet.data.sequences || [] },
            {
              _id: 'changelog',
              data: [
                {
                  message: 'Imported via init script',
                  user: 'A Script',
                  timestamp: new Date().toISOString(),
                },
              ]
            },
          ]),
        ]);
      })
      .then(() => console.log(`Twiglet ${twiglet.name} imported successfully`))
      .catch(error => console.warn(`Problem with ${twiglet.name}`, error))
  );
}

importModels(orgModelsFromJson);
importTwiglets(twigletsFromJson);
