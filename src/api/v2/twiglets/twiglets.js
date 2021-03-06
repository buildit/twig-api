'use strict';

const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const R = require('ramda');
const PouchDB = require('pouchdb');
const uuidV4 = require('uuid/v4');
const HttpStatus = require('http-status-codes');
const { getContextualConfig } = require('../../../config');
const logger = require('../../../log')('TWIGLETS');
const Changelog = require('./changelog');
const Model = require('../models/');
const { getTwigletInfoByName } = require('./twiglets.helpers');
const { wrapTryCatchWithBoomify, getTwigletInfoDbAndData } = require('../helpers');

const createTwigletRequest = Joi.object({
  name: Joi.string()
    .required()
    .description('the name of the twiglet'),
  description: Joi.string()
    .required()
    .allow('')
    .description('a description of the twiglet'),
  model: Joi.string()
    .required()
    .description('the model name to use'),
  json: Joi.string()
    .allow('')
    .description('a json file to import the twiglet from'),
  cloneTwiglet: Joi.string()
    .allow('')
    .description('twiglet name to copy from'),
  googlesheet: Joi.string()
    .uri()
    .allow('')
    .description('google sheet to pull from')
    .disallow(),
  commitMessage: Joi.string()
    .required()
    .description('the initial commit message'),
}).label('Twiglet Creation Request');

const attributes = Joi.array().items(
  Joi.object({
    key: Joi.string().required(),
    value: Joi.any(),
  }).label('attribute'),
);

const Link = Joi.object({
  attrs: attributes.description('non-graphical attributes such as phone number'),
  association: Joi.string()
    .allow('')
    .description('the name of the link'),
  id: Joi.string()
    .required()
    .description('an id, use UUIDv4, etc to generate'),
  source: Joi.string()
    .required()
    .description('the id of the source node'),
  target: Joi.string()
    .required()
    .description('the id of the target node'),
  _color: Joi.string().description('overrides the default color of the link'),
  _size: Joi.number().description('overrides the default thickness of the link'),
}).label('Link');

const Node = Joi.object({
  attrs: attributes.description('non-graphical attributes such as phone number'),
  id: [
    Joi.string()
      .required()
      .description('an id, use UUIDv4, etc to generate'),
    Joi.number()
      .required()
      .description('an id, use UUIDv4, etc to generate'),
  ],
  location: Joi.string()
    .allow('')
    .allow(null)
    .description('physical location, eg Denver, CO, USA'),
  name: [
    Joi.string()
      .allow('')
      .required()
      .description('the name of the node'),
    Joi.string()
      .required()
      .allow(null)
      .description('the name of the node'),
  ],
  type: Joi.string()
    .required()
    .description('the model type of the node'),
  x: Joi.number().description('the horizontal position of the node'),
  y: Joi.number().description('the vertical position of the node'),
  _color: Joi.string().description('overrides the model color of the node'),
  _size: Joi.number().description('overrides the model size of the node'),
}).label('Node');

const jsonTwigletRequest = Joi.object({
  nodes: Joi.array()
    .items(Node)
    .description('an array of nodes')
    .required(),
  links: Joi.array()
    .items(Link)
    .description('an array of links')
    .required(),
  model: Joi.object({
    entities: Joi.object().pattern(
      /[\S\s]*/,
      Joi.object({
        type: Joi.string(),
        color: Joi.string(),
        size: [Joi.string().allow(''), Joi.number()],
        class: Joi.string().required(),
        image: Joi.string().required(),
        attributes: Joi.array()
          .items(
            Joi.object({
              name: Joi.string().required(),
              dataType: Joi.string().required(),
              required: Joi.bool().required(),
            }),
          )
          .description('the entities of the model')
          .required(),
      }).required(),
    ),
  }).required(),
  views: Joi.array()
    .items(
      Joi.object({
        links: Joi.object().required(),
        name: Joi.string().required(),
        nodes: Joi.object().required(),
        userState: Joi.object({
          autoConnectivity: Joi.string().required(),
          autoScale: Joi.string(),
          cascadingCollapse: Joi.boolean().required(),
          currentNode: [
            Joi.string()
              .required()
              .allow(''),
            Joi.string()
              .required()
              .allow(null),
          ],
          filters: Joi.object().required(),
          forceChargeStrength: Joi.number().required(),
          forceGravityX: Joi.number().required(),
          forceGravityY: Joi.number().required(),
          forceLinkDistance: Joi.number().required(),
          forceLinkStrength: Joi.number().required(),
          forceVelocityDecay: Joi.number().required(),
          gravityPoints: Joi.object(),
          linkType: Joi.string().required(),
          nodeSizingAutomatic: Joi.boolean(),
          scale: Joi.number().required(),
          showLinkLabels: Joi.boolean().required(),
          showNodeLabels: Joi.boolean().required(),
          treeMode: Joi.boolean().required(),
          traverseDepth: Joi.number().required(),
        }),
      }),
    )
    .required(),
  events: Joi.array().items(
    Joi.object({
      description: Joi.string()
        .required()
        .allow(''),
      links: Joi.array()
        .items(Node)
        .required(),
      name: Joi.string().required(),
      nodes: Joi.array()
        .items(Link)
        .required(),
      id: Joi.string().required(),
    }),
  ),
  sequences: Joi.array().items(
    Joi.object({
      description: Joi.string().allow(''),
      events: Joi.array().required(),
      id: Joi.string().required(),
      name: Joi.string().required(),
    }),
  ),
});

const baseTwigletRequest = Joi.object({
  name: Joi.string().required(),
  description: Joi.string()
    .required()
    .allow(''),
});

const updateTwigletRequest = baseTwigletRequest
  .keys({
    _rev: Joi.string().required(),
    nodes: Joi.array()
      .items(Node)
      .required()
      .label('Node[]'),
    links: Joi.array()
      .items(Link)
      .required(Link)
      .label('Link[]'),
    commitMessage: Joi.string().required(),
    doReplacement: Joi.boolean(),
  })
  .label('Put Twiglet Request');

const patchTwigletRequest = Joi.object({
  name: Joi.string().description('overwrites the name of the twiglet'),
  description: Joi.string()
    .allow('')
    .description('overwrites the twiglet description'),
  _rev: Joi.string()
    .required()
    .description('the revision number for the document'),
  nodes: Joi.array()
    .items(Node)
    .description('an array of nodes')
    .label('Node[]'),
  links: Joi.array()
    .items(Link)
    .description('an array of links')
    .label('Link[]'),
  commitMessage: Joi.string()
    .required()
    .description('the commit message associated with this update'),
}).label('Twiglet Patch');

const baseTwigletResponse = {
  url: Joi.string()
    .uri()
    .required(),
  events_url: Joi.string()
    .uri()
    .required(),
  changelog_url: Joi.string()
    .uri()
    .required(),
  json_url: Joi.string()
    .uri()
    .required(),
  model_url: Joi.string()
    .uri()
    .required(),
  views_url: Joi.string()
    .uri()
    .required(),
  sequences_url: Joi.string()
    .uri()
    .required(),
};

const getTwigletResponse = updateTwigletRequest.keys(baseTwigletResponse).keys({
  commitMessage: Joi.disallow(),
  latestCommit: Joi.object({
    message: Joi.string().required(),
    user: Joi.string().required(),
    timestamp: Joi.date().iso(),
    replacement: Joi.bool(),
  }),
});

const getTwigletsResponse = Joi.array()
  .required()
  .items(baseTwigletRequest.keys(baseTwigletResponse).unknown());

function throwIfNodesNotInModel (model, nodes) {
  (nodes || []).forEach((node) => {
    if (model.entities[node.type] === undefined) {
      throw Boom.badRequest(`node.type must be in entities, node.id: '${node.id}' fails`);
    }
  });
}

const nodeKeysToPick = ['attrs', 'id', 'location', 'name', 'type', 'x', 'y', '_color', '_size'];

function nodeCleaner (n) {
  const node = R.pick(nodeKeysToPick, n);
  node.id = escape(node.id);
  node.id = node.id.replace(/%/g, '');
  if (node.attrs) {
    node.attrs = node.attrs.filter(a => a.key);
  }
  return node;
}

const linkKeysToPick = ['attrs', 'association', 'id', 'source', 'target', '_color', '_size'];

function linkCleaner (l) {
  const link = R.pick(linkKeysToPick, l);
  link.id = escape(link.id);
  link.id = link.id.replace(/%/g, '');
  return link;
}

async function getTwiglet (name, urlBuilder, contextualConfig) {
  const { twigletInfoOrError, data: twigletData } = await getTwigletInfoDbAndData({
    name,
    contextualConfig,
    twigletKeys: ['nodes', 'links', 'changelog'],
  });
  if (twigletInfoOrError instanceof Error) {
    throw twigletInfoOrError;
  }
  const cleanedTwigletData = R.omit(['changelog', 'views_2', 'events', 'sequences'], twigletData);
  const presentationTwigletData = {
    _rev: `${twigletInfoOrError._rev}:${twigletData.nodes._rev}:${twigletData.links._rev}`,
    name: twigletInfoOrError.name,
    description: twigletInfoOrError.description,
    latestCommit: twigletData.changelog.data[0],
    nodes: twigletData.nodes.data.map(nodeCleaner),
    links: twigletData.links.data.map(linkCleaner),
    url: urlBuilder(`/v2/twiglets/${name}`),
    model_url: urlBuilder(`/v2/twiglets/${name}/model`),
    changelog_url: urlBuilder(`/v2/twiglets/${name}/changelog`),
    views_url: urlBuilder(`/v2/twiglets/${name}/views`),
    json_url: urlBuilder(`/v2/twiglets/${name}.json`),
    events_url: urlBuilder(`/v2/twiglets/${name}/events`),
    sequences_url: urlBuilder(`/v2/twiglets/${name}/sequences`),
  };
  return R.merge(cleanedTwigletData, presentationTwigletData);
}

const getTwigletHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const twiglet = await getTwiglet(request.params.name, request.buildUrl, contextualConfig);
  return twiglet;
};

function ensureEntitiesHaveAttributesAndType (entities) {
  return Reflect.ownKeys(entities).reduce((object, key) => {
    let entity = entities[key];
    if (!entity.attributes) {
      entity = R.merge(entity, {
        attributes: [],
      });
    }
    if (!entity.type) {
      entity = R.merge(entity, {
        type: key,
      });
    }
    return R.merge(object, {
      [key]: entity,
    });
  }, {});
}

function checkJsonParsableIfExists (json) {
  let jsonTwiglet;
  if (json && json !== '') {
    try {
      jsonTwiglet = JSON.parse(json);
    }
    catch (error) {
      throw Boom.badData('JSON file not parseable');
    }
  }
  return jsonTwiglet;
}

const seedTwiglet = ({
  createdDb, links, model, nodes, views, events, sequences,
}) => Promise.all([
  createdDb.bulkDocs([
    {
      _id: 'links',
      data: links,
    },
    {
      _id: 'model',
      data: model,
    },
    {
      _id: 'nodes',
      data: nodes,
    },
    {
      _id: 'views_2',
      data: views,
    },
    {
      _id: 'events',
      data: events || [],
    },
    {
      _id: 'sequences',
      data: sequences || [],
    },
  ]),
]);

const createTwigletHandler = async (request, h) => {
  const jsonTwiglet = checkJsonParsableIfExists(request.payload.json);
  if (jsonTwiglet) {
    throwIfNodesNotInModel(jsonTwiglet.model, jsonTwiglet.nodes);
  }
  const contextualConfig = getContextualConfig(request);
  const twigletLookupDb = new PouchDB(contextualConfig.getTenantDatabaseString('twiglets'));
  // await throwIfTwigletNameNotUnique(request.payload.name, twigletLookupDb);
  const docs = await twigletLookupDb.allDocs({ include_docs: true });
  if (docs.rows.some(row => row.doc.name === request.payload.name)) {
    return Boom.conflict('Twiglet already exists');
  }
  const newTwiglet = R.pick(['name', 'description'], request.payload);
  newTwiglet._id = `twig-${uuidV4()}`;
  const twigletInfo = await twigletLookupDb.post(newTwiglet);
  const dbString = contextualConfig.getTenantDatabaseString(twigletInfo.id);
  const createdDb = new PouchDB(dbString);
  if (jsonTwiglet) {
    throwIfNodesNotInModel(jsonTwiglet.model, jsonTwiglet.nodes);
    await seedTwiglet(Object.assign({ createdDb }, jsonTwiglet));
  }
  else if (request.payload.cloneTwiglet && request.payload.cloneTwiglet !== 'N/A') {
    const twigletToBeClonedInfo = await getTwigletInfoByName(
      request.payload.cloneTwiglet,
      contextualConfig,
    );
    const clonedDb = new PouchDB(
      contextualConfig.getTenantDatabaseString(twigletToBeClonedInfo.twigId),
      {
        skip_setup: true,
      },
    );
    const twigletDocs = await clonedDb.allDocs({
      include_docs: true,
      keys: ['links', 'model', 'nodes', 'views_2', 'events', 'sequences'],
    });
    await seedTwiglet({
      createdDb,
      links: twigletDocs.rows[0].doc.data,
      model: twigletDocs.rows[1].doc.data,
      nodes: twigletDocs.rows[2].doc.data,
      views: twigletDocs.rows[3].doc.data,
      events: twigletDocs.rows[4].doc.data,
      sequences: twigletDocs.rows[5].doc.data,
    });
  }
  else {
    const model = await Model.getModel(request.payload.model, contextualConfig);
    await seedTwiglet({
      createdDb,
      model: { entities: ensureEntitiesHaveAttributesAndType(model.data.entities) },
      links: [],
      views: [],
      nodes: [],
    });
  }
  await Changelog.addCommitMessage(
    contextualConfig,
    twigletInfo.id,
    request.payload.commitMessage,
    request.auth.credentials.user.name,
  );
  const twiglet = await getTwiglet(request.payload.name, request.buildUrl, contextualConfig);
  return h.response(twiglet).created(twiglet.url);
};

const getTwigletsHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const db = new PouchDB(contextualConfig.getTenantDatabaseString('twiglets'), {
    skip_setup: true,
  });
  const doc = await db.allDocs({ include_docs: true });
  const twiglets = doc.rows.map(twiglet => R.merge(R.omit(['_rev', '_id'], twiglet.doc), {
    url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}`),
    model_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}/model`),
    changelog_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}/changelog`),
    views_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}/views`),
    json_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}.json`),
    events_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}/events`),
    sequences_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}/sequences`),
  }));
  return twiglets;
};

async function throwIfInvalidRevisions (
  payloadRevisions,
  twigletRevision,
  nodesRevision,
  linksRevision,
  name,
  urlBuilder,
  contextualConfig,
) {
  const splitRevs = payloadRevisions.split(':');
  if (
    twigletRevision !== splitRevs[0]
    || nodesRevision !== splitRevs[1]
    || linksRevision !== splitRevs[2]
  ) {
    const twiglet = await getTwiglet(name, urlBuilder, contextualConfig);
    const error = Boom.conflict('Your revision number is out of date', { data: twiglet });
    throw error;
  }
}

function throwIfInvalidRevsCount (revs) {
  const splitRevs = revs.split(':');
  if (splitRevs.length !== 3) {
    throw Boom.badRequest(
      '_rev must be in the form of twigletInfoOrError._rev:nodes._rev:links._rev',
    );
  }
}

const putTwigletHandler = async (request) => {
  throwIfInvalidRevsCount(request.payload._rev);

  const contextualConfig = getContextualConfig(request);
  const twigletLookupDb = new PouchDB(contextualConfig.getTenantDatabaseString('twiglets'));
  const { twigletInfoOrError, db, data: twigletData } = await getTwigletInfoDbAndData({
    name: request.params.name,
    contextualConfig,
    twigletKeys: ['nodes', 'links', 'model'],
  });

  if (!twigletInfoOrError._id) {
    return Boom.boomify(twigletInfoOrError);
  }
  await throwIfInvalidRevisions(
    request.payload._rev,
    twigletInfoOrError._rev,
    twigletData.nodes._rev,
    twigletData.links._rev,
    request.params.name,
    request.buildUrl,
    contextualConfig,
  );

  throwIfNodesNotInModel(twigletData.model.data, request.payload.nodes);

  twigletInfoOrError.name = request.payload.name;
  twigletInfoOrError.description = request.payload.description;
  const twigIdVar = twigletInfoOrError.twigId;
  delete twigletInfoOrError.twigId;
  twigletData.nodes.data = request.payload.nodes;
  twigletData.links.data = request.payload.links;
  await Promise.all([
    twigletLookupDb.put(twigletInfoOrError),
    db.put(twigletData.nodes),
    db.put(twigletData.links),
    Changelog.addCommitMessage(
      contextualConfig,
      twigIdVar,
      request.payload.commitMessage,
      request.auth.credentials.user.name,
      request.payload.doReplacement,
    ),
  ]);

  const twiglet = await getTwiglet(request.payload.name, request.buildUrl, contextualConfig);
  return twiglet;
};

const patchTwigletHandler = async (request) => {
  throwIfInvalidRevsCount(request.payload._rev);
  const contextualConfig = getContextualConfig(request);
  const twigletLookupDb = new PouchDB(contextualConfig.getTenantDatabaseString('twiglets'));

  const { twigletInfoOrError, db, data: twigletData } = await getTwigletInfoDbAndData({
    name: request.params.name,
    contextualConfig,
    twigletKeys: ['nodes', 'links', 'model'],
  });

  if (!twigletInfoOrError._id) {
    return Boom.boomify(twigletInfoOrError);
  }
  await throwIfInvalidRevisions(
    request.payload._rev,
    twigletInfoOrError._rev,
    twigletData.nodes._rev,
    twigletData.links._rev,
    request.params.name,
    request.buildUrl,
    contextualConfig,
  );

  if (request.payload.nodes) {
    throwIfNodesNotInModel(twigletData.model.data, request.payload.nodes);
  }
  twigletInfoOrError.name = request.payload.name || twigletInfoOrError.name;
  twigletInfoOrError.description = request.payload.description || twigletInfoOrError.description;
  const twigIdVar = twigletInfoOrError.twigId;
  delete twigletInfoOrError.twigId;
  twigletData.nodes.data = request.payload.nodes || twigletData.nodes.data;
  twigletData.links.data = request.payload.links || twigletData.links.data;
  await Promise.all([
    twigletLookupDb.put(twigletInfoOrError),
    db.put(twigletData.nodes),
    db.put(twigletData.links),
    Changelog.addCommitMessage(
      contextualConfig,
      twigIdVar,
      request.payload.commitMessage,
      request.auth.credentials.user.name,
      false,
    ),
  ]);

  const twiglet = await getTwiglet(
    request.payload.name || request.params.name,
    request.buildUrl,
    contextualConfig,
  );
  return twiglet;
};

const deleteTwigletHandler = async (request, h) => {
  const contextualConfig = getContextualConfig(request);
  const twigletLookupDb = new PouchDB(contextualConfig.getTenantDatabaseString('twiglets'));
  const { twigletInfoOrError, db } = await getTwigletInfoDbAndData({
    name: request.params.name,
    contextualConfig,
  });
  if (!twigletInfoOrError._id) {
    return Boom.boomify(twigletInfoOrError);
  }
  await db.destroy();
  await twigletLookupDb.remove(twigletInfoOrError._id, twigletInfoOrError._rev);
  return h.response().code(HttpStatus.NO_CONTENT);
};

function sanitizeModel (model) {
  return R.pick(['entities'], model);
}

const getTwigletJsonHandler = async (request, reply) => {
  const contextualConfig = getContextualConfig(request);
  const { db } = await getTwigletInfoDbAndData({
    name: request.params.name,
    contextualConfig,
  });
  const twigletDocs = await db.allDocs({
    include_docs: true,
    keys: ['nodes', 'links', 'model', 'views_2', 'events', 'sequences'],
  });
  const twigletData = twigletDocs.rows.reduce((obj, row) => {
    if (row.doc && row.doc.data) {
      obj[row.id] = row.doc.data;
    }
    return obj;
  }, {});
  twigletData.views = twigletData.views_2 || [];
  twigletData.nodes = twigletData.nodes.map(nodeCleaner);
  twigletData.links = twigletData.links.map(linkCleaner);
  twigletData.model = sanitizeModel(twigletData.model);
  delete twigletData.views_2;
  return reply(twigletData);
};

module.exports = {
  getTwigletInfoByName,
  checkNodesAreInModel: throwIfNodesNotInModel,
  routes: [
    {
      method: ['POST'],
      path: '/v2/twiglets',
      handler: wrapTryCatchWithBoomify(logger, createTwigletHandler),
      options: {
        validate: {
          payload: createTwigletRequest,
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              // In prod, log a limited error message and throw the default Bad Request error.
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            }
            else {
              // During development, log and respond with the full error.
              console.error(err);
              throw err;
            }
          },
        },
        response: {
          schema: getTwigletResponse,
        },
        tags: ['api'],
      },
    },
    {
      method: ['GET'],
      path: '/v2/twiglets',
      handler: wrapTryCatchWithBoomify(logger, getTwigletsHandler),
      options: {
        auth: {
          mode: 'optional',
        },
        response: {
          schema: getTwigletsResponse,
        },
        tags: ['api'],
      },
    },
    {
      method: ['GET'],
      path: '/v2/twiglets/{name}',
      handler: wrapTryCatchWithBoomify(logger, getTwigletHandler),
      options: {
        auth: {
          mode: 'optional',
        },
        response: {
          schema: getTwigletResponse,
        },
        tags: ['api'],
      },
    },
    {
      method: ['GET'],
      path: '/v2/twiglets/{name}.json',
      handler: wrapTryCatchWithBoomify(logger, getTwigletJsonHandler),
      options: {
        auth: {
          mode: 'optional',
        },
        response: {
          schema: jsonTwigletRequest,
        },
        tags: ['api'],
      },
    },
    {
      method: ['PUT'],
      path: '/v2/twiglets/{name}',
      handler: wrapTryCatchWithBoomify(logger, putTwigletHandler),
      options: {
        validate: {
          payload: updateTwigletRequest,
        },
        response: {
          schema: getTwigletResponse,
        },
        tags: ['api'],
      },
    },
    {
      method: ['PATCH'],
      path: '/v2/twiglets/{name}',
      handler: wrapTryCatchWithBoomify(logger, patchTwigletHandler),
      options: {
        validate: {
          payload: patchTwigletRequest,
        },
        response: {
          schema: getTwigletResponse,
        },
        tags: ['api'],
      },
    },
    {
      method: ['DELETE'],
      path: '/v2/twiglets/{name}',
      handler: wrapTryCatchWithBoomify(logger, deleteTwigletHandler),
      options: {
        tags: ['api'],
      },
    },
  ],
};
