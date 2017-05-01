'use strict';
const Boom = require('boom');
const Joi = require('joi');
const PouchDb = require('pouchdb');
const config = require('../../../../config');
const logger = require('../../../../log')('EVENTS');
const uuidV4 = require('uuid/v4');

const getEventsResponse = Joi.array().items(Joi.object({
  description: Joi.string().required().allow(''),
  name: Joi.string().required(),
  id: Joi.string().required(),
  url: Joi.string().uri().required()
}));

const attributes = Joi.array().items(Joi.object({
  key: Joi.string().required(),
  value: Joi.any(),
}));

const linksResponse = Joi.object({
  association: Joi.string(),
  id: Joi.string().required(),
  source: Joi.string().required(),
  target: Joi.string().required(),
  attrs: attributes,
});

const nodesResponse = Joi.object({
  id: Joi.string().required(),
  location: Joi.string().required().allow(''),
  name: Joi.string().required(),
  type: Joi.string().required(),
  x: Joi.number().required(),
  y: Joi.number().required(),
  attrs: attributes
});

const createEventRequest = Joi.object({
  description: Joi.string().allow(''),
  links: Joi.array().items(linksResponse),
  name: Joi.string().required(),
  nodes: Joi.array().items(nodesResponse),
});

const getEventResponse = createEventRequest.keys({
  url: Joi.string().uri().required(),
  id: Joi.string().required(),
});

const getTwigletInfoByName = (name) => {
  const twigletLookupDb = new PouchDb(config.getTenantDatabaseString('twiglets'));
  return twigletLookupDb.allDocs({ include_docs: true })
  .then(twigletsRaw => {
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

const getEvent = (twigletName, eventId) =>
  getTwigletInfoByName(twigletName)
  .then(twigletInfo => {
    const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('events');
  })
  .then(eventsRaw => {
    if (eventsRaw.data) {
      const eventArray = eventsRaw.data.filter(row => row.id === eventId);
      if (eventArray.length) {
        return eventArray[0];
      }
    }
    const error = Error('Not Found');
    error.status = 404;
    throw error;
  });

const getEventsHandler = (request, reply) =>
  getTwigletInfoByName(request.params.twigletName)
  .then(twigletInfo => {
    const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('events');
  })
  .then((events) => {
    const eventsArray = events.data
    .map(item =>
      ({
        id: item.id,
        name: item.name,
        description: item.description,
        url: request.buildUrl(`/v2/twiglets/${request.params.twigletName}/events/${item.id}`)
      })
    );
    return reply(eventsArray);
  })
  .catch((error) => {
    if (error.status === 404) {
      return reply([]).code(200);
    }
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });

const getEventHandler = (request, reply) =>
  getEvent(request.params.twigletName, request.params.eventId)
  .then(event => {
    const eventUrl = `/v2/twiglets/${request.params.twigletName}/events/${request.params.eventId}`;
    const eventResponse = {
      id: event.id,
      description: event.description,
      links: event.links,
      name: event.name,
      nodes: event.nodes,
      url: request.buildUrl(eventUrl)
    };
    return reply(eventResponse);
  })
  .catch(error => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });

const postEventsHandler = (request, reply) => {
  let db;
  return getTwigletInfoByName(request.params.twigletName)
  .then(twigletInfo => {
    db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('events')
    .catch(error => {
      if (error.status === 404) {
        return db.put({
          _id: 'events',
          data: [],
        })
        .then(() => db.get('events'));
      }
      throw error;
    });
  })
  .then((doc) => {
    request.payload.id = uuidV4();
    doc.data.push(request.payload);
    return db.put(doc);
  })
  .then(() => reply('OK').code(201))
  .catch(e => {
    logger.error(JSON.stringify(e));
    return reply(Boom.create(e.status || 500, e.message, e));
  });
};

const deleteEventHandler = (request, reply) => {
  let db;
  let twigletId;
  getTwigletInfoByName(request.params.twigletName)
  .then(twigletInfo => {
    twigletId = twigletInfo._id;
    db = new PouchDb(config.getTenantDatabaseString(twigletId), { skip_setup: true });
    return db.get('events');
  })
  .then((doc) => {
    const eventIndex = doc.data.findIndex(event => event.id === request.params.eventId);
    doc.data.splice(eventIndex, 1);
    return Promise.all([
      db.put(doc)
    ]);
  })
  .then(() => reply().code(204))
  .catch(error => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });
};

module.exports.routes = [
  {
    method: ['GET'],
    path: '/v2/twiglets/{twigletName}/events',
    handler: getEventsHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getEventsResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/v2/twiglets/{twigletName}/events/{eventId}',
    handler: getEventHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getEventResponse },
      tags: ['api'],
    }
  },
  {
    method: ['POST'],
    path: '/v2/twiglets/{twigletName}/events',
    handler: postEventsHandler,
    config: {
      validate: {
        payload: createEventRequest,
      },
      response: { schema: Joi.string() },
      tags: ['api'],
    }
  },
  {
    method: ['DELETE'],
    path: '/v2/twiglets/{twigletName}/events/{eventId}',
    handler: deleteEventHandler,
    config: {
      tags: ['api']
    }
  }
];
