'use strict';

const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const PouchDB = require('pouchdb');
const HttpStatus = require('http-status-codes');
const { isNil } = require('ramda');
const toJSON = require('utils-error-to-json');
const { getContextualConfig } = require('../../../config');
const logger = require('../../../log')('MODELS');
const { wrapTryCatchWithBoomify } = require('../helpers');

const createModelRequest = Joi.object({
  cloneModel: Joi.string().allow('').allow(null),
  commitMessage: Joi.string().required(),
  entities: Joi.object().pattern(/[\S\s]*/, Joi.object({
    class: Joi.string().required(),
    color: Joi.string(),
    image: Joi.string().required(),
    size: [Joi.string().allow('').allow(null), Joi.number()],
    type: Joi.string(),
    attributes: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      dataType: Joi.string().required(),
      required: Joi.bool().required(),
    })),
  })),
  name: Joi.string().required(),
});

const updateModelRequest = createModelRequest.keys({
  _rev: Joi.string().required(),
  doReplacement: Joi.bool(),
});

const getModelResponse = updateModelRequest.keys({
  url: Joi.string().uri().required(),
  changelog_url: Joi.string().uri().required(),
  commitMessage: Joi.invalid(),
  latestCommit: Joi.object({
    message: Joi.string().required(),
    user: Joi.string().required(),
    timestamp: Joi.date().iso(),
    replacement: Joi.bool(),
  }),
});

const getModelsResponse = Joi.array().items(Joi.object({
  name: Joi.string().required(),
  url: Joi.string().required(),
}));

const getModelWithDb = async (name, db) => {
  const modelsRaw = await db.allDocs({ include_docs: true });
  console.log('modelsRaw', modelsRaw);
  const modelArray = modelsRaw.rows.filter(row => row.doc.data.name === name);
  if (modelArray.length) {
    return modelArray[0].doc;
  }
  throw Boom.notFound('Not Found');
};

const getModelWithContextualConfig = async (name, contextualConfig) => {
  const db = new PouchDB(contextualConfig.getTenantDatabaseString('organisation-models'));
  return getModelWithDb(name, db);
};


async function postModel (db, name, entities, commitMessage, userName, cloneFromName = null) {
  const modelToCreate = {
    data: {
      entities,
      changelog: [{
        message: commitMessage,
        user: userName,
        timestamp: new Date().toISOString(),
      }],
      name,
    }
  };
  if (!isNil(cloneFromName)) {
    const cloneSource = await getModelWithDb(cloneFromName, db);
    modelToCreate.data.entities = cloneSource.data.entities;
  }
  return db.post(modelToCreate);
}

function formatModelResponse (model, urlBuilder) {
  return {
    entities: model.data.entities,
    name: model.data.name,
    _rev: model._rev,
    latestCommit: model.data.changelog
      ? model.data.changelog[0]
      : { message: 'no history', user: 'robot@buildit', timestamp: new Date().toISOString() },
    url: urlBuilder(`/v2/models/${model.data.name}`),
    changelog_url: urlBuilder(`/v2/models/${model.data.name}/changelog`)
  };
}

const postModelsHandler = async (request, h) => {
  const contextualConfig = getContextualConfig(request);
  const db = new PouchDB(contextualConfig.getTenantDatabaseString('organisation-models'));

  try {
    await getModelWithDb(request.payload.name, db);
    throw Boom.conflict('Model name already in use');
  }
  catch (error) {
    if (error.output.statusCode !== HttpStatus.NOT_FOUND) {
      throw error;
    }
  }

  const {
    name, entities, commitMessage, cloneModel
  } = request.payload;
  await postModel(db, name, entities, commitMessage,
    request.auth.credentials.user.name, cloneModel);
  const newModel = await getModelWithDb(request.payload.name, db);
  return h.response(formatModelResponse(newModel, request.buildUrl)).code(HttpStatus.CREATED);
};

const getModelsHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const db = new PouchDB(contextualConfig.getTenantDatabaseString('organisation-models'));
  const modelsRaw = await db.allDocs({ include_docs: true });

  const orgModels = modelsRaw.rows
    .map(row => ({
      name: row.doc.data.name,
      url: request.buildUrl(`/v2/models/${row.doc.data.name}`),
    }));
  return orgModels;
};

const getModelHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const db = new PouchDB(contextualConfig.getTenantDatabaseString('organisation-models'));
  const model = await getModelWithDb(request.params.name, db);
  return formatModelResponse(model, request.buildUrl);
};

const putModelHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const db = new PouchDB(contextualConfig.getTenantDatabaseString('organisation-models'));
  try {
    const model = await getModelWithDb(request.params.name, db);
    if (model._rev === request.payload._rev) {
      model.data.entities = request.payload.entities;
      model.data.name = request.payload.name;
      const newLog = {
        message: request.payload.commitMessage,
        user: request.auth.credentials.user.name,
        timestamp: new Date().toISOString(),
      };
      if (request.payload.doReplacement) {
        const replacementCommit = {
          message: '--- previous change overwritten ---',
          user: request.auth.credentials.user.name,
          timestamp: new Date().toISOString(),
        };
        model.data.changelog.unshift(replacementCommit);
      }
      model.data.changelog.unshift(newLog);
      await db.put(model);
      const updatedModel = await getModelWithDb(request.payload.name, db);
      return formatModelResponse(updatedModel, request.buildUrl);
    }
    const error = Error('Conflict, bad revision number');
    error.status = HttpStatus.CONFLICT;
    const modelResponse = {
      entities: model.data.entities,
      name: model.data.name,
      _rev: model._rev,
      latestCommit: model.data.changelog[0],
      url: request.buildUrl(`/v2/models/${model.data.name}`),
      changelog_url: request.buildUrl(`/v2/models/${model.data.name}/changelog`)
    };
    error.model = modelResponse;
    throw error;
  }
  catch (error) {
    if (error.status !== HttpStatus.CONFLICT) {
      logger.error(toJSON(error));
    }
    const boomError = Boom.boomify(error);
    if (error.model) {
      boomError.output.payload.data = error.model;
    }
    throw boomError;
  }
};

const deleteModelsHandler = async (request, h) => {
  const contextualConfig = getContextualConfig(request);
  const db = new PouchDB(contextualConfig.getTenantDatabaseString('organisation-models'));
  const model = await getModelWithDb(request.params.name, db);
  await db.remove(model._id, model._rev);
  return h.response().code(HttpStatus.NO_CONTENT);
};

const routes = [
  {
    method: ['POST'],
    path: '/v2/models',
    handler: wrapTryCatchWithBoomify(logger, postModelsHandler),
    config: {
      validate: {
        payload: createModelRequest
      },
      response: { schema: getModelResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/v2/models',
    handler: wrapTryCatchWithBoomify(logger, getModelsHandler),
    config: {
      auth: { mode: 'optional' },
      response: { schema: getModelsResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/v2/models/{name}',
    handler: wrapTryCatchWithBoomify(logger, getModelHandler),
    config: {
      auth: { mode: 'optional' },
      response: { schema: getModelResponse },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/v2/models/{name}',
    handler: putModelHandler,
    config: {
      validate: {
        payload: updateModelRequest
      },
      response: { schema: getModelResponse },
      tags: ['api'],
    }
  },
  {
    method: ['DELETE'],
    path: '/v2/models/{name}',
    handler: wrapTryCatchWithBoomify(logger, deleteModelsHandler),
    config: {
      tags: ['api'],
    }
  },
];

module.exports = {
  getModelWithDb,
  getModel: getModelWithContextualConfig,
  getModelResponse,
  updateModelRequest,
  routes,
};
