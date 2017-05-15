'use strict';
const Boom = require('boom');
const Joi = require('joi');
const PouchDb = require('pouchdb');
const config = require('../../../../config');
const logger = require('../../../../log')('SEQUENCES');
const uuidV4 = require('uuid/v4');

const getSequenceResponse = Joi.object({
  description: Joi.string().allow(''),
  id: Joi.string().required(),
  name: Joi.string().required(),
  events: Joi.array().required(),
  url: Joi.string().uri().required(),
});

const getSequencesResponse = Joi.array().items(Joi.object({
  description: Joi.string().allow(''),
  events: Joi.array(Joi.string()).required(),
  name: Joi.string().required(),
  id: Joi.string().required(),
  url: Joi.string().uri().required(),
}));

const createSequenceRequest = Joi.object({
  description: Joi.string().allow(''),
  name: Joi.string().required(),
  events: Joi.array().required(),
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

const getSequence = (twigletName, sequenceId) =>
  getTwigletInfoByName(twigletName)
  .then(twigletInfo => {
    const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('sequences');
  })
  .then(sequencesRaw => {
    if (sequencesRaw.data) {
      const sequenceArray = sequencesRaw.data.filter(row => row.id === sequenceId);
      if (sequenceArray.length) {
        return sequenceArray[0];
      }
    }
    const error = Error('Not found');
    error.status = 404;
    throw error;
  });

const getSequencesHandler = (request, reply) =>
  getTwigletInfoByName(request.params.twigletName)
  .then(twigletInfo => {
    const db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('sequences');
  })
  .then((sequences) => {
    const sequencesArray = sequences.data
    .map(item =>
      ({
        description: item.description,
        events: item.events,
        id: item.id,
        name: item.name,
        url: request.buildUrl(`/v2/twiglets/${request.params.twigletName}/sequences/${item.id}`)
      })
    );
    return reply(sequencesArray);
  })
  .catch((error) => {
    if (error.status === 404) {
      return reply([]).code(200);
    }
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });

const getSequenceHandler = (request, reply) =>
  getSequence(request.params.twigletName, request.params.sequenceId)
  .then(sequence => {
    const sequenceId = request.params.sequenceId;
    const sequenceUrl = `/v2/twiglets/${request.params.twigletName}/sequences/${sequenceId}`;
    const sequenceResponse = {
      id: sequence.id,
      description: sequence.description,
      name: sequence.name,
      events: sequence.events,
      url: request.buildUrl(sequenceUrl)
    };
    return reply(sequenceResponse);
  })
  .catch(error => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });

const postSequencesHanlder = (request, reply) => {
  let db;
  return getTwigletInfoByName(request.params.twigletName)
  .then(twigletInfo => {
    db = new PouchDb(config.getTenantDatabaseString(twigletInfo._id), { skip_setup: true });
    return db.get('sequences')
    .catch(error => {
      if (error.status === 404) {
        return db.put({
          _id: 'sequences',
          data: [],
        })
        .then(() => db.get('sequences'));
      }
      throw error;
    });
  })
  .then((doc) => {
    request.payload.id = uuidV4();
    doc.data.push(request.payload);
    return db.put(doc);
  })
  .then(() => getSequence(request.params.twigletName, request.payload.id))
  .then((newSequence) => {
    const sequenceUrl = `/v2/twiglets/${request.params.twigletName}/sequences/${newSequence.id}`;
    const sequenceResponse = {
      id: newSequence.id,
      description: newSequence.description,
      name: newSequence.name,
      events: newSequence.events,
      url: request.buildUrl(sequenceUrl),
    };
    return reply(sequenceResponse).code(201);
  })
  .catch(e => {
    logger.error(JSON.stringify(e));
    return reply(Boom.create(e.status || 500, e.message, e));
  });
};

const putSequenceHandler = (request, reply) => {
  let db;
  let twigletId;
  getTwigletInfoByName(request.params.twigletName)
  .then(twigletInfo => {
    twigletId = twigletInfo._id;
    db = new PouchDb(config.getTenantDatabaseString(twigletId), { skip_setup: true });
    return db.get('sequences');
  })
  .then((doc) => {
    const sequenceIndex = doc.data.findIndex(sequence => sequence.id === request.params.sequenceId);
    request.payload.id = request.params.sequenceId;
    doc.data[sequenceIndex] = request.payload;
    return Promise.all([
      db.put(doc)
    ]);
  })
  .then(() => getSequence(request.params.twigletName, request.params.sequenceId))
  .then((newSequence) => {
    const sequenceId = request.params.sequenceId;
    const sequenceUrl = `/v2/twiglets/${request.params.twigletName}/sequences/${sequenceId}`;
    const sequenceResponse = {
      id: newSequence.id,
      description: newSequence.description,
      name: newSequence.name,
      events: newSequence.events,
      url: request.buildUrl(sequenceUrl)
    };
    return reply(sequenceResponse).code(200);
  })
  .catch(e => {
    logger.error(JSON.stringify(e));
    return reply(Boom.create(e.status || 500, e.message, e));
  });
};

const deleteSequenceHandler = (request, reply) => {
  let db;
  let twigletId;
  getTwigletInfoByName(request.params.twigletName)
  .then(twigletInfo => {
    twigletId = twigletInfo._id;
    db = new PouchDb(config.getTenantDatabaseString(twigletId), { skip_setup: true });
    return db.get('sequences');
  })
  .then((doc) => {
    const sequenceIndex = doc.data.findIndex(sequence => sequence.id === request.params.sequenceId);
    doc.data.splice(sequenceIndex, 1);
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
    path: '/v2/twiglets/{twigletName}/sequences',
    handler: getSequencesHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getSequencesResponse },
      tags: ['api'],
    }
  },
  {
    method: ['GET'],
    path: '/v2/twiglets/{twigletName}/sequences/{sequenceId}',
    handler: getSequenceHandler,
    config: {
      auth: { mode: 'optional' },
      response: { schema: getSequenceResponse },
      tags: ['api'],
    }
  },
  {
    method: ['POST'],
    path: '/v2/twiglets/{twigletName}/sequences',
    handler: postSequencesHanlder,
    config: {
      validate: {
        payload: createSequenceRequest,
      },
      response: { schema: getSequenceResponse },
      tags: ['api'],
    }
  },
  {
    method: ['PUT'],
    path: '/v2/twiglets/{twigletName}/sequences/{sequenceId}',
    handler: putSequenceHandler,
    config: {
      validate: {
        payload: createSequenceRequest,
      },
      response: { schema: getSequenceResponse },
      tags: ['api'],
    }
  },
  {
    method: ['DELETE'],
    path: '/v2/twiglets/{twigletName}/sequences/{sequenceId}',
    handler: deleteSequenceHandler,
    config: {
      tags: ['api']
    }
  }
];
