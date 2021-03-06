'use strict';

const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const HttpStatus = require('http-status-codes');
const logger = require('../../../../log')('VIEWS');
const Changelog = require('../changelog');
const { getContextualConfig } = require('../../../../config');
const { wrapTryCatchWithBoomify, getTwigletInfoDbAndData } = require('../../helpers');

const getViewsResponse = Joi.array().items(
  Joi.object({
    description: Joi.string().allow(''),
    name: Joi.string().required(),
    url: Joi.string()
      .uri()
      .required(),
  }),
);

const userStateResponse = Joi.object({
  autoConnectivity: Joi.string().required(),
  autoScale: Joi.string(),
  alphaTarget: Joi.number().optional(),
  bidirectionalLinks: Joi.boolean().optional(),
  cascadingCollapse: Joi.boolean().required(),
  collisionDistance: Joi.number(),
  currentNode: [
    Joi.string()
      .required()
      .allow(''),
    Joi.string()
      .required()
      .allow(null),
  ],
  filters: Joi.array().required(),
  forceChargeStrength: Joi.number().required(),
  forceGravityX: Joi.number().required(),
  forceGravityY: Joi.number().required(),
  forceLinkDistance: Joi.number().required(),
  forceLinkStrength: Joi.number().required(),
  forceVelocityDecay: Joi.number().required(),
  gravityPoints: Joi.object(),
  levelFilter: Joi.number(),
  linkType: Joi.string().required(),
  nodeSizingAutomatic: Joi.boolean(),
  renderOnEveryTick: Joi.boolean(),
  runSimulation: Joi.boolean(),
  scale: Joi.number().required(),
  separationDistance: Joi.number().optional(),
  showLinkLabels: Joi.boolean().required(),
  showNodeLabels: Joi.boolean().required(),
  treeMode: Joi.boolean().required(),
  traverseDepth: Joi.number().required(),
});

const linksResponse = Joi.object();

const nodesResponse = Joi.object();

const createViewRequest = Joi.object({
  description: Joi.string().allow(''),
  links: linksResponse,
  name: Joi.string().required(),
  nodes: nodesResponse.required(),
  userState: userStateResponse.required(),
});

const getViewResponse = createViewRequest.keys({
  url: Joi.string()
    .uri()
    .required(),
});

const getView = async (name, viewName, contextualConfig) => {
  const twigletName = name;
  const { data: viewsRaw } = await getTwigletInfoDbAndData({
    name: twigletName,
    contextualConfig,
    tableString: 'views_2',
  });
  if (viewsRaw.data) {
    const viewArray = viewsRaw.data.filter(row => row.name === viewName);
    if (viewArray.length) {
      return viewArray[0];
    }
  }
  throw Boom.notFound();
};

const getViewsHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  try {
    const { data: viewsRaw } = await getTwigletInfoDbAndData({
      name: request.params.twigletName,
      contextualConfig,
      tableString: 'views_2',
    });
    const views = viewsRaw.data.map(item => ({
      description: item.description,
      name: item.name,
      url: request.buildUrl(`/v2/twiglets/${request.params.twigletName}/views/${item.name}`),
    }));
    return views;
  }
  catch (error) {
    if (error.status === 404) {
      return [];
    }
    throw error;
  }
};

const getViewHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const view = await getView(request.params.twigletName, request.params.viewName, contextualConfig);
  const viewUrl = `/v2/twiglets/${request.params.twigletName}/views/${request.params.viewName}`;
  const viewResponse = {
    description: view.description,
    links: view.links,
    name: view.name,
    nodes: view.nodes,
    userState: view.userState,
    url: request.buildUrl(viewUrl),
  };
  return viewResponse;
};

function seedWithEmptyViews (db) {
  return async (error) => {
    if (error.status === 404) {
      await db.put({ _id: 'views_2', data: [] });
      const views = await db.get('views');
      return views;
    }
    throw error;
  };
}

async function throwIfViewNameNotUnique (twigletName, viewName, contextualConfig) {
  try {
    await getView(twigletName, viewName, contextualConfig);
    throw Boom.conflict('View name already in use');
  }
  catch (error) {
    if ((error.output || {}).statusCode !== HttpStatus.NOT_FOUND) {
      throw error;
    }
  }
}

const postViewsHandler = async (request, h) => {
  const contextualConfig = getContextualConfig(request);
  const { twigletInfoOrError, db, data: doc } = await getTwigletInfoDbAndData({
    name: request.params.twigletName,
    contextualConfig,
    tableString: 'views_2',
    seedEmptyFunc: seedWithEmptyViews,
  });
  const viewName = request.payload.name;
  await throwIfViewNameNotUnique(request.params.twigletName, viewName, contextualConfig);
  doc.data.push(request.payload);
  await Promise.all([
    db.put(doc),
    Changelog.addCommitMessage(
      contextualConfig,
      twigletInfoOrError._id,
      `View ${request.payload.name} created`,
      request.auth.credentials.user.name,
    ),
  ]);
  const newView = await getView(request.params.twigletName, request.payload.name, contextualConfig);
  const viewUrl = `/v2/twiglets/${request.params.twigletName}/views/${request.params.viewName}`;
  const viewResponse = {
    description: newView.description,
    name: newView.name,
    links: newView.links,
    nodes: newView.nodes,
    userState: newView.userState,
    url: request.buildUrl(viewUrl),
  };
  return h.response(viewResponse).created(viewResponse.url);
};

const putViewHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const { twigletInfoOrError, db, data: doc } = await getTwigletInfoDbAndData({
    name: request.params.twigletName,
    contextualConfig,
    tableString: 'views_2',
  });
  const viewIndex = doc.data.findIndex(view => view.name === request.params.viewName);
  doc.data[viewIndex] = request.payload;
  let commitMessage = `View ${request.payload.name} edited`;
  if (request.payload.name !== request.params.viewName) {
    commitMessage = `View ${request.params.viewName} renamed to ${request.payload.name}`;
  }
  await Promise.all([
    db.put(doc),
    Changelog.addCommitMessage(
      contextualConfig,
      twigletInfoOrError._id,
      commitMessage,
      request.auth.credentials.user.name,
    ),
  ]);
  const newView = await getView(request.params.twigletName, request.payload.name, contextualConfig);
  const viewUrl = `/v2/twiglets/${request.params.twigletName}/views/${request.payload.name}`;
  const viewResponse = {
    description: newView.description,
    links: newView.links,
    name: newView.name,
    nodes: newView.nodes,
    userState: newView.userState,
    url: request.buildUrl(viewUrl),
  };
  return viewResponse;
};

const deleteViewHandler = async (request, h) => {
  const contextualConfig = getContextualConfig(request);
  const { twigletInfoOrError, db, data: doc } = await getTwigletInfoDbAndData({
    name: request.params.twigletName,
    contextualConfig,
    tableString: 'views_2',
  });
  const viewIndex = doc.data.findIndex(view => view.name === request.params.viewName);
  doc.data.splice(viewIndex, 1);
  await Promise.all([
    db.put(doc),
    Changelog.addCommitMessage(
      contextualConfig,
      twigletInfoOrError._id,
      `View ${request.params.viewName} deleted`,
      request.auth.credentials.user.name,
    ),
  ]);
  return h.response().code(HttpStatus.NO_CONTENT);
};

module.exports.routes = [
  {
    method: ['GET'],
    path: '/v2/twiglets/{twigletName}/views',
    handler: wrapTryCatchWithBoomify(logger, getViewsHandler),
    options: {
      auth: { mode: 'optional' },
      response: { schema: getViewsResponse },
      tags: ['api'],
    },
  },
  {
    method: ['GET'],
    path: '/v2/twiglets/{twigletName}/views/{viewName}',
    handler: wrapTryCatchWithBoomify(logger, getViewHandler),
    options: {
      auth: { mode: 'optional' },
      response: { schema: getViewResponse },
      tags: ['api'],
    },
  },
  {
    method: ['PUT'],
    path: '/v2/twiglets/{twigletName}/views/{viewName}',
    handler: wrapTryCatchWithBoomify(logger, putViewHandler),
    options: {
      validate: {
        payload: createViewRequest,
      },
      response: { schema: getViewResponse },
      tags: ['api'],
    },
  },
  {
    method: ['POST'],
    path: '/v2/twiglets/{twigletName}/views',
    handler: wrapTryCatchWithBoomify(logger, postViewsHandler),
    options: {
      validate: {
        payload: createViewRequest,
      },
      response: { schema: getViewResponse },
      tags: ['api'],
    },
  },
  {
    method: ['DELETE'],
    path: '/v2/twiglets/{twigletName}/views/{viewName}',
    handler: wrapTryCatchWithBoomify(logger, deleteViewHandler),
    options: {
      tags: ['api'],
    },
  },
];
