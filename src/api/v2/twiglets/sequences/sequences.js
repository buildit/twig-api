'use strict';

const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const uuidV4 = require('uuid/v4');
const HttpStatus = require('http-status-codes');
const logger = require('../../../../log')('SEQUENCES');
const { getContextualConfig } = require('../../../../config');
const { wrapTryCatchWithBoomify } = require('../../helpers');
const { getTwigletInfoAndMakeDB } = require('../../helpers');

const getSequenceResponse = Joi.object({
  description: Joi.string().allow(''),
  id: Joi.string().required(),
  name: Joi.string().required(),
  events: Joi.array().required(),
  url: Joi.string()
    .uri()
    .required(),
});

const getSequencesResponse = Joi.array().items(
  Joi.object({
    description: Joi.string().allow(''),
    events: Joi.array()
      .items(Joi.string())
      .required(),
    name: Joi.string().required(),
    id: Joi.string().required(),
    url: Joi.string()
      .uri()
      .required(),
  }),
);

const createSequenceRequest = Joi.object({
  description: Joi.string().allow(''),
  name: Joi.string().required(),
  events: Joi.array().required(),
});

const getSequence = async (twigletName, sequenceId, contextualConfig) => {
  const { db } = await getTwigletInfoAndMakeDB({ name: twigletName, contextualConfig });
  const sequencesRaw = await db.get('sequences');
  if (sequencesRaw.data) {
    const sequenceArray = sequencesRaw.data.filter(row => row.id === sequenceId);
    if (sequenceArray.length) {
      return sequenceArray[0];
    }
  }
  throw Boom.notFound();
};

const getSequenceDetails = async (twigletName, sequenceId, contextualConfig) => {
  const sequence = await getSequence(twigletName, sequenceId, contextualConfig);
  const eventsMap = sequence.events.reduce((map, eventId) => {
    map[eventId] = true;
    return map;
  }, {});

  const { db } = await getTwigletInfoAndMakeDB({ name: twigletName, contextualConfig });

  const eventsRaw = await db.get('events');
  if (eventsRaw.data) {
    sequence.events = eventsRaw.data.filter(row => eventsMap[row.id]);
    return sequence;
  }

  throw Boom.notFound();
};

const getSequencesHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  try {
    const { db } = await getTwigletInfoAndMakeDB({
      name: request.params.twigletName,
      contextualConfig,
    });
    const sequences = await db.get('sequences');
    const sequencesArray = sequences.data.map(item => ({
      description: item.description,
      events: item.events,
      id: item.id,
      name: item.name,
      url: request.buildUrl(`/v2/twiglets/${request.params.twigletName}/sequences/${item.id}`),
    }));
    return sequencesArray;
  }
  catch (error) {
    if (error.status === 404) {
      return [];
    }
    throw error;
  }
};

const getSequenceHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const sequence = await getSequence(
    request.params.twigletName,
    request.params.sequenceId,
    contextualConfig,
  );
  const { sequenceId } = request.params;
  const sequenceUrl = `/v2/twiglets/${request.params.twigletName}/sequences/${sequenceId}`;
  const sequenceResponse = {
    id: sequence.id,
    description: sequence.description,
    name: sequence.name,
    events: sequence.events,
    url: request.buildUrl(sequenceUrl),
  };
  return sequenceResponse;
};

const getSequenceDetailsHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const sequence = await getSequenceDetails(
    request.params.twigletName,
    request.params.sequenceId,
    contextualConfig,
  );
  const { sequenceId } = request.params;
  const sequenceUrl = `/v2/twiglets/${request.params.twigletName}/sequences/${sequenceId}`;
  const sequenceResponse = {
    id: sequence.id,
    description: sequence.description,
    name: sequence.name,
    events: sequence.events,
    url: request.buildUrl(sequenceUrl),
  };
  return sequenceResponse;
};

function seedWithEmptySequences (db) {
  return async (error) => {
    if (error.status === 404) {
      await db.put({ _id: 'sequences', data: [] });
      const sequences = await db.get('sequences');
      return sequences;
    }
    throw error;
  };
}

function throwIfSequenceNameNotUnique (sequences, name) {
  if (sequences.some(sequence => sequence.name === name)) {
    throw Boom.conflict('sequence name must be unique');
  }
}
const postSequencesHandler = async (request, h) => {
  const contextualConfig = getContextualConfig(request);
  const { db } = await getTwigletInfoAndMakeDB({
    name: request.params.twigletName,
    contextualConfig,
  });
  const doc = await db.get('sequences').catch(seedWithEmptySequences(db));
  throwIfSequenceNameNotUnique(doc.data, request.payload.name);
  request.payload.id = uuidV4();
  doc.data.push(request.payload);
  await db.put(doc);
  const newSequence = await getSequence(
    request.params.twigletName,
    request.payload.id,
    contextualConfig,
  );
  const sequenceUrl = `/v2/twiglets/${request.params.twigletName}/sequences/${newSequence.id}`;
  const sequenceResponse = {
    id: newSequence.id,
    description: newSequence.description,
    name: newSequence.name,
    events: newSequence.events,
    url: request.buildUrl(sequenceUrl),
  };
  return h.response(sequenceResponse).created(sequenceResponse.url);
};

const putSequenceHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const { db } = await getTwigletInfoAndMakeDB({
    name: request.params.twigletName,
    contextualConfig,
  });
  const doc = await db.get('sequences');
  const sequenceIndex = doc.data.findIndex(sequence => sequence.id === request.params.sequenceId);
  doc.data.splice(sequenceIndex, 1);

  throwIfSequenceNameNotUnique(doc.data, request.payload.name);

  request.payload.id = request.params.sequenceId;
  doc.data.push(request.payload);
  await db.put(doc);
  const newSequence = await getSequence(
    request.params.twigletName,
    request.params.sequenceId,
    contextualConfig,
  );
  const { sequenceId } = request.params;
  const sequenceUrl = `/v2/twiglets/${request.params.twigletName}/sequences/${sequenceId}`;
  const sequenceResponse = {
    id: newSequence.id,
    description: newSequence.description,
    name: newSequence.name,
    events: newSequence.events,
    url: request.buildUrl(sequenceUrl),
  };
  return sequenceResponse;
};

const deleteSequenceHandler = async (request, h) => {
  const contextualConfig = getContextualConfig(request);
  const { db } = await getTwigletInfoAndMakeDB({
    name: request.params.twigletName,
    contextualConfig,
  });
  const doc = await db.get('sequences');
  const sequenceIndex = doc.data.findIndex(sequence => sequence.id === request.params.sequenceId);
  doc.data.splice(sequenceIndex, 1);
  await db.put(doc);
  return h.response().code(HttpStatus.NO_CONTENT);
};

module.exports.routes = [
  {
    method: ['GET'],
    path: '/v2/twiglets/{twigletName}/sequences',
    handler: wrapTryCatchWithBoomify(logger, getSequencesHandler),
    options: {
      auth: {
        mode: 'optional',
      },
      response: {
        schema: getSequencesResponse,
      },
      tags: ['api'],
    },
  },
  {
    method: ['GET'],
    path: '/v2/twiglets/{twigletName}/sequences/{sequenceId}',
    handler: wrapTryCatchWithBoomify(logger, getSequenceHandler),
    options: {
      auth: {
        mode: 'optional',
      },
      response: {
        schema: getSequenceResponse,
      },
      tags: ['api'],
    },
  },
  {
    method: ['GET'],
    path: '/v2/twiglets/{twigletName}/sequences/{sequenceId}/details',
    handler: wrapTryCatchWithBoomify(logger, getSequenceDetailsHandler),
    options: {
      auth: {
        mode: 'optional',
      },
      // response: { schema: getSequenceResponse },
      tags: ['api'],
    },
  },
  {
    method: ['POST'],
    path: '/v2/twiglets/{twigletName}/sequences',
    handler: wrapTryCatchWithBoomify(logger, postSequencesHandler),
    options: {
      validate: {
        payload: createSequenceRequest,
      },
      response: {
        schema: getSequenceResponse,
      },
      tags: ['api'],
    },
  },
  {
    method: ['PUT'],
    path: '/v2/twiglets/{twigletName}/sequences/{sequenceId}',
    handler: wrapTryCatchWithBoomify(logger, putSequenceHandler),
    options: {
      validate: {
        payload: createSequenceRequest,
      },
      response: {
        schema: getSequenceResponse,
      },
      tags: ['api'],
    },
  },
  {
    method: ['DELETE'],
    path: '/v2/twiglets/{twigletName}/sequences/{sequenceId}',
    handler: wrapTryCatchWithBoomify(logger, deleteSequenceHandler),
    options: {
      tags: ['api'],
    },
  },
];
