'use strict';

const PouchDB = require('pouchdb');
const uuidV4 = require('uuid/v4');
const orgModelsFromJson = require('./organization-models.json');
const twigletsFromJson = require('./twiglets.json');
const { checkNodesAreInModel } = require('../api/v2/twiglets');
const { config } = require('../config');

const dbURL = config.DB_URL;

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

  twigletsArray.forEach(twiglet => twigletLookupDb.allDocs({ include_docs: true })
    .then((docs) => {
      if (docs.rows.some(row => row.doc.name === twiglet.name)) {
        throw new Error(`Twiglet with a name ${twiglet.name} already exists, not imported`);
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
            ],
          },
        ]),
      ]);
    })
    .then(() => console.log(`Twiglet ${twiglet.name} imported successfully`))
    .catch(error => console.warn(`Problem with ${twiglet.name}`, error)));
}

importModels(orgModelsFromJson);
importTwiglets(twigletsFromJson);
