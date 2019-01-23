'use strict';

const Boom = require('boom');
const Joi = require('joi');
const PouchDb = require('pouchdb');
const config = require('../../../../config');
const logger = require('../../../../log')('VIEWS');
const Changelog = require('../changelog');

const getViewsResponse = Joi.array().items(Joi.object({
  description: Joi.string().allow(''),
  name: Joi.string().required(),
  url: Joi.string().uri().required()
}));

const userStateResponse = Joi.object({
  autoConnectivity: Joi.string().required(),
  autoScale: Joi.string(),
  alphaTarget: Joi.number().optional(),
  bidirectionalLinks: Joi.boolean().optional(),
  cascadingCollapse: Joi.boolean().required(),
  collisionDistance: Joi.number(),
  currentNode: [Joi.string().required().allow(''), Joi.string().required().allow(null)],
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
  url: Joi.string().uri().required(),
});

const getTwigletInfoByName = (name) => {
  const twigletLookupDb = new PouchDb(config.getTenantDatabaseString('twiglets'));
  return twigletLookupDb.allDocs({ include_docs: true })
    .then((twigletsRaw) => {
      const modelArray = twigletsRaw.rows.filter(row => row.doc.name === name);
      if (modelArray.length) {
        const twiglet = modelArray[0].doc;
        twiglet.originalId = twiglet._id;
        twiglet._id = twiglet._id;
        return twiglet;
      }
      const error = Error('Not Found');
      error.status = 404;
      throw error;
    });
};

const getView = (name, viewName) => {
  const twigletName = name;
  return getTwigletInfoByName(twigletName)
    .then((twigletInfo) => {
      const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
      return db.get('views_2');
    })
    .then((viewsRaw) => {
      if (viewsRaw.data) {
        const viewArray = viewsRaw.data.filter(row => row.name === viewName);
        if (viewArray.length) {
          return viewArray[0];
        }
      }
      const error = Error('Not Found');
      error.status = 404;
      throw error;
    });
};

const getViewsHandler = (request, reply) => {
  getTwigletInfoByName(request.params.twigletName)
    .then((twigletInfo) => {
      const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
      return db.get('views_2');
    })
    .then((viewsRaw) => {
      const views = viewsRaw.data
        .map(item => ({
          description: item.description,
          name: item.name,
          url: request.buildUrl(`/v2/twiglets/${request.params.twigletName}/views/${item.name}`)
        }));
      return reply(views);
    })
    .catch((error) => {
      console.log(error);
      if (error.status === 404) {
        return reply([]).code(200);
      }
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const getViewHandler = (request, reply) => {
  getView(request.params.twigletName, request.params.viewName)
    .then((view) => {
      const viewUrl = `/v2/twiglets/${request.params.twigletName}/views/${request.params.viewName}`;
      const viewResponse = {
        description: view.description,
        links: view.links,
        name: view.name,
        nodes: view.nodes,
        userState: view.userState,
        url: request.buildUrl(viewUrl)
      };
      return reply(viewResponse);
    })
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const postViewsHandler = (request, reply) => {
  let db;
  let twigletId;
  getTwigletInfoByName(request.params.twigletName)
    .then((twigletInfo) => {
      twigletId = twigletInfo._id;
      db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
      return db.get('views_2')
        .catch((error) => {
          if (error.status === 404) {
            return db.put({
              _id: 'views_2',
              data: [],
            })
              .then(() => db.get('views_2'));
          }
          throw error;
        });
    })
    .then((doc) => {
      const viewName = request.payload.name;
      return getView(request.params.twigletName, viewName)
        .then(() => {
          const error = Error('View name already in use');
          error.status = 409;
          throw error;
        })
        .catch((error) => {
          if (error.status === 404) {
            doc.data.push(request.payload);
            return Promise.all([
              db.put(doc),
              Changelog.addCommitMessage(twigletId,
                `View ${request.payload.name} created`,
                request.auth.credentials.user.name),
            ]);
          }
          throw error;
        })
        .then(() => getView(request.params.twigletName, request.payload.name))
        .then((newView) => {
          const viewUrl = `/v2/twiglets/${request.params.twigletName}/views/${request.params.viewName}`;
          const viewResponse = {
            description: newView.description,
            name: newView.name,
            links: newView.links,
            nodes: newView.nodes,
            userState: newView.userState,
            url: request.buildUrl(viewUrl)
          };
          return reply(viewResponse).code(201);
        })
        .catch((e) => {
          logger.error(JSON.stringify(e));
          return reply(Boom.create(e.status || 500, e.message, e));
        });
    })
    .catch((e) => {
      console.log(e);
      logger.error(JSON.stringify(e));
      return reply(Boom.create(e.status || 500, e.message, e));
    });
};

const putViewHandler = (request, reply) => {
  let db;
  let twigletId;
  getTwigletInfoByName(request.params.twigletName)
    .then((twigletInfo) => {
      twigletId = twigletInfo._id;
      db = new PouchDb(config.getTenantDatabaseString(twigletId), { skip_setup: true });
      return db.get('views_2');
    })
    .then((doc) => {
      const viewIndex = doc.data.findIndex(view => view.name === request.params.viewName);
      doc.data[viewIndex] = request.payload;
      if (request.payload.name === request.params.viewName) {
        return Promise.all([
          db.put(doc),
          Changelog.addCommitMessage(twigletId,
            `View ${request.payload.name} edited`,
            request.auth.credentials.user.name),
        ]);
      }
      return Promise.all([
        db.put(doc),
        Changelog.addCommitMessage(twigletId,
          `View ${request.params.viewName} renamed to ${request.payload.name}`,
          request.auth.credentials.user.name),
      ]);
    })
    .then(() => getView(request.params.twigletName, request.payload.name))
    .then((newView) => {
      const viewUrl = `/v2/twiglets/${request.params.twigletName}/views/${request.payload.name}`;
      const viewResponse = {
        description: newView.description,
        links: newView.links,
        name: newView.name,
        nodes: newView.nodes,
        userState: newView.userState,
        url: request.buildUrl(viewUrl)
      };
      return reply(viewResponse).code(200);
    })
    .catch((e) => {
      logger.error(JSON.stringify(e));
      return reply(Boom.create(e.status || 500, e.message, e));
    });
};

const deleteViewHandler = (request, reply) => {
  let db;
  let twigletId;
  getTwigletInfoByName(request.params.twigletName)
    .then((twigletInfo) => {
      twigletId = twigletInfo._id;
      db = new PouchDb(config.getTenantDatabaseString(twigletId), { skip_setup: true });
      return db.get('views_2');
    })
    .then((doc) => {
      const viewIndex = doc.data.findIndex(view => view.name === request.params.viewName);
      doc.data.splice(viewIndex, 1);
      return Promise.all([
        db.put(doc),
        Changelog.addCommitMessage(twigletId,
          `View ${request.params.viewName} deleted`,
          request.auth.credentials.user.name),
      ]);
    })
    .then(() => reply().code(204))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

module.exports.routes = [
  {
    method: ['GET'],
    path: '/v2/twiglets/{twigletName}/views',
    handler: getViewsHandler,
    options: {
      auth: { mode: 'optional' },
      response: { schema: getViewsResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/v2/twiglets/{twigletName}/views/{viewName}',
    handler: getViewHandler,
    options: {
      auth: { mode: 'optional' },
      response: { schema: getViewResponse },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/v2/twiglets/{twigletName}/views/{viewName}',
    handler: putViewHandler,
    options: {
      validate: {
        payload: createViewRequest,
      },
      response: { schema: getViewResponse },
      tags: ['api'],
    }
  },
  {
    method: ['POST'],
    path: '/v2/twiglets/{twigletName}/views',
    handler: postViewsHandler,
    options: {
      validate: {
        payload: createViewRequest,
      },
      response: { schema: getViewResponse },
      tags: ['api'],
    }
  },
  {
    method: ['DELETE'],
    path: '/v2/twiglets/{twigletName}/views/{viewName}',
    handler: deleteViewHandler,
    options: {
      tags: ['api']
    }
  }
];
