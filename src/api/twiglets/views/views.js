'use strict';
const Boom = require('boom');
const Joi = require('joi');
const PouchDb = require('pouchdb');
const config = require('../../../config');
const logger = require('../../../log')('VIEWS');
const Changelog = require('../changelog');

const updateViewRequest = Joi.object({
  _rev: Joi.string().required(),
});

const getViewsResponse = Joi.array().items(Joi.object({
  name: Joi.string().required(),
  url: Joi.string().uri().required()
}));

const userStateResponse = Joi.object({
  autoConnectivity: Joi.string().required(),
  autoScale: Joi.string().required(),
  bidirectionalLinks: Joi.boolean().required(),
  cascadingCollapse: Joi.boolean().required(),
  currentNode: Joi.string().required().allow(null),
  filters: Joi.object({
    attributes: Joi.array().required(),
    types: Joi.object().required(),
  }),
  forceChargeStrength: Joi.number().required(),
  forceGravityX: Joi.number().required(),
  forceGravityY: Joi.number().required(),
  forceLinkDistance: Joi.number().required(),
  forceLinkStrength: Joi.number().required(),
  forceVelocityDecay: Joi.number().required(),
  linkType: Joi.string().required(),
  nodeSizingAutomatic: Joi.boolean().required(),
  scale: Joi.number().required(),
  showLinkLabels: Joi.boolean().required(),
  showNodeLabels: Joi.boolean().required(),
  treeMode: Joi.boolean().required(),
  traverseDepth: Joi.number().required(),
});

const createViewRequest = Joi.object({
  description: Joi.string().allow(''),
  name: Joi.string().required(),
  userState: userStateResponse.required(),
});

const getViewResponse = createViewRequest.keys({
  description: Joi.string().required().allow(''),
  url: Joi.string().uri().required(),
});


const getTwigletInfoByName = (name) => {
  const twigletLookupDb = new PouchDb(config.getTenantDatabaseString('twiglets'));
  return twigletLookupDb.allDocs({ include_docs: true })
  .then(twigletsRaw => {
    const modelArray = twigletsRaw.rows.filter(row => row.doc.name === name);
    if (modelArray.length) {
      const twiglet = modelArray[0].doc;
      twiglet.originalId = twiglet._id;
      twiglet._id = `twig-${twiglet._id}`;
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
  .then(twigletInfo => {
    const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('views');
  })
  .then(viewsRaw => {
    const viewArray = viewsRaw.data.filter(row => row.name === viewName);
    if (viewArray.length) {
      return viewArray[0];
    }
    const error = Error('Not Found');
    error.status = 404;
    throw error;
  });
};

const getViewsHandler = (request, reply) => {
  getTwigletInfoByName(request.params.twigletName)
  .then(twigletInfo => {
    const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('views');
  })
  .then((viewsRaw) => {
    const views = viewsRaw.data
    .map(item =>
      ({
        name: item.name,
        url: request.buildUrl(`/twiglets/${request.params.twigletName}/views/${item.name}`)
      })
    );
    return reply(views);
  })
  .catch((error) => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });
};

const getViewHandler = (request, reply) => {
  getView(request.params.twigletName, request.params.viewName)
    .then(view => {
      const viewUrl = `/twiglets/${request.params.twigletName}/views/${request.params.viewName}`;
      const viewResponse = {
        description: view.description,
        name: view.name,
        userState: view.userState,
        url: request.buildUrl(viewUrl)
      };
      return reply(viewResponse);
    })
    .catch(error => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const postViewsHandler = (request, reply) => {
  let db;
  let twigletId;
  getTwigletInfoByName(request.params.twigletName)
  .then(twigletInfo => {
    twigletId = twigletInfo._id;
    db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('views');
  })
  .then((doc) => {
    const viewName = request.payload.name;
    return getView(request.params.twigletName, viewName)
    .then(() => {
      const error = Error('View name already in use');
      error.status = 409;
      throw error;
    })
    .catch(error => {
      if (error.status === 404) {
        const viewToCreate = {
          description: request.payload.description,
          name: request.payload.name,
          userState: request.payload.userState,
        };
        doc.data.push(viewToCreate);
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
    .then(newView => {
      const viewUrl = `/twiglets/${request.params.twigletName}/views/${request.params.viewName}`;
      const viewResponse = {
        description: newView.description,
        name: newView.name,
        userState: newView.userState,
        url: request.buildUrl(viewUrl)
      };
      return reply(viewResponse).code(201);
    })
    .catch(e => {
      logger.error(JSON.stringify(e));
      return reply(Boom.create(e.status || 500, e.message, e));
    });
  })
  .catch(e => {
    logger.error(JSON.stringify(e));
    return reply(Boom.create(e.status || 500, e.message, e));
  });
};

module.exports.routes = [
  {
    method: ['GET'],
    path: '/twiglets/{twigletName}/views',
    handler: getViewsHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getViewsResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/twiglets/{twigletName}/views/{viewName}',
    handler: getViewHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getViewResponse },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/twiglets/{twigletName}/views/{viewName}',
    handler: (request, reply) => reply(Boom.notImplemented()),
    config: {
      validate: {
        payload: updateViewRequest,
      },
      response: { schema: getViewResponse },
      tags: ['api'],
    }
  },
  {
    method: ['POST'],
    path: '/twiglets/{twigletName}/views',
    handler: postViewsHandler,
    config: {
      validate: {
        payload: createViewRequest,
      },
      response: { schema: getViewResponse },
      tags: ['api'],
    }
  }
];
