'use strict';
/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
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
    }
  };
}

// function baseModel2 () {
//   return {
//     _id: 'automated-test-model2',
//     entities: {
//       ent1: {
//         class: 'ent3',
//         color: '#770077',
//         image: '3',
//         size: '30',
//         type: 'type 3',
//       },
//       ent2: {
//         class: 'ent4',
//         color: '#000088',
//         image: '4',
//         size: 41,
//         type: 'type 4',
//       }
//     }
//   };
// }

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
      it('returns a conflict error if the twiglet already exists', () => {
        createModel(baseModel())
          .catch(secondResponse => {
            expect(secondResponse).to.have.status(409);
          });
      });
    });

    after(() => deleteModel(baseModel()));
  });
});

// describe('GET /models', () => {
//   describe('(Successful)', () => {
//     let res;
//     const createdModel = [];

//     before(function* () {
//       res = yield createModel(baseModel());
//       createdModel.push(res.body);
//       res = yield createModel(baseModel2());
//       createdModel.push(res.body);
//       res = yield getModels();
//     });

//     it('returns 200', () => {
//       expect(res).to.have.status(200);
//     });

//     it('returns a list of twiglets', () => {
//       const foundTwiglet = res.body.find(({ _id }) => _id === baseModel()._id);
//       expect(foundTwiglet).to.containSubset(
//         R.omit(['links', 'nodes', '_rev', 'commitMessage'], )
//       );
//     });

//     after(() => deleteModel(baseModel()));
//   });
// });

describe('GET /twiglets/{id}', () => {
  describe('(Successful)', () => {
    let res;

    before(function* () {
      res = yield createModel(baseModel());
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('contains the twiglet', () => {
      expect(res.body).to.containSubset(R.merge(
        R.omit(['model'], baseModel()),
        {
          nodes: [],
          links: [],
        }
      ));
      expect(res.body).to.include.keys('_rev', 'url', 'model_url', 'changelog_url', 'views_url');
    });

    after(() => deleteModel(baseModel()));
  });

  describe('(Error)', () => {
    let promise;

    before(() => {
      promise = getModel({ _id: 'non-existant-id' });
    });

    it('returns 404', (done) => {
      promise.catch(res => {
        expect(res).to.have.status(404);
        done();
      });
    });
  });
});

describe('PUT /twiglets/{id}', () => {
  describe('(Successful)', () => {
    let res;
    let updates;

    before(function* () {
      updates = baseModel();
      delete updates._id;
      delete updates.model;
      updates._rev = (yield createModel(baseModel())).body._rev;
      updates.name = 'a different name';
      updates.description = 'a different description';
      updates.nodes = [{ a: 'node' }];
      updates.links = [{ a: 'link' }];
      updates.commitMessage = 'this was totally updated!';
      res = yield updateModel('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('contains the twiglet', () => {
      expect(res.body).to.containSubset(R.omit(['_rev'], updates));
      expect(res.body).to.include.keys('_rev', 'url', 'model_url', 'changelog_url', 'views_url');
    });

    after(() => deleteModel(baseModel()));
  });

  describe('(Error)', () => {
    let promise;

    before(() => {
      promise = getModel({ _id: 'non-existant-id' });
    });

    it('returns 404', (done) => {
      promise.catch(res => {
        expect(res).to.have.status(404);
        done();
      });
    });
  });
});

describe('DELETE /twiglets/{id}', () => {
  describe('(Successful)', () => {
    let res;

    before(function* () {
      yield createModel(baseModel());
      res = yield deleteModel(baseModel());
    });

    it('returns 204', () => {
      expect(res).to.have.status(204);
    });

    it('GET twiglet returns 404', (done) => {
      getModel({ _id: baseModel()._id })
        .end((err, response) => {
          expect(response).to.have.status(404);
          done();
        });
    });

    it('not included in the list of twiglets', function* () {
      const twiglets = yield getModels();
      expect(twiglets.body).to.not.deep.contains(baseModel());
    });

    it('returns 404 when twiglet doesnt exist', (done) => {
      deleteModel(baseModel())
        .end((err, response) => {
          expect(response).to.have.status(404);
          done();
        });
    });
  });
});
