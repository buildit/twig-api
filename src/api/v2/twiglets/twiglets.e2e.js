/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */

'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSubset = require('chai-subset');
const R = require('ramda');
const { authAgent, anonAgent, url, addWait } = require('../../../../test/e2e');
const { createModel, deleteModel, baseModel } = require('../models/models.e2e.js');

const expect = chai.expect;
chai.use(chaiHttp);
chai.use(chaiSubset);

function createTwiglet (twiglet) {
  return addWait(authAgent.post('/v2/twiglets').send(twiglet));
}

function updateTwiglet (name, twiglet) {
  return addWait(authAgent.put(`/v2/twiglets/${name}`).send(twiglet));
}

function patchTwiglet (name, twiglet) {
  return authAgent.patch(`/v2/twiglets/${name}`).send(twiglet);
}

function getTwiglet ({ name }) {
  return anonAgent.get(`/v2/twiglets/${name}`);
}

function getEntireTwiglet ({ name }) {
  return getTwiglet({ name })
    .then(response =>
      Promise.all([
        anonAgent.get(`/v2/twiglets/${name}/model`),
        anonAgent.get(`/v2/twiglets/${name}/changelog`),
        anonAgent.get(`/v2/twiglets/${name}/views`),
      ])
        .then(([model, changelog, views]) => {
          response.body.model = model.body;
          response.body.changelog = changelog.body.changelog;
          response.body.views = views.body.views;
          return response.body;
        })
    );
}

function getTwiglets () {
  return anonAgent.get('/v2/twiglets');
}

function deleteTwiglet ({ name }) {
  return addWait(authAgent.delete(`/v2/twiglets/${name}`));
}

function baseTwiglet () {
  return {
    name: 'test-c44e6001-1abd-483f-a8ab-bf807da7e455',
    description: 'foo bar baz',
    model: baseModel().name,
    commitMessage: 'fee fie fo fum',
  };
}

describe('POST /v2/twiglets', () => {
  describe('(Successful)', () => {
    let res;

    before(function* foo () {
      // act
      yield createModel(baseModel());
      res = yield createTwiglet(baseTwiglet());
    });

    it('returns 201', () => {
      expect(res).to.have.status(201);
    });

    it('has Location header', () => {
      expect(res).to.have.header('Location', `${url}/v2/twiglets/${baseTwiglet().name}`);
    });

    it('has an entity response', () => {
      expect(res.body).to.contain.all.keys({
        name: baseTwiglet().name,
        url: `${url}/twiglets/${baseTwiglet().name}`
      });
      expect(res.body).to.contain.all.keys(['_rev']);
    });

    it('returns a conflict error if the twiglet already exists', () => {
      createTwiglet(baseTwiglet())
        .catch((secondResponse) => {
          expect(secondResponse).to.have.status(409);
        });
    });

    after(function* foo () {
      yield deleteModel(baseModel());
      yield deleteTwiglet(baseTwiglet());
    });
  });

  describe('(Clone)', () => {
    let res;

    function cloneTwiglet () {
      return {
        cloneTwiglet: baseTwiglet().name,
        commitMessage: 'cloned from BaseTwiglet',
        description: 'This was cloned',
        model: 'does not matter',
        name: 'clone',
      };
    }

    before(function* foo () {
      yield createModel(baseModel());
      const updates = baseTwiglet();
      delete updates.model;
      updates._rev = (yield createTwiglet(baseTwiglet())).body._rev;
      updates.nodes = [
        {
          id: 'node1',
          name: 'node 1',
          type: 'ent1'
        },
        {
          id: 'node2',
          name: 'node 2',
          type: 'ent2'
        }
      ];
      updates.links = [
        {
          id: 'link1',
          source: 'node1',
          target: 'node2',
        },
        {
          id: 'link2',
          source: 'node2',
          target: 'node1',
        }
      ];
      res = yield updateTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
      res = yield createTwiglet(cloneTwiglet());
      res = yield getEntireTwiglet(cloneTwiglet());
    });

    after(function* foo () {
      yield deleteModel(baseModel());
      yield deleteTwiglet(cloneTwiglet());
      yield deleteTwiglet(baseTwiglet());
    });

    it('correctly clones the nodes', () => {
      expect(res.nodes).to.deep.equal([
        {
          id: 'node1',
          name: 'node 1',
          type: 'ent1'
        },
        {
          id: 'node2',
          name: 'node 2',
          type: 'ent2'
        }
      ]);
    });

    it('correctly clones the links', () => {
      expect(res.links).to.deep.equal([
        {
          id: 'link1',
          source: 'node1',
          target: 'node2',
        },
        {
          id: 'link2',
          source: 'node2',
          target: 'node1',
        }
      ]);
    });

    it('correctly clones the model', () => {
      expect(res.model.entities).to.deep.equal(baseModel().entities);
    });

    it('does not clone the name or description', () => {
      expect(res.name).to.equal('clone');
      expect(res.description).to.equal('This was cloned');
    });
  });

  describe('(From JSON)', () => {
    let res;

    function jsonRepresentationOfTwiglet () {
      return {
        model: {
          entities: {
            ent1: {
              class: 'some class',
              image: 'a',
              type: 'ent1',
              attributes: [],
            },
            ent2: {
              class: 'second class',
              image: 'b',
              type: 'ent2',
              attributes: [],
            },
          },
        },
        nodes: [
          {
            id: 'node1',
            name: 'node 1',
            type: 'ent1'
          },
          {
            id: 'node2',
            name: 'node 2',
            type: 'ent2'
          }
        ],
        links: [
          {
            id: 'link1',
            source: 'node1',
            target: 'node2',
          },
          {
            id: 'link2',
            source: 'node2',
            target: 'node1',
          }
        ],
        views: [{
          links: {},
          name: 'some view',
          nodes: {},
          userState: {
            autoConnectivity: 'some string',
            cascadingCollapse: true,
            currentNode: 'some string',
            filters: { a: 'filter' },
            forceChargeStrength: 10,
            forceGravityX: 10,
            forceGravityY: 10,
            forceLinkDistance: 10,
            forceLinkStrength: 10,
            forceVelocityDecay: 10,
            linkType: 'some string',
            scale: 10,
            showLinkLabels: true,
            showNodeLabels: true,
            treeMode: true,
            traverseDepth: 3,
          }
        }],
      };
    }

    function jsonTwiglet () {
      return {
        cloneTwiglet: '',
        commitMessage: 'cloned from BaseTwiglet',
        description: 'This was cloned',
        model: 'does not matter',
        name: 'json',
        json: JSON.stringify(jsonRepresentationOfTwiglet()),
      };
    }

    describe('success', () => {
      before(function* foo () {
        res = yield createTwiglet(jsonTwiglet());
        res = yield getEntireTwiglet(jsonTwiglet());
      });

      after(function* foo () {
        yield deleteTwiglet(jsonTwiglet());
      });

      it('correctly processes the nodes', () => {
        expect(res.nodes).to.deep.equal(jsonRepresentationOfTwiglet().nodes);
      });

      it('correctly processes the links', () => {
        expect(res.links).to.deep.equal(jsonRepresentationOfTwiglet().links);
      });

      it('correctly processes the model', () => {
        expect(res.model.entities).to.deep.equal(jsonRepresentationOfTwiglet().model.entities);
      });

      it('correctly processes the views ', () => {
        expect(res.view).to.deep.equal(jsonRepresentationOfTwiglet().view);
      });
    });

    describe('errors', () => {
      after(function* foo () {
        yield deleteTwiglet(jsonTwiglet());
      });

      it('errors if the node.type is not in the entities', function* foo () {
        try {
          const illegalTwiglet = jsonRepresentationOfTwiglet();
          illegalTwiglet.nodes[1].type = 'ent3';
          const jsonRequest = jsonTwiglet();
          jsonRequest.json = JSON.stringify(illegalTwiglet);
          yield createTwiglet(jsonRequest);
          expect(false).to.be.true; // should never be called.
        }
        catch (error) {
          expect(error).to.have.status(400);
          expect(error.response.body.message.includes('node2')).to.equal(true);
        }
      });
    });
  });

  describe('(Error)', () => {
    before(function* foo () {
      // act
      yield createModel(baseModel());
      yield createTwiglet(baseTwiglet());
    });

    after(function* foo () {
      yield deleteModel(baseModel());
      yield deleteTwiglet(baseTwiglet());
    });

    it('errors if the name is already being used', function* foo () {
      try {
        yield createTwiglet(baseTwiglet());
        expect(false).to.be.true; // should never be called.
      }
      catch (error) {
        expect(error).to.have.status(409);
      }
    });
  });
});

describe('GET /v2/twiglets', () => {
  describe('(Successful)', () => {
    let res;
    let createdTwiglet;

    before(function* () {
      yield createModel(baseModel());
      res = yield createTwiglet(baseTwiglet());
      createdTwiglet = res.body;
      res = yield getTwiglets();
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('returns a list of twiglets', () => {
      const foundTwiglet = res.body.find(({ name }) => name === baseTwiglet().name);
      expect(foundTwiglet).to.containSubset(
        R.omit(['links', 'nodes', '_rev', 'latestCommit'], createdTwiglet)
      );
    });

    after(function* foo () {
      yield deleteModel(baseModel());
      yield deleteTwiglet(baseTwiglet());
    });
  });
});

describe('GET /v2/twiglets/{name}', () => {
  describe('(Successful)', () => {
    let res;

    before(function* () {
      yield createModel(baseModel());
      yield createTwiglet(baseTwiglet());
      res = yield getTwiglet(baseTwiglet());
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('contains the twiglet', () => {
      expect(res.body).to.containSubset(R.merge(
        R.omit(['model', 'commitMessage'], baseTwiglet()),
        {
          nodes: [],
          links: [],
          latestCommit: {
            message: 'fee fie fo fum',
            user: 'local@user',
          }
        }
      ));
      expect(res.body).to.include.keys('_rev', 'url', 'model_url', 'changelog_url', 'views_url');
    });

    after(function* foo () {
      yield deleteModel(baseModel());
      yield deleteTwiglet(baseTwiglet());
    });
  });

  describe('(Error)', () => {
    let promise;

    before(() => {
      promise = getTwiglet({ name: 'non-existant-name' });
    });

    it('returns 404', (done) => {
      promise.catch((res) => {
        expect(res).to.have.status(404);
        done();
      });
    });
  });
});

describe('PUT /v2/twiglets/{name}', () => {
  describe('(Successful)', () => {
    let res;
    let updates;

    before(function* () {
      yield createModel(baseModel());
      updates = baseTwiglet();
      delete updates.model;
      updates._rev = (yield createTwiglet(baseTwiglet())).body._rev;
      updates.name = 'a different name';
      updates.description = 'a different description';
      updates.nodes = [
        {
          id: 'node1',
          name: 'node 1',
          type: 'ent1'
        },
        {
          id: 'node2',
          name: 'node 2',
          type: 'ent2'
        }
      ];
      updates.links = [
        {
          id: 'link1',
          source: 'node1',
          target: 'node2',
        },
        {
          id: 'link2',
          source: 'node2',
          target: 'node1',
        }
      ];
      updates.commitMessage = 'this was totally updated!';
      res = yield updateTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('contains the twiglet', () => {
      expect(res.body).to.containSubset(R.omit(['_rev', 'commitMessage'], updates));
      expect(res.body).to.include.keys('_rev', 'url', 'model_url', 'changelog_url',
        'views_url', 'latestCommit');
    });

    after(function* foo () {
      yield deleteModel(baseModel());
      yield deleteTwiglet({ name: 'a different name' });
    });
  });

  describe('(Error)', () => {
    let updates;
    beforeEach(function* foo () {
      updates = baseTwiglet();
      delete updates.model;
      updates._rev = 'whatever:whatever:whatever';
      updates.name = 'a different name';
      updates.description = 'a different description';
      updates.nodes = [
        {
          id: 'node 1',
          name: 'node 1',
          type: 'ent1'
        },
        {
          id: 'node 2',
          name: 'node 2',
          type: 'ent2'
        }
      ];
      updates.links = [
        {
          id: 'link 1',
          source: 'node 1',
          target: 'node 2',
        },
        {
          id: 'link 2',
          source: 'node 2',
          target: 'node 1',
        }
      ];
      updates.commitMessage = 'this was totally updated!';
      yield createModel(baseModel());
    });

    afterEach(function* foo () {
      yield deleteModel(baseModel());
      try {
        yield deleteTwiglet(baseTwiglet());
      }
      catch (error) {
        if (error.status !== 404) {
          throw error;
        }
      }
    });

    it('returns 404', function* foo () {
      try {
        yield updateTwiglet({ name: 'non-existant-name' }, updates);
        expect(true).to.equal(false);
      }
      catch (error) {
        expect(error).to.have.status(404);
      }
    });

    it('fails if the node.type is not in the entities', function* foo () {
      updates._rev = (yield createTwiglet(baseTwiglet())).body._rev;
      updates.nodes[1].type = 'ent3';
      updates.commitMessage = 'invalid nodes';
      try {
        yield updateTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
        expect(true).to.equal(false); // should never be called.
      }
      catch (error) {
        expect(error).to.have.status(400);
        expect(error.response.body.message.includes('node 2')).to.equal(true);
      }
    });
  });
});

describe('PATCH /v2/twiglets/{name}', () => {
  describe('(Successful)', () => {
    let res;
    let updates;

    beforeEach(function* () {
      yield createModel(baseModel());
      updates = baseTwiglet();
      delete updates.model;
      updates._rev = (yield createTwiglet(baseTwiglet())).body._rev;
      updates.name = 'a different name';
      updates.description = 'a different description';
      updates.nodes = [
        {
          id: 'node1',
          name: 'node 1',
          type: 'ent1'
        },
        {
          id: 'node2',
          name: 'node 2',
          type: 'ent2'
        }
      ];
      updates.links = [
        {
          id: 'link1',
          source: 'node1',
          target: 'node2',
        },
        {
          id: 'link2',
          source: 'node2',
          target: 'node1',
        }
      ];
      updates.commitMessage = 'this was totally updated!';
    });

    it('returns 200', function* foo () {
      res = yield patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
      expect(res).to.have.status(200);
    });

    it('contains the twiglet', function* foo () {
      res = yield patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
      expect(res.body).to.containSubset(R.omit(['_rev', 'commitMessage'], updates));
      expect(res.body).to.include.keys('_rev', 'url', 'model_url', 'changelog_url',
        'views_url', 'latestCommit');
    });

    it('can update only the name', function* foo () {
      delete updates.description;
      delete updates.nodes;
      delete updates.links;
      res = yield patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
      expect(res.body.name).to.equal('a different name');
    });

    it('can update only the description', function* foo () {
      delete updates.description;
      delete updates.nodes;
      delete updates.links;
      res = yield patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
      expect(res.body.description).to.equal('foo bar baz');
    });

    it('can update only the nodes', function* foo () {
      delete updates.description;
      delete updates.name;
      delete updates.links;
      res = yield patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
      expect(res.body.nodes.length).to.equal(2);
    });

    it('can update only the links', function* foo () {
      delete updates.description;
      delete updates.name;
      delete updates.nodes;
      res = yield patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
      expect(res.body.links.length).to.equal(2);
    });

    afterEach(function* foo () {
      yield deleteModel(baseModel());
      yield deleteTwiglet({ name: res.body.name });
    });
  });

  describe('(Error)', () => {
    let updates;
    beforeEach(function* foo () {
      updates = baseTwiglet();
      delete updates.model;
      updates._rev = 'whatever:whatever:whatever';
      updates.name = 'a different name';
      updates.description = 'a different description';
      updates.nodes = [
        {
          id: 'node 1',
          name: 'node 1',
          type: 'ent1'
        },
        {
          id: 'node 2',
          name: 'node 2',
          type: 'ent2'
        }
      ];
      updates.links = [
        {
          id: 'link 1',
          source: 'node 1',
          target: 'node 2',
        },
        {
          id: 'link 2',
          source: 'node 2',
          target: 'node 1',
        }
      ];
      updates.commitMessage = 'this was totally updated!';
      yield createModel(baseModel());
    });

    afterEach(function* foo () {
      yield deleteModel(baseModel());
      try {
        yield deleteTwiglet(baseTwiglet());
      }
      catch (error) {
        if (error.status !== 404) {
          throw error;
        }
      }
    });

    it('returns 404', function* foo () {
      try {
        yield patchTwiglet({ name: 'non-existant-name' }, updates);
        expect(true).to.equal(false);
      }
      catch (error) {
        expect(error).to.have.status(404);
      }
    });

    it('fails if the node.type is not in the entities', function* foo () {
      updates._rev = (yield createTwiglet(baseTwiglet())).body._rev;
      delete updates.description;
      delete updates.name;
      delete updates.links;
      updates.nodes[1].type = 'ent3';
      updates.commitMessage = 'invalid nodes';
      try {
        yield patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
        expect(true).to.equal(false); // should never be called.
      }
      catch (error) {
        expect(error).to.have.status(400);
        expect(error.response.body.message.includes('node 2')).to.equal(true);
      }
    });
  });
});

describe('DELETE /v2/twiglets/{name}', () => {
  describe('(Successful)', () => {
    let res;

    before(function* () {
      yield createModel(baseModel());
      yield createTwiglet(baseTwiglet());
      yield deleteModel(baseModel());
      res = yield deleteTwiglet(baseTwiglet());
    });

    it('returns 204', () => {
      expect(res).to.have.status(204);
    });

    it('GET twiglet returns 404', (done) => {
      getTwiglet({ name: baseTwiglet().name })
        .end((err, response) => {
          expect(response).to.have.status(404);
          done();
        });
    });

    it('not included in the list of twiglets', function* () {
      const twiglets = yield getTwiglets();
      expect(twiglets.body).to.not.deep.contains(baseTwiglet());
    });

    it('returns 404 when twiglet doesnt exist', (done) => {
      deleteTwiglet(baseTwiglet())
        .catch((error) => {
          expect(error).to.have.status(404);
          done();
        });
    });
  });
});


module.exports = { createTwiglet, deleteTwiglet, getTwiglet, baseTwiglet };
