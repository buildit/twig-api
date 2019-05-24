'use strict';

const PouchDb = require('pouchdb');
const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const toJSON = require('utils-error-to-json');
const { getContextualConfig } = require('../../../../config');
const logger = require('../../../../log')('CHANGELOG');
const { getTwigletInfoAndMakeDB } = require('../../helpers');

// probably want to return raw array rather than object (been flipping on this)
// but that would now be a breaking change
// thinking was object because that is extensible to include paging metadata
// but now maybe it's better to use Link headers (this is what GitHub does)
const getChangelogResponse = Joi.object({
  changelog: Joi.array()
    .required()
    .items(
      Joi.object({
        message: Joi.string().required(),
        user: Joi.string().required(),
        timestamp: Joi.date().iso(),
      }),
    ),
});

function createInitialChangelogIfNeeded (error) {
  if (error.status !== 404) {
    throw error;
  }
  return { _id: 'changelog', data: [] };
}

async function addCommitMessage (
  contextualConfig,
  _id,
  commitMessage,
  user,
  replacement,
  timestamp = new Date().toISOString(),
) {
  const db = new PouchDb(contextualConfig.getTenantDatabaseString(_id));
  try {
    const doc = await db.get('changelog').catch(createInitialChangelogIfNeeded);
    const commit = {
      message: commitMessage,
      user,
      timestamp,
    };
    if (replacement) {
      const replacementCommit = {
        message: '--- previous change overwritten ---',
        user,
        timestamp,
      };
      doc.data.unshift(replacementCommit);
    }
    doc.data.unshift(commit);
    return db.put(doc);
  }
  catch (error) {
    if (error.status !== 404) {
      logger.error(toJSON(error));
      throw error;
    }
    return { _id: 'changelog', data: [] };
  }
}

const getChangelogHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  try {
    const { twigletInfoOrError, db } = await getTwigletInfoAndMakeDB({
      name: request.params.name,
      contextualConfig,
    });
    if (twigletInfoOrError._id) {
      const doc = await db.get('changelog');
      return { changelog: doc.data };
    }
    return Boom.boomify(twigletInfoOrError);
  }
  catch (error) {
    if (error.status !== 404) {
      logger.error(JSON.stringify(error));
      throw Boom.boomify(error);
    }
    return { changelog: [] };
  }
};

const routes = [
  {
    method: ['GET'],
    path: '/v2/twiglets/{name}/changelog',
    handler: getChangelogHandler,
    options: {
      auth: { mode: 'optional' },
      response: { schema: getChangelogResponse },
      tags: ['api'],
    },
  },
];

module.exports = { routes, addCommitMessage };
