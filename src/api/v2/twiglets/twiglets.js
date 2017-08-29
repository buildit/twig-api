'use strict';
const Boom = require('boom');
const Joi = require('joi');
const R = require('ramda');
const PouchDB = require('pouchdb');
const uuidV4 = require('uuid/v4');
const config = require('../../../config');
const logger = require('../../../log')('TWIGLETS');
const Changelog = require('./changelog');
const Model = require('../models/');

const createTwigletRequest = Joi.object({
  name: Joi.string().required().description('the name of the twiglet'),
  description: Joi.string().required().allow('').description('a description of the twiglet'),
  model: Joi.string().required().description('the model name to use'),
  json: Joi.string().allow('').description('a json file to import the twiglet from'),
  cloneTwiglet: Joi.string().allow('').description('twiglet name to copy from'),
  googlesheet: Joi.string().uri().allow('').description('google sheet to pull from')
    .disallow(),
  commitMessage: Joi.string().required().description('the initial commit message'),
}).label('Twiglet Creation Request');

const attributes = Joi.array().items(Joi.object({
  key: Joi.string().required(),
  value: Joi.any(),
}).label('attribute'));

const Link = Joi.object({
  attrs: attributes.description('non-graphical attributes such as phone number'),
  association: Joi.string().allow('').description('the name of the link'),
  id: Joi.string().required().description('an id, use UUIDv4, etc to generate'),
  source: Joi.string().required().description('the id of the source node'),
  target: Joi.string().required().description('the id of the target node'),
  _color: Joi.string().description('overrides the default color of the link'),
  _size: Joi.number().description('overrides the default thickness of the link')
}).label('Link');

const Node = Joi.object({
  attrs: attributes.description('non-graphical attributes such as phone number'),
  id: [
    Joi.string().required().description('an id, use UUIDv4, etc to generate'),
    Joi.number().required().description('an id, use UUIDv4, etc to generate'),
  ],
  location: Joi.string().allow('').allow(null).description('physical location, eg Denver, CO, USA'),
  name: [
    Joi.string().allow('').required().description('the name of the node'),
    Joi.string().required().allow(null).description('the name of the node')
  ],
  type: Joi.string().required().description('the model type of the node'),
  x: Joi.number().description('the horizontal position of the node'),
  y: Joi.number().description('the vertical position of the node'),
  _color: Joi.string().description('overrides the model color of the node'),
  _size: Joi.number().description('overrides the model size of the node'),
}).label('Node');

const jsonTwigletRequest = Joi.object({
  nodes: Joi.array().items(Node).description('an array of nodes').required(),
  links: Joi.array().items(Link).description('an array of links').required(),
  model: Joi.object({
    entities: Joi.object().pattern(/[\S\s]*/, Joi.object({
      type: Joi.string(),
      color: Joi.string(),
      size: [Joi.string().allow(''), Joi.number()],
      class: Joi.string().required(),
      image: Joi.string().required(),
      attributes: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        dataType: Joi.string().required(),
        required: Joi.bool().required(),
      })).description('the entities of the model').required(),
    }).required()),
  }).required(),
  views: Joi.array(Joi.object({
    links: Joi.object().required(),
    name: Joi.string().required(),
    nodes: Joi.object().required(),
    userState: Joi.object({
      autoConnectivity: Joi.string().required(),
      autoScale: Joi.string().required(),
      cascadingCollapse: Joi.boolean().required(),
      currentNode: [Joi.string().required().allow(''), Joi.string().required().allow(null)],
      filters: Joi.object().required(),
      forceChargeStrength: Joi.number().required(),
      forceGravityX: Joi.number().required(),
      forceGravityY: Joi.number().required(),
      forceLinkDistance: Joi.number().required(),
      forceLinkStrength: Joi.number().required(),
      forceVelocityDecay: Joi.number().required(),
      gravityPoints: Joi.object(),
      linkType: Joi.string().required(),
      nodeSizingAutomatic: Joi.boolean().required(),
      scale: Joi.number().required(),
      showLinkLabels: Joi.boolean().required(),
      showNodeLabels: Joi.boolean().required(),
      treeMode: Joi.boolean().required(),
      traverseDepth: Joi.number().required(),
    })
  })).required(),
  events: Joi.array(Joi.object({
    description: Joi.string().required().allow(''),
    links: Joi.array(Node).required(),
    name: Joi.string().required(),
    nodes: Joi.array(Link).required(),
    id: Joi.string().required(),
  })),
  sequences: Joi.array(Joi.object({
    description: Joi.string().allow(''),
    events: Joi.array().required(),
    id: Joi.string().required(),
    name: Joi.string().required(),
  })),
});

const baseTwigletRequest = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required().allow(''),
});

const updateTwigletRequest = baseTwigletRequest.keys({
  _rev: Joi.string().required(),
  nodes: Joi.array().items(Node).required().label('Node[]'),
  links: Joi.array().items(Link).required(Link).label('Link[]'),
  commitMessage: Joi.string().required(),
  doReplacement: Joi.boolean(),
}).label('Put Twiglet Request');

const patchTwigletRequest = Joi.object({
  name: Joi.string().description('overwrites the name of the twiglet'),
  description: Joi.string().allow('').description('overwrites the twiglet description'),
  _rev: Joi.string().required().description('the revision number for the document'),
  nodes: Joi.array().items(Node).description('an array of nodes').label('Node[]'),
  links: Joi.array().items(Link).description('an array of links').label('Link[]'),
  commitMessage: Joi.string().required()
    .description('the commit message associated with this update'),
}).label('Twiglet Patch');

const baseTwigletResponse = {
  url: Joi.string().uri().required(),
  events_url: Joi.string().uri().required(),
  changelog_url: Joi.string().uri().required(),
  json_url: Joi.string().uri().required(),
  model_url: Joi.string().uri().required(),
  views_url: Joi.string().uri().required(),
  sequences_url: Joi.string().uri().required(),
};

const getTwigletResponse = updateTwigletRequest.keys(baseTwigletResponse).keys({
  commitMessage: Joi.disallow(),
  latestCommit: Joi.object({
    message: Joi.string().required(),
    user: Joi.string().required(),
    timestamp: Joi.date().iso(),
    replacement: Joi.bool(),
  })
});

const getTwigletsResponse = Joi.array().required().items(
  baseTwigletRequest.keys(baseTwigletResponse).unknown()
);

function checkNodesAreInModel (model, nodes) {
  (nodes || []).forEach(node => {
    if (model.entities[node.type] === undefined) {
      const error = new Error();
      error.status = 400;
      error.message = `node.type must be in entities, node.id: '${node.id}' fails`;
      throw error;
    }
  });
}

const getTwigletInfoByName = (name) => {
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  return twigletLookupDb.allDocs({ include_docs: true })
  .then(twigletsRaw => {
    const modelArray = twigletsRaw.rows.filter(row => row.doc.name === name);
    if (modelArray.length) {
      const twiglet = modelArray[0].doc;
      twiglet.twigId = twiglet._id;
      return twiglet;
    }
    const error = Error('Not Found');
    error.status = 404;
    throw error;
  });
};

const getTwiglet = (name, urlBuilder) =>
  getTwigletInfoByName(name)
  .then(twigletInfo => {
    const dbString = config.getTenantDatabaseString(twigletInfo.twigId);
    const db = new PouchDB(dbString, { skip_setup: true });
    return db.allDocs({
      include_docs: true,
      keys: ['nodes', 'links', 'changelog']
    })
    .then(twigletDocs => {
      const url = urlBuilder(`/v2/twiglets/${name}`);
      const eventsUrl = urlBuilder(`/v2/twiglets/${name}/events`);
      const modelUrl = urlBuilder(`/v2/twiglets/${name}/model`);
      const changelogUrl = urlBuilder(`/v2/twiglets/${name}/changelog`);
      const viewsUrl = urlBuilder(`/v2/twiglets/${name}/views`);
      const sequencesUrl = urlBuilder(`/v2/twiglets/${name}/sequences`);
      const jsonUrl = urlBuilder(`/v2/twiglets/${name}.json`);
      const twigletData = twigletDocs.rows.reduce((obj, row) => {
        obj[row.id] = row.doc;
        return obj;
      }, {});
      const nodeKeysToPick = [
        'attrs',
        'id',
        'location',
        'name',
        'type',
        'x',
        'y',
        '_color',
        '_size',
      ];
      const linkKeysToPick = [
        'attrs',
        'association',
        'id',
        'source',
        'target',
        '_color',
        '_size',
      ];
      return R.merge(
        R.omit(['changelog', 'views_2', 'events', 'sequences'], twigletData),
        {
          _rev: `${twigletInfo._rev}:${twigletData.nodes._rev}:${twigletData.links._rev}`,
          name: twigletInfo.name,
          description: twigletInfo.description,
          latestCommit: twigletData.changelog.data[0],
          nodes: twigletData.nodes.data.map(n => {
            const node = R.pick(nodeKeysToPick, n);
            node.id = escape(node.id);
            node.id = node.id.replace(/%/g, '');
            if (node.attrs) {
              node.attrs = node.attrs.filter(a => a.key);
            }
            return node;
          }),
          links: twigletData.links.data.map(l => {
            const link = R.pick(linkKeysToPick, l);
            link.id = escape(link.id);
            link.id = link.id.replace(/%/g, '');
            return link;
          }),
          url,
          model_url: modelUrl,
          changelog_url: changelogUrl,
          views_url: viewsUrl,
          json_url: jsonUrl,
          events_url: eventsUrl,
          sequences_url: sequencesUrl
        });
    });
  });

const getTwigletHandler = (request, reply) =>
  getTwiglet(request.params.name, request.buildUrl)
    .then((twiglet) => reply(twiglet))
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });

function ensureEntitiesHaveAttributesAndType (entities) {
  return Reflect.ownKeys(entities).reduce((object, key) => {
    let entity = entities[key];
    if (!entity.attributes) {
      entity = R.merge(entity, { attributes: [] });
    }
    if (!entity.type) {
      entity = R.merge(entity, { type: key });
    }
    return R.merge(object, { [key]: entity });
  }, {});
}

const createTwigletHandler = (request, reply) => {
  let jsonTwiglet;
  if (request.payload.json && request.payload.json !== '') {
    try {
      jsonTwiglet = JSON.parse(request.payload.json);
    }
    catch (error) {
      return reply(Boom.badData('JSON file not parseable'));
    }
  }
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  return twigletLookupDb.allDocs({ include_docs: true })
  .then(docs => {
    if (docs.rows.some(row => row.doc.name === request.payload.name)) {
      return reply(Boom.conflict('Twiglet already exists'));
    }
    const newTwiglet = R.pick(['name', 'description'], request.payload);
    newTwiglet._id = `twig-${uuidV4()}`;
    return twigletLookupDb.post(newTwiglet)
    .then(twigletInfo => {
      const dbString = config.getTenantDatabaseString(twigletInfo.id);
      const createdDb = new PouchDB(dbString);
      if (jsonTwiglet) {
        checkNodesAreInModel(jsonTwiglet.model, jsonTwiglet.nodes);
        return Promise.all([
          createdDb.bulkDocs([
            { _id: 'model', data: jsonTwiglet.model },
            { _id: 'nodes', data: jsonTwiglet.nodes },
            { _id: 'links', data: jsonTwiglet.links },
            { _id: 'views_2', data: jsonTwiglet.views },
            { _id: 'events', data: jsonTwiglet.events || [] },
            { _id: 'sequences', data: jsonTwiglet.sequences || [] },
          ]),
          Changelog.addCommitMessage(twigletInfo.id,
            request.payload.commitMessage,
            request.auth.credentials.user.name),
        ]);
      }
      if (request.payload.cloneTwiglet && request.payload.cloneTwiglet !== 'N/A') {
        return getTwigletInfoByName(request.payload.cloneTwiglet)
        .then(twigletToBeClonedInfo => {
          const cloneString = config.getTenantDatabaseString(twigletToBeClonedInfo.twigId);
          const clonedDb = new PouchDB(cloneString, { skip_setup: true });
          return clonedDb.allDocs({
            include_docs: true,
            keys: ['links', 'model', 'nodes', 'views_2', 'events', 'sequences']
          })
          .then(twigletDocs =>
            Promise.all([
              createdDb.bulkDocs([
                { _id: 'links', data: twigletDocs.rows[0].doc.data },
                { _id: 'model', data: twigletDocs.rows[1].doc.data },
                { _id: 'nodes', data: twigletDocs.rows[2].doc.data },
                { _id: 'views_2', data: twigletDocs.rows[3].doc.data },
                { _id: 'events', data: twigletDocs.rows[4].doc.data },
                { _id: 'sequences', data: twigletDocs.rows[5].doc.data },
              ]),
              Changelog.addCommitMessage(twigletInfo.id,
                request.payload.commitMessage,
                request.auth.credentials.user.name),
            ])
          );
        });
      }
      return Model.getModel(request.payload.model)
        .then(model =>
          Promise.all([
            createdDb.bulkDocs([
              {
                _id: 'model',
                data: { entities: ensureEntitiesHaveAttributesAndType(model.data.entities) }
              },
              { _id: 'nodes', data: [] },
              { _id: 'links', data: [] },
              { _id: 'views_2', data: [] },
              { _id: 'events', data: [] },
              { _id: 'sequences', data: [] },
            ]),
            Changelog.addCommitMessage(twigletInfo.id,
              request.payload.commitMessage,
              request.auth.credentials.user.name),
          ])
        );
    })
    .then(() =>
      getTwiglet(request.payload.name, request.buildUrl)
    )
    .then((twiglet) => {
      reply(twiglet).created(twiglet.url);
    });
  })
  .catch((error) => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });
};

const getTwigletsHandler = (request, reply) => {
  const dbString = config.getTenantDatabaseString('twiglets');
  const db = new PouchDB(dbString, { skip_setup: true });
  return db.allDocs({ include_docs: true })
    .then((doc) => {
      const twiglets = doc.rows
      .map((twiglet) =>
        R.merge(
          R.omit(['_rev', '_id'], twiglet.doc),
          {
            url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}`),
            model_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}/model`),
            changelog_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}/changelog`),
            views_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}/views`),
            json_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}.json`),
            events_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}/events`),
            sequences_url: request.buildUrl(`/v2/twiglets/${twiglet.doc.name}/sequences`),
          })
      );
      return reply(twiglets);
    })
    .catch((error) => {
      logger.error(JSON.stringify(error));
      return reply(Boom.create(error.status || 500, error.message, error));
    });
};

const putTwigletHandler = (request, reply) => {
  const _revs = request.payload._rev.split(':');
  if (_revs.length !== 3) {
    return reply(
      Boom.badRequest('_rev must be in the form of twigletInfo._rev:nodes._rev:links._rev')
    );
  }
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  return getTwigletInfoByName(request.params.name)
  .then(twigletInfo => {
    const dbString = config.getTenantDatabaseString(twigletInfo.twigId);
    const db = new PouchDB(dbString, { skip_setup: true });
    return db.allDocs({
      include_docs: true,
      keys: ['nodes', 'links', 'model']
    })
    .then(twigletDocs => {
      const twigletData = twigletDocs.rows.reduce((obj, row) => {
        obj[row.id] = row.doc;
        return obj;
      }, {});
      if (twigletInfo._rev !== _revs[0]
          || twigletData.nodes._rev !== _revs[1]
          || twigletData.links._rev !== _revs[2]) {
        return getTwiglet(request.params.name, request.buildUrl)
        .then(twiglet => {
          const error = Error('Your revision number is out of date');
          error.status = 409;
          error.twiglet = twiglet;
          throw error;
        });
      }
      checkNodesAreInModel(twigletData.model.data, request.payload.nodes);
      twigletInfo.name = request.payload.name;
      twigletInfo.description = request.payload.description;
      const twigIdVar = twigletInfo.twigId;
      delete twigletInfo.twigId;
      twigletData.nodes.data = request.payload.nodes;
      twigletData.links.data = request.payload.links;
      return Promise.all([
        twigletLookupDb.put(twigletInfo),
        db.put(twigletData.nodes),
        db.put(twigletData.links),
        Changelog.addCommitMessage(
          twigIdVar,
          request.payload.commitMessage,
          request.auth.credentials.user.name,
          request.payload.doReplacement
        ),
      ]);
    });
  })
  .then(() =>
    getTwiglet(request.payload.name, request.buildUrl)
  )
  .then((twiglet) => reply(twiglet).code(200))
  .catch((error) => {
    if (error.status !== 409) {
      logger.error(JSON.stringify(error));
    }
    const boomError = Boom.create(error.status || 500, error.message);
    boomError.output.payload.data = error.twiglet;
    return reply(boomError);
  });
};

const patchTwigletHandler = (request, reply) => {
  const _revs = request.payload._rev.split(':');
  if (_revs.length !== 3) {
    return reply(
      Boom.badRequest('_rev must be in the form of twigletInfo._rev:nodes._rev:links._rev')
    );
  }
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  return getTwigletInfoByName(request.params.name)
  .then(twigletInfo => {
    const dbString = config.getTenantDatabaseString(twigletInfo.twigId);
    const db = new PouchDB(dbString, { skip_setup: true });
    return db.allDocs({
      include_docs: true,
      keys: ['nodes', 'links', 'model']
    })
    .then(twigletDocs => {
      const twigletData = twigletDocs.rows.reduce((obj, row) => {
        obj[row.id] = row.doc;
        return obj;
      }, {});
      if (twigletInfo._rev !== _revs[0]
          || twigletData.nodes._rev !== _revs[1]
          || twigletData.links._rev !== _revs[2]) {
        return getTwiglet(request.params.name, request.buildUrl)
        .then(twiglet => {
          const error = Error('Your revision number is out of date');
          error.status = 409;
          error.twiglet = twiglet;
          throw error;
        });
      }
      if (request.payload.nodes) {
        checkNodesAreInModel(twigletData.model.data, request.payload.nodes);
      }
      twigletInfo.name = request.payload.name || twigletInfo.name;
      twigletInfo.description = request.payload.description || twigletInfo.description;
      const twigIdVar = twigletInfo.twigId;
      delete twigletInfo.twigId;
      twigletData.nodes.data = request.payload.nodes || twigletData.nodes.data;
      twigletData.links.data = request.payload.links || twigletData.links.data;
      return Promise.all([
        twigletLookupDb.put(twigletInfo),
        db.put(twigletData.nodes),
        db.put(twigletData.links),
        Changelog.addCommitMessage(
          twigIdVar,
          request.payload.commitMessage,
          request.auth.credentials.user.name,
          false
        ),
      ]);
    });
  })
  .then(() =>
    getTwiglet(request.payload.name || request.params.name, request.buildUrl)
  )
  .then((twiglet) => reply(twiglet).code(200))
  .catch((error) => {
    if (error.status !== 409) {
      logger.error(JSON.stringify(error));
    }
    const boomError = Boom.create(error.status || 500, error.message);
    boomError.output.payload.data = error.twiglet;
    return reply(boomError);
  });
};

const deleteTwigletHandler = (request, reply) => {
  const twigletLookupDb = new PouchDB(config.getTenantDatabaseString('twiglets'));
  return getTwigletInfoByName(request.params.name)
  .then(twigletInfo => {
    const dbString = config.getTenantDatabaseString(twigletInfo.twigId);
    const db = new PouchDB(dbString, { skip_setup: true });
    return db.destroy()
      .then(() => twigletLookupDb.remove(twigletInfo._id, twigletInfo._rev))
      .then(() => reply().code(204));
  })
  .catch((error) => {
    logger.error(JSON.stringify(error));
    return reply(Boom.create(error.status || 500, error.message, error));
  });
};


function sanitizeNode (node) {
  return R.pick(['attrs', 'id', 'location', 'name', 'type', 'x', 'y', '_color', '_size'], node);
}

function sanitizeLink (link) {
  return R.pick(['attrs', 'association', 'id', 'source', 'target', '_color', '_size'], link);
}

function sanitizeModel (model) {
  return R.pick(['entities'], model);
}

const getTwigletJsonHandler = (request, reply) =>
  getTwigletInfoByName(request.params.name)
  .then(twigletInfo => {
    const dbString = config.getTenantDatabaseString(twigletInfo.twigId);
    const db = new PouchDB(dbString, { skip_setup: true });
    return db.allDocs({
      include_docs: true,
      keys: ['nodes', 'links', 'model', 'views_2', 'events', 'sequences']
    })
    .then(twigletDocs => {
      const twigletData = twigletDocs.rows.reduce((obj, row) => {
        if (row.doc && row.doc.data) {
          obj[row.id] = row.doc.data;
        }
        return obj;
      }, {});
      twigletData.views = twigletData.views_2 || [];
      twigletData.nodes = twigletData.nodes.map(sanitizeNode);
      twigletData.links = twigletData.links.map(sanitizeLink);
      twigletData.model = sanitizeModel(twigletData.model);
      delete twigletData.views_2;
      return reply(twigletData);
    });
  });

module.exports = {
  getTwigletInfoByName,
  routes: [
    {
      method: ['POST'],
      path: '/v2/twiglets',
      handler: createTwigletHandler,
      config: {
        validate: {
          payload: createTwigletRequest,
        },
        response: { schema: getTwigletResponse },
        tags: ['api'],
      }
    },
    {
      method: ['GET'],
      path: '/v2/twiglets',
      handler: getTwigletsHandler,
      config: {
        auth: { mode: 'optional' },
        response: { schema: getTwigletsResponse },
        tags: ['api'],
      }
    },
    {
      method: ['GET'],
      path: '/v2/twiglets/{name}',
      handler: getTwigletHandler,
      config: {
        auth: { mode: 'optional' },
        response: { schema: getTwigletResponse },
        tags: ['api'],
      }
    },
    {
      method: ['GET'],
      path: '/v2/twiglets/{name}.json',
      handler: getTwigletJsonHandler,
      config: {
        auth: { mode: 'optional' },
        response: { schema: jsonTwigletRequest },
        tags: ['api'],
      }
    },
    {
      method: ['PUT'],
      path: '/v2/twiglets/{name}',
      handler: putTwigletHandler,
      config: {
        validate: {
          payload: updateTwigletRequest
        },
        response: { schema: getTwigletResponse },
        tags: ['api'],
      }
    },
    {
      method: ['PATCH'],
      path: '/v2/twiglets/{name}',
      handler: patchTwigletHandler,
      config: {
        validate: {
          payload: patchTwigletRequest
        },
        response: { schema: getTwigletResponse },
        tags: ['api'],
      }
    },
    {
      method: ['DELETE'],
      path: '/v2/twiglets/{name}',
      handler: deleteTwigletHandler,
      config: {
        tags: ['api'],
      }
    },
  ],
};
