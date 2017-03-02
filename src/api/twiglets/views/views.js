'use strict';
const Boom = require('boom');
const Joi = require('joi');
const PouchDb = require('pouchdb');
const config = require('../../../config');
const logger = require('../../../log')('VIEWS');

const updateViewRequest = Joi.object({
  _rev: Joi.string().required(),
});

const getViewsResponse = Joi.array().items(Joi.object({
  _rev: Joi.string().required(),
  description: Joi.string().required().allow(''),
  name: Joi.string().required(),
  url: Joi.string().uri().required()
}));

const getViewResponse = updateViewRequest.keys({
  _rev: Joi.string().required(),
  collapsed_nodes: Joi.array().required().allow([]),
  description: Joi.string().required().allow(''),
  display_name: Joi.string().required().allow(''),
  fixed_nodes: Joi.object().required().allow({}),
  link_types: Joi.object().required().allow({}),
  name: Joi.string().required(),
  nav: Joi.object({
    'date-slider': Joi.number(),
    scale: Joi.string(),
    'show-node-label': Joi.boolean(),
  }),
  node_types: Joi.object().required().allow({}),
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
    const viewArray = viewsRaw.data.filter(row => row.data.name === viewName);
    if (viewArray.length) {
      return viewArray[0];
    }
    const error = Error('Not Found');
    error.status = 404;
    throw error;
  });
};

const getViewsHandler = (request, reply) => {
  getTwigletInfoByName(request.params.name)
  .then(twigletInfo => {
    const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('views');
  })
  .then(viewsRaw => {
    const views = viewsRaw.data
    .map(item =>
      ({
        _rev: item._rev,
        description: item.description,
        name: item.name,
        url: request.buildUrl(`/twiglets/${request.params.name}/views/${item.name}`)
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
  getView(request.params.name, request.params.viewName)
    .then(view => {
      const viewResponse = {
        _rev: view._rev,
        collapsed_nodes: view.data.collapsed_nodes,
        description: view.data.description,
        display_name: view.data.display_name,
        fixed_nodes: view.data.fixed_nodes,
        link_types: view.data.link_types,
        name: view.data.name,
        nav: {
          'date-slider': view.data.nav['date-slider'],
          scale: view.data.nav.scale,
          'show-node-label': view.data.nav['show-node-label']
        },
        node_types: view.data.node_types,
        url: request.buildUrl(`/twiglets/${request.params.name}/views/${request.params.viewName}`)
      };
      return reply(viewResponse);
    })
    .catch(error => {
      console.log(error);
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

module.exports.routes = [
  {
    method: ['GET'],
    path: '/twiglets/{name}/views',
    handler: getViewsHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getViewsResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/twiglets/{name}/views/{viewName}',
    handler: getViewHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getViewResponse },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/twiglets/{id}/views',
    handler: (request, reply) => reply(Boom.notImplemented()),
    config: {
      validate: {
        payload: updateViewRequest,
      },
      response: { schema: getViewsResponse },
      tags: ['api'],
    }
  },
];
