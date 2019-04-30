'use strict';

const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const PouchDb = require('pouchdb');
const uuidV4 = require('uuid/v4');
const R = require('ramda');
const HttpStatus = require('http-status-codes');
const { getContextualConfig } = require('../../../../config');
const logger = require('../../../../log')('EVENTS');
const { getTwigletInfoByName } = require('../twiglets.helpers');
const { wrapTryCatchWithBoomify } = require('../../helpers');

const getEventsResponse = Joi.array().items(Joi.object({
  description: Joi.string().allow(''),
  id: Joi.string().required(),
  name: Joi.string().required(),
  url: Joi.string().uri().required()
}));

const Event = Joi.object({
  description: Joi.string().allow('').description('a description of the event'),
  name: Joi.string().required().description('the name of the event, eg "Ben got fired"'),
});

const attributes = Joi.array().items(Joi.object({
  key: Joi.string().required(),
  value: Joi.any(),
}));

const Link = Joi.object({
  _color: Joi.string(),
  _size: Joi.number(),
  attrs: attributes,
  association: Joi.string(),
  id: Joi.string().required(),
  source: Joi.string().required(),
  target: Joi.string().required(),
});

const Node = Joi.object({
  attrs: attributes,
  id: [Joi.string().required(), Joi.number().required()],
  location: Joi.string().allow('').allow(null),
  name: Joi.string().required(),
  type: Joi.string().required(),
  x: Joi.number(),
  y: Joi.number(),
  _color: Joi.string(),
  _icon: Joi.string(),
  _image: Joi.string(),
  _size: Joi.number(),
});

const getEventResponse = Event.keys({
  links: Joi.array().items(Link),
  nodes: Joi.array().items(Node),
  url: Joi.string().uri().required(),
  id: Joi.string().required(),
});


const getEvent = async (twigletName, eventId, contextualConfig) => {
  const twigletInfo = await getTwigletInfoByName(twigletName, contextualConfig);
  const db = new PouchDb(contextualConfig.getTenantDatabaseString(twigletInfo._id),
    { skip_setup: true });
  const eventsRaw = await db.get('events');
  if (eventsRaw.data) {
    const eventArray = eventsRaw.data.filter(row => row.id === eventId);
    if (eventArray.length) {
      return eventArray[0];
    }
  }
  throw Boom.notFound();
};

const getEventsHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  try {
    const twigletInfo = await getTwigletInfoByName(request.params.twigletName, contextualConfig);
    const db = new PouchDb(contextualConfig.getTenantDatabaseString(twigletInfo._id),
      { skip_setup: true });
    const events = await db.get('events');
    const eventsArray = events.data
      .map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        url: request.buildUrl(`/v2/twiglets/${request.params.twigletName}/events/${item.id}`)
      }));
    return eventsArray;
  }
  catch (error) {
    if (error.status === HttpStatus.NOT_FOUND) {
      return [];
    }
    throw error;
  }
};

const getEventHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const event = await getEvent(request.params.twigletName, request.params.eventId,
    contextualConfig);
  const eventUrl = `/v2/twiglets/${request.params.twigletName}/events/${request.params.eventId}`;
  const eventResponse = {
    id: event.id,
    description: event.description,
    links: event.links,
    name: event.name,
    nodes: event.nodes,
    url: request.buildUrl(eventUrl)
  };
  return eventResponse;
};

function seedWithEmptyEvents (db) {
  return (error) => {
    if (error.status === 404) {
      return db.put({
        _id: 'events',
        data: [],
      })
        .then(() => db.get('events'));
    }
    throw error;
  };
}

const postEventsHandler = async (request, h) => {
  const contextualConfig = getContextualConfig(request);
  const twigletInfo = await getTwigletInfoByName(request.params.twigletName, contextualConfig);
  const db = new PouchDb(contextualConfig.getTenantDatabaseString(twigletInfo._id),
    { skip_setup: true });
  const doc = await db.get('events').catch(seedWithEmptyEvents(db));
  if (doc.data.some(event => event.name === request.payload.name)) {
    throw Boom.conflict('Event Name must be unique');
  }
  const newEvent = R.merge({}, request.payload);
  const twigletDocs = await db.allDocs({ include_docs: true, keys: ['nodes', 'links'] });
  const nodeKeysToKeep = [
    'attrs',
    'id',
    'location',
    'name',
    'type',
    'x',
    'y',
    '_color',
    '_size'
  ];
  newEvent.id = uuidV4();
  newEvent.nodes = twigletDocs.rows[0].doc.data.map(R.pick(nodeKeysToKeep));
  newEvent.links = twigletDocs.rows[1].doc.data;
  doc.data.push(newEvent);
  await db.put(doc);
  return h.response('OK').code(HttpStatus.CREATED);
};

const deleteEventHandler = async (request, h) => {
  const contextualConfig = getContextualConfig(request);
  const twigletInfo = await getTwigletInfoByName(request.params.twigletName, contextualConfig);
  const db = new PouchDb(contextualConfig.getTenantDatabaseString(twigletInfo._id),
    { skip_setup: true });
  const doc = await db.get('events');
  const eventIndex = doc.data.findIndex(event => event.id === request.params.eventId);
  doc.data.splice(eventIndex, 1);
  await db.put(doc);
  return h.response().code(HttpStatus.NO_CONTENT);
};

const deleteAllEventsHandler = async (request, h) => {
  const contextualConfig = getContextualConfig(request);
  try {
    const twigletInfo = await getTwigletInfoByName(request.params.twigletName, contextualConfig);
    const db = new PouchDb(contextualConfig.getTenantDatabaseString(twigletInfo._id),
      { skip_setup: true });
    const events = await db.get('events');
    await db.remove(events._id, events._rev);
    return h.response().code(HttpStatus.NO_CONTENT);
  }
  catch (error) {
    if (error.status === 404) {
      return h.response().code(HttpStatus.NO_CONTENT);
    }
    throw error;
  }
};

module.exports = {
  routes: [
    {
      method: ['GET'],
      path: '/v2/twiglets/{twigletName}/events',
      handler: wrapTryCatchWithBoomify(logger, getEventsHandler),
      options: {
        auth: { mode: 'optional' },
        response: { schema: getEventsResponse },
        tags: ['api'],
      }
    },
    {
      method: ['GET'],
      path: '/v2/twiglets/{twigletName}/events/{eventId}',
      handler: wrapTryCatchWithBoomify(logger, getEventHandler),
      options: {
        auth: { mode: 'optional' },
        response: { schema: getEventResponse },
        tags: ['api'],
      }
    },
    {
      method: ['POST'],
      path: '/v2/twiglets/{twigletName}/events',
      handler: wrapTryCatchWithBoomify(logger, postEventsHandler),
      options: {
        validate: {
          payload: Event,
        },
        response: { schema: Joi.string() },
        tags: ['api'],
      }
    },
    {
      method: ['DELETE'],
      path: '/v2/twiglets/{twigletName}/events/{eventId}',
      handler: wrapTryCatchWithBoomify(logger, deleteEventHandler),
      options: {
        tags: ['api']
      }
    },
    {
      method: ['DELETE'],
      path: '/v2/twiglets/{twigletName}/events',
      handler: wrapTryCatchWithBoomify(logger, deleteAllEventsHandler),
      options: {
        tags: ['api']
      }
    }
  ],
};
