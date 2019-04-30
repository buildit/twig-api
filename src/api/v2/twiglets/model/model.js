'use strict';

const Boom = require('@hapi/boom');
const PouchDb = require('pouchdb');
const Joi = require('@hapi/joi');
const R = require('ramda');
const logger = require('../../../../log')('MODEL');
const { addCommitMessage } = require('../changelog');
const { getContextualConfig } = require('../../../../config');
const { getTwigletInfoByName } = require('../twiglets.helpers');
const { wrapTryCatchWithBoomify } = require('../../helpers');

function updateNode (oldNameMap) {
  return function map (node) {
    const updatedNode = Object.assign({}, node);
    if (oldNameMap[updatedNode.type]) {
      updatedNode.type = oldNameMap[updatedNode.type];
    }
    return updatedNode;
  };
}

const twigletModelBase = Joi.object({
  _rev: Joi.string(),
  entities: Joi.object().pattern(/[\S\s]*/, Joi.object({
    type: Joi.string().required(),
    color: Joi.string(),
    size: [Joi.string().allow(''), Joi.number()],
    class: Joi.string().required(),
    image: Joi.string().required(),
    attributes: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      dataType: Joi.string().required(),
      required: Joi.bool().required(),
    })).required(),
  })),
  nameChanges: Joi.array().items(Joi.object({
    originalType: Joi.string(),
    currentType: Joi.string(),
  })),
  commitMessage: Joi.string(),
});

function ensureEntitiesHaveAttributesAndType (entities) {
  return Reflect.ownKeys(entities).reduce((object, key) => {
    let entity = entities[key];
    if (!entity.attributes) {
      entity = R.merge(entity, {
        attributes: []
      });
    }
    if (!entity.type) {
      entity = R.merge(entity, {
        type: key
      });
    }
    return R.merge(object, {
      [key]: entity
    });
  }, {});
}


const getModelHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const twigletInfo = await getTwigletInfoByName(request.params.name, contextualConfig);
  const db = new PouchDb(contextualConfig.getTenantDatabaseString(twigletInfo._id), {
    skip_setup: true
  });
  const doc = await db.get('model');
  return {
    _rev: doc._rev,
    entities: ensureEntitiesHaveAttributesAndType(doc.data.entities),
  };
};

function getOldNamesMap (nameChanges) {
  let oldNameMap = {};
  if (nameChanges) {
    oldNameMap = nameChanges
      .filter(nameMap => nameMap.originalType !== nameMap.currentType)
      .reduce((accumulator, nameMap) => {
        accumulator[nameMap.originalType] = nameMap.currentType;
        return accumulator;
      }, {});
  }
  return oldNameMap;
}

async function updateModelNodes (db, oldNameMap) {
  const nodes = await db.get('nodes').catch(() => undefined);
  if (nodes) {
    const updatedNodes = Object.assign({}, nodes);
    updatedNodes.data = nodes.data.map(updateNode(oldNameMap));
    await db.put(updatedNodes);
  }
}

async function updateModelEvents (db, oldNameMap) {
  const events = await db.get('events').catch(() => undefined);
  if (events) {
    const updatedEvents = Object.assign({}, events);
    updatedEvents.data = updatedEvents.data.map((event) => {
      const updatedEvent = Object.assign({}, event);
      updatedEvent.nodes = updatedEvent.nodes.map(updateNode(oldNameMap));
      return updatedEvent;
    });
    await db.put(updatedEvents);
  }
}

const putModelHandler = async (request) => {
  const oldNameMap = getOldNamesMap(request.payload.nameChanges);
  const contextualConfig = getContextualConfig(request);
  const twigletInfo = await getTwigletInfoByName(request.params.name, contextualConfig);
  const db = new PouchDb(contextualConfig.getTenantDatabaseString(twigletInfo._id), {
    skip_setup: true
  });
  const doc = await db.get('model');
  if (doc._rev !== request.payload._rev) {
    const error = Boom.conflict('Conflict, bad revision number');
    error.output._rev = doc._rev;
    throw error;
  }
  doc.data = R.omit(['_rev', 'name', 'nameChanges'], request.payload);
  await db.put(doc);
  await updateModelNodes(db, oldNameMap);
  await updateModelEvents(db, oldNameMap);
  await addCommitMessage(
    contextualConfig,
    twigletInfo._id,
    request.payload.commitMessage,
    request.auth.credentials.user.name,
    false
  );
  return {
    _rev: doc._rev,
    entities: doc.data.entities,
  };
};

module.exports.routes = [{
  method: ['GET'],
  path: '/v2/twiglets/{name}/model',
  handler: wrapTryCatchWithBoomify(logger, getModelHandler),
  options: {
    auth: {
      mode: 'optional'
    },
    response: {
      schema: twigletModelBase
    },
    tags: ['api'],
  }
},
{
  method: ['PUT'],
  path: '/v2/twiglets/{name}/model',
  handler: wrapTryCatchWithBoomify(logger, putModelHandler),
  options: {
    validate: {
      payload: twigletModelBase,
    },
    response: {
      schema: twigletModelBase
    },
    tags: ['api'],
  }
},
];
