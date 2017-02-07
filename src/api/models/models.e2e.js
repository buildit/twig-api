'use strict';
/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(require('chai-string'));
const { anonAgent, authAgent, url } = require('../../../test/e2e');
const R = require('ramda');

const expect = chai.expect;
chai.use(chaiHttp);

function createModel (model) {
  return authAgent.post('/models').send(model);
}

function updateModel (_id, model) {
  return authAgent.put(`/models/${_id}`).send(model);
}

function getModel ({ _id }) {
  return anonAgent.get(`/models/${_id}`);
}

function getModels () {
  return anonAgent.get('/models');
}

function deleteModel ({ _id }) {
  return authAgent.delete(`/models/${_id}`);
}

function baseModel () {
  return {
    _id: 'automated-test-model',
    entities: {
      ent1: {
        class: 'ent1',
        color: '#008800',
        image: '1',
        size: '40',
        type: 'type 1',
      },
      ent2: {
        class: 'ent2',
        color: '#880000',
        image: '2',
        size: 25,
        type: 'type 2',
      }
    },
    commitMessage: 'Model Created'
  };
}

function baseModel2 () {
  return {
    _id: 'automated-test-model2',
    entities: {
      ent1: {
        class: 'ent3',
        color: '#770077',
        image: '3',
        size: '30',
        type: 'type 3',
      },
      ent2: {
        class: 'ent4',
        color: '#000088',
        image: '4',
        size: 41,
        type: 'type 4',
      }
    },
    commitMessage: 'Model Created',
  };
}

describe('POST /models', () => {
  describe('(Successful)', () => {
    let res;

    before(function* () {
      res = yield createModel(baseModel());
    });

    describe('(Successful)', () => {
      it('returns 201', () => {
        expect(res).to.have.status(201);
      });

      it('returns the model', () => {
        expect(res.body._id).to.equal(baseModel()._id);
        expect(res.body.url).to.equal(`${url}/models/${baseModel()._id}`);
        expect(res.body.entities).to.deep.equal(baseModel().entities);
        expect(res.body).to.contain.all.keys(['_rev']);
      });
    });

    describe('(Error)', () => {
      it('returns a conflict error if the model already exists', () => {
        createModel(baseModel())
          .catch(secondResponse => {
            expect(secondResponse).to.have.status(409);
          });
      });
    });

    after(() => deleteModel(baseModel()));
  });
});

describe('GET /models', () => {
  describe('(Successful)', () => {
    let res;
    let testModels;

    before(function* () {
      const ids = [baseModel()._id, baseModel2()._id];
      yield createModel(baseModel());
      yield createModel(baseModel2());
      res = yield getModels();
      testModels = res.body.filter(model => ids.includes(model._id));
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('returns a list of models', () => {
      expect(testModels.length).to.equal(2);
      expect(testModels[0]._id).to.equal('automated-test-model');
      expect(testModels[0].url).to.endsWith('/models/automated-test-model');
      expect(testModels[1]._id).to.equal('automated-test-model2');
      expect(testModels[1].url).to.endsWith('/models/automated-test-model2');
    });

    after(function* foo () {
      yield deleteModel(baseModel());
      yield deleteModel(baseModel2());
    });
  });
});

describe('GET /models/{id}', () => {
  describe('(Successful)', () => {
    let res;

    before(function* () {
      yield createModel(baseModel());
      res = yield getModel(baseModel());
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('contains the model', () => {
      const expected = baseModel();
      delete expected.commitMessage;
      expect(res.body).to.containSubset(expected);
    });

    it('includes the revision number', () => {
      expect(res.body).to.include.keys('_rev');
    });

    it('includes the url', () => {
      expect(res.body.url).to.endsWith('/models/automated-test-model');
    });

    it('includes the changelog url', () => {
      expect(res.body.changelog_url).to.endsWith('/models/automated-test-model/changelog');
    });

    after(() => deleteModel(baseModel()));
  });

  describe('(Error)', () => {
    it('returns 404', () =>
      getModel({ _id: 'non-existant-id' })
        .catch(res => {
          expect(res).to.have.status(404);
        })
    );
  });
});

describe('PUT /models/{id}', () => {
  describe('(Successful)', () => {
    let res;
    let updates;

    before(function* () {
      res = yield createModel(baseModel());
      updates = baseModel2();
      updates._rev = res.body._rev;
      updates._id = baseModel()._id;
      res = yield updateModel(baseModel()._id, updates);
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('contains the model', () => {
      expect(res.body).to.containSubset(R.omit(['_rev', 'commitMessage'], updates));
    });

    it('includes the url', () => {
      expect(res.body.url).to.endsWith('/models/automated-test-model');
    });

    it('includes the changelog url', () => {
      expect(res.body.changelog_url).to.endsWith('/models/automated-test-model/changelog');
    });

    after(() => deleteModel(baseModel()));
  });

  describe('(Error)', () => {
    it('returns 404', () => {
      const updates = baseModel();
      updates._rev = 'does not matter';
      return updateModel(updates._id, updates)
        .catch(res => {
          expect(res.status).to.equal(404);
        });
    });
  });
});

describe('DELETE /models/{id}', () => {
  describe('(Successful)', () => {
    let res;
    before(function* () {
      yield createModel(baseModel());
      res = yield deleteModel(baseModel());
    });

    it('returns 204', () => {
      expect(res).to.have.status(204);
    });

    it('GET model returns 404', () =>
      getModel(baseModel())
        .catch(response => {
          expect(response).to.have.status(404);
        })
    );

    it('not included in the list of models', function* () {
      const models = yield getModels();
      expect(models.body).to.not.deep.contains(baseModel());
    });
  });

  describe('(Error)', () => {
    it('returns 404 when models doesnt exist', () =>
      deleteModel(baseModel())
        .catch(response => {
          expect(response).to.have.status(404);
        })
    );
  });
});

module.exports = {
  createModel,
  deleteModel,
  baseModel,
};
