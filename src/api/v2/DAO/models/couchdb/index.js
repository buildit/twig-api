'use strict';
const PouchDB = require('pouchdb');
const config = require('../../../../../config');

class Models {

  getOne (name) {
    const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
    return db.allDocs({ include_docs: true })
    .then(modelsRaw => {
      const modelArray = modelsRaw.rows.filter(row => row.doc.data.name === name);
      if (modelArray.length) {
        return modelArray[0].doc;
      }
      const error = Error('Not Found');
      error.status = 404;
      throw error;
    });
  }

  getAll () {
    const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
    return db.allDocs({ include_docs: true });
  }

  create ({ name, entities, commitMessage }, user) {
    const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
    return this.getModel(name)
    .then(() => {
      const error = Error('Model name already in use');
      error.status = 409;
      throw error;
    })
    .catch(error => {
      if (error.status === 404) {
        const modelToCreate = {
          data: {
            entities,
            changelog: [{
              message: commitMessage,
              user,
              timestamp: new Date().toISOString(),
            }],
            name,
          }
        };
        return db.post(modelToCreate);
      }
      throw error;
    });
  }

  clone ({ name, cloneModel, commitMessage }, user) {
    const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
    return this.getModel(name)
    .then(() => {
      const error = Error('Model name already in use');
      error.status = 409;
      throw error;
    })
    .catch(error => {
      if (error.status === 404) {
        return config.getModel(cloneModel)
        .then(originalModel => {
          const modelToCreate = {
            data: {
              entities: originalModel.data.entities,
              changelog: [{
                message: commitMessage,
                user,
                timestamp: new Date().toISOString(),
              }],
              name,
            }
          };
          return db.post(modelToCreate);
        });
      }
      throw error;
    });
  }

  update ({ name, _rev, entities, commitMessage, doReplacement }, user) {
    const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
    return this.getModel(name)
    .then(model => {
      if (model._rev === _rev) {
        model.data.entities = entities;
        model.data.name = name;
        const newLog = {
          message: commitMessage,
          user,
          timestamp: new Date().toISOString(),
        };
        if (doReplacement) {
          const replacementCommit = {
            message: '--- previous change overwritten ---',
            user,
            timestamp: new Date().toISOString(),
          };
          model.data.changelog.unshift(replacementCommit);
        }
        model.data.changelog.unshift(newLog);
        return db.put(model);
      }
      const error = Error('Conflict, bad revision number');
      error.status = 409;
      const modelResponse = {
        entities: model.data.entities,
        name: model.data.name,
        _rev: model._rev,
        latestCommit: model.data.changelog[0],
      };
      error.model = modelResponse;
      throw error;
    });
  }

  delete ({ name }) {
    const db = new PouchDB(config.getTenantDatabaseString('organisation-models'));
    return this.getModel(name)
    .then(model => db.remove(model._id, model._rev));
  }
}

module.exports = Models;
