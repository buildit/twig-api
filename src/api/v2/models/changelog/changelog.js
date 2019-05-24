'use strict';

const Joi = require('@hapi/joi');
const logger = require('../../../../log')('CHANGELOG');
const { getModel } = require('../models.js');
const { wrapTryCatchWithBoomify } = require('../../helpers');
const { getContextualConfig } = require('../../../../config');

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
        replacement: Joi.bool()
      })
    )
});

const getChangelogHandler = async (request) => {
  const contextualConfig = getContextualConfig(request);
  const doc = await getModel(request.params.name, contextualConfig);
  return { changelog: doc.data.changelog };
};

const routes = [
  {
    method: ['GET'],
    path: '/v2/models/{name}/changelog',
    handler: wrapTryCatchWithBoomify(logger, getChangelogHandler),
    options: {
      auth: { mode: 'optional' },
      response: { schema: getChangelogResponse },
      tags: ['api']
    }
  }
];

module.exports = { routes };
