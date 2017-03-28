/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
'use strict';
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSubset = require('chai-subset');
const R = require('ramda');
const { authAgent, anonAgent, url } = require('../../../../test/e2e');
const { createModel, deleteModel, baseModel } = require('../models/models.e2e.js');

const expect = chai.expect;
chai.use(chaiHttp);
chai.use(chaiSubset);

function createTwiglet (twiglet) {
  return authAgent.post('/v2/twiglets').send(twiglet);
}

function updateTwiglet (name, twiglet) {
  return authAgent.put(`/v2/twiglets/${name}`).send(twiglet);
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
  return authAgent.delete(`/v2/twiglets/${name}`);
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
        .catch(secondResponse => {
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
      updates.nodes = [{ a: 'node' }];
      updates.links = [{ a: 'link' }];
      yield updateTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
      res = yield createTwiglet(cloneTwiglet());
      res = yield getEntireTwiglet(cloneTwiglet());
    });

    after(function* foo () {
      yield deleteModel(baseModel());
      yield deleteTwiglet(cloneTwiglet());
      yield deleteTwiglet(baseTwiglet());
    });

    it('correctly clones the nodes', () => {
      expect(res.nodes).to.deep.equal([{ a: 'node' }]);
    });

    it('correctly clones the links', () => {
      expect(res.links).to.deep.equal([{ a: 'link' }]);
    });

    it('correctly clones the model', () => {
      expect(res.model.entities).to.deep.equal(baseModel().entities);
    });

    it('does not clone the name or description', () => {
      expect(res.name).to.equal('clone');
      expect(res.description).to.equal('This was cloned');
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
            user: 'twigtest@corp.riglet.io',
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
      promise.catch(res => {
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
      updates.nodes = [{ a: 'node' }];
      updates.links = [{ a: 'link' }];
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
    let promise;

    before(() => {
      promise = getTwiglet({ name: 'non-existant-name' });
    });

    it('returns 404', (done) => {
      promise.catch(res => {
        expect(res).to.have.status(404);
        done();
      });
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
        .end((err, response) => {
          expect(response).to.have.status(404);
          done();
        });
    });
  });
});


module.exports = { createTwiglet, deleteTwiglet, getTwiglet, baseTwiglet };
