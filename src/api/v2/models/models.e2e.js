'use strict';

/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(require('chai-string'));
const R = require('ramda');
const {
  anonAgent, authAgent, url, addWait
} = require('../../../../test/e2e');

const { expect } = chai;
chai.use(chaiHttp);

function createModel (model) {
  return addWait(authAgent.post('/v2/models').send(model));
}

function updateModel (name, model) {
  return addWait(authAgent.put(`/v2/models/${name}`).send(model));
}

function getModel ({ name }) {
  return anonAgent.get(`/v2/models/${name}`);
}

function getModels () {
  return anonAgent.get('/v2/models');
}

function deleteModel ({ name }) {
  return addWait(authAgent.delete(`/v2/models/${name}`));
}

function baseModel () {
  return {
    commitMessage: 'Model Created',
    entities: {
      ent1: {
        class: 'ent1',
        color: '#008800',
        image: '1',
        size: '40',
        type: 'ent1',
        attributes: [],
      },
      ent2: {
        class: 'ent2',
        color: '#880000',
        image: '2',
        size: 25,
        type: 'ent2',
        attributes: [],
      }
    },
    name: 'model1',
  };
}

function baseModel2 () {
  return {
    commitMessage: 'Model Created',
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
    name: 'model2',
  };
}

function cloneModel () {
  return {
    cloneModel: baseModel().name,
    commitMessage: 'cloned from BaseModel',
    entities: {},
    name: 'clone',
  };
}

describe('Models', () => {
  describe('POST /v2/models', () => {
    describe('(Successful)', () => {
      let res;

      before(async () => {
        res = await createModel(baseModel());
      });

      describe('(Successful)', () => {
        it('returns 201', () => {
          expect(res).to.have.status(201);
        });

        it('returns the model name', () => {
          expect(res.body.name).to.equal(baseModel().name);
        });

        it('returns the model entities', () => {
          expect(res.body.entities).to.deep.equal(baseModel().entities);
        });

        it('returns a revision number', () => {
          expect(res.body).to.contain.all.keys(['_rev']);
        });

        it('returns a model url', () => {
          expect(res.body.url).to.equal(`${url}/v2/models/${baseModel().name}`);
        });

        it('returns a model changelog_url', () => {
          expect(res.body.changelog_url).to.equal(`${url}/v2/models/${baseModel().name}/changelog`);
        });
      });

      describe('(Error)', () => {
        it('returns a conflict error if the model already exists', () => {
          createModel(baseModel())
            .catch((secondResponse) => {
              expect(secondResponse).to.have.status(409);
            });
        });
      });

      after(async () => {
        await deleteModel(baseModel());
      });
    });

    describe('(Clone)', () => {
      let res;

      before(async () => {
        await createModel(baseModel());
        res = await createModel(cloneModel());
      });

      after(async () => {
        await deleteModel(cloneModel());
        await deleteModel(baseModel());
      });

      it('returns 201', () => {
        expect(res).to.have.status(201);
      });

      it('clones the entities', () => {
        expect(res.body.entities).to.deep.equal(baseModel().entities);
      });

      it('does not clone the name', () => {
        expect(res.body.name).to.deep.equal('clone');
      });
    });
  });

  describe('GET /models', () => {
    describe('(Successful)', () => {
      let res;
      let testModels;

      before(async () => {
        const names = [baseModel().name, baseModel2().name];
        await createModel(baseModel());
        await createModel(baseModel2());
        res = await getModels();
        testModels = res.body.filter(model => names.includes(model.name));
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('returns a list of models', () => {
        expect(testModels.length).to.equal(2);
      });

      it('returns the name of the models', () => {
        expect(testModels[0].name).to.equal('model1');
      });

      it('returns the model url', () => {
        expect(testModels[0].url).to.endsWith('/models/model1');
      });

      after(async () => {
        await deleteModel(baseModel());
        await deleteModel(baseModel2());
      });
    });
  });

  describe('GET /models/{name}', () => {
    describe('(Successful)', () => {
      let res;

      before(async () => {
        await createModel(baseModel());
        res = await getModel(baseModel());
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('contains the model', () => {
        const expected = baseModel();
        delete expected.commitMessage;
        expect(res.body).to.containSubset(expected);
      });

      it('includes the name', () => {
        expect(res.body.name).to.equal('model1');
      });

      it('includes the revision number', () => {
        expect(res.body).to.include.keys('_rev');
      });

      it('includes the url', () => {
        expect(res.body.url).to.endsWith('/models/model1');
      });

      it('includes the changelog url', () => {
        expect(res.body.changelog_url).to.endsWith('/models/model1/changelog');
      });

      after(async () => {
        await deleteModel(baseModel());
      });
    });

    describe('(Error)', () => {
      it('returns 404', () => getModel({ name: 'non-existant-name' })
        .catch((res) => {
          expect(res).to.have.status(404);
        }));
    });
  });

  describe('PUT /models/{name}', () => {
    describe('(Successful)', () => {
      let res;
      let updates;

      before(async () => {
        res = await createModel(baseModel());
        updates = baseModel2();
        updates._rev = res.body._rev;
        res = await updateModel(baseModel().name, updates);
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('contains the model', () => {
        expect(res.body).to.containSubset(R.omit(['_rev', 'commitMessage'], updates));
      });

      it('includes the url', () => {
        expect(res.body.url).to.endsWith('/models/model2');
      });

      it('includes the changelog url', () => {
        expect(res.body.changelog_url).to.endsWith('/models/model2/changelog');
      });

      after(async () => {
        await deleteModel(baseModel2());
      });
    });

    describe('(Error)', () => {
      it('returns 404', () => {
        const updates = baseModel();
        updates._rev = 'does not matter';
        return updateModel(updates._id, updates)
          .catch((res) => {
            expect(res.status).to.equal(404);
          });
      });
    });
  });

  describe('DELETE /models/{name}', () => {
    describe('(Successful)', () => {
      let res;
      before(async () => {
        await createModel(baseModel());
        res = await deleteModel(baseModel());
      });

      it('returns 204', () => {
        expect(res).to.have.status(204);
      });

      it('GET model returns 404', () => getModel(baseModel())
        .catch((response) => {
          expect(response).to.have.status(404);
        }));

      it('not included in the list of models', async () => {
        const models = await getModels();
        expect(models.body).to.not.deep.contains(baseModel());
      });
    });

    describe('(Error)', () => {
      it('returns 404 when models doesnt exist', () => deleteModel(baseModel())
        .catch((response) => {
          expect(response).to.have.status(404);
        }));
    });
  });
});

module.exports = {
  createModel,
  deleteModel,
  baseModel,
};
