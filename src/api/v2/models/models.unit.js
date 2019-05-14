'use strict';

/* eslint no-unused-expressions: 0 */
const chai = require('chai');
chai.use(require('chai-string'));
const sinon = require('sinon');
const PouchDb = require('pouchdb');
const Models = require('./models');
const init = require('../../../../test/unit/test-server');

const { expect } = chai;

function stubModel () {
  return {
    _id: 'testModel',
    _rev: '12345',
    doc: {
      _id: 'testModel',
      _rev: '12345',
      data: {
        name: 'testModel1',
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
        changelog: [{
          message: 'Model Created',
          user: 'user@local',
          timestamp: new Date().toISOString(),
        }],
      },
    }
  };
}
describe('/v2/models/', () => {
  let server;

  before(async () => {
    server = await init(Models.routes);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('POST', () => {
    function req () {
      return {
        method: 'POST',
        url: '/v2/models',
        auth: {
          strategy: 'session',
          credentials: {
            id: 123,
            username: 'ben',
            user: {
              name: 'Ben Hernandez',
            },
          },
        },
        payload: {
          name: 'model1',
          commitMessage: 'Model Created',
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
            },
          },
        },
      };
    }

    describe('success', () => {
      let res;

      beforeEach(function* foo () {
        const getModelsStub = sinon.stub(PouchDb.prototype, 'allDocs');
        getModelsStub.onFirstCall().resolves({ rows: [] });
        getModelsStub.onSecondCall().resolves({
          rows: [
            {
              doc: {
                _rev: 'some rev',
                _id: req().payload._id,
                data: {
                  entities: req().payload.entities,
                  name: 'model1',
                },
              }
            }
          ]
        });
        sinon.stub(PouchDb.prototype, 'post').resolves();
        res = yield server.inject(req());
      });

      it('returns a status code of "Created"', () => {
        expect(res.statusCode).to.equal(201);
      });

      it('returns a url', () => {
        expect(res.result.url).to.endsWith('/models/model1');
      });

      it('returns a changelog url', () => {
        expect(res.result.changelog_url).to.endsWith('/models/model1/changelog');
      });

      it('returns the revision number', () => {
        expect(res.result._rev).to.equal('some rev');
      });

      it('returns the model', () => {
        expect(res.result.entities).to.deep.equal(req().payload.entities);
      });
    });

    describe('errors', () => {
      it('returns a conflict error if the model already exists', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({
          rows: [
            {
              doc: {
                data: {
                  name: 'model1',
                },
              }
            }
          ]
        });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(409);
      });

      it('passes database errors on to the client', function* foo () {
        // sinon.stub(PouchDb.prototype, 'allDocs').rejects({ status: 419, message: 'teapots' });
        sinon.stub(PouchDb.prototype, 'allDocs').throws({
          status: '419',
          message: 'teapots'
        });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(419);
        expect(res.result.message).to.equal('teapots');
      });

      it('unknown errors are passed as 500', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').rejects({ message: 'not teapots' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });

      it('passes on put errors to the client', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [] });
        sinon.stub(PouchDb.prototype, 'post').rejects({ status: 419, message: 'teapots' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(419);
      });

      it('handles passes on put errors to the client', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [] });
        sinon.stub(PouchDb.prototype, 'post').rejects({ message: 'not teapots' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });
    });
  });

  describe('GET', () => {
    function req () {
      return {
        method: 'GET',
        url: '/v2/models',
      };
    }
    describe('success', () => {
      let res;

      function stubModels () {
        return {
          total_rows: 3,
          offset: 0,
          rows:
          [
            {
              id: 'testModel',
              key: 'testModel',
              value: { rev: '12345' },
              doc: {
                data: {
                  name: 'testModel1',
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
                }
              }
            },
            {
              id: 'buildit',
              key: 'buildit',
              value: { rev: '67890' },
              doc: {
                data: {
                  name: 'testModel1',
                  entities: {
                    ent3: {
                      class: 'ent3',
                      color: '#000088',
                      image: '3',
                      size: 100,
                      type: 'type 3',
                    },
                    ent4: {
                      class: 'ent4',
                      color: '#008888',
                      image: '4',
                      size: '15',
                      type: 'type 4',
                    },
                  }
                }
              }
            }
          ]
        };
      }
      beforeEach(function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves(stubModels());
        res = yield server.inject(req());
      });

      it('has a status of 200', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns the correct number of models', () => {
        expect(res.result.length).to.equal(2);
      });

      it('returns model names and urls', () => {
        expect(res.result[0]).to.have.keys(['name', 'url']);
      });

      it('returns model name correctly', () => {
        expect(res.result[0].name).to.exist.and.equal('testModel1');
      });

      it('returns model url correctly', () => {
        expect(res.result[0].url).to.exist.and.endsWith('/models/testModel1');
      });
    });

    describe('errors', () => {
      it('passes on errors to the client', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').rejects({ status: 418 });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(418);
      });

      it('handles unknown errors by passing 500', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').rejects({ message: 'some message' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });
    });
  });
});

describe('/models/{name}', () => {
  let server;

  before(async () => {
    server = await init(Models.routes);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('PUT', () => {
    function req () {
      return {
        method: 'PUT',
        url: '/v2/models/testModel1',
        auth: {
          strategy: 'session',
          credentials: {
            id: 123,
            username: 'ben',
            user: {
              name: 'Ben Hernandez',
            },
          },
        },
        payload: {
          name: 'testModel1',
          _rev: '12345',
          commitMessage: 'some change',
          entities: {
            ent1: {
              class: 'ent1',
              color: '#000088',
              image: 'O',
              size: 10,
              type: 'type 1 - new',
            },
            ent2: {
              class: 'ent2',
              color: '#330055',
              image: 'T',
              size: '350',
              type: 'type 2 - new',
            }
          }
        },
      };
    }

    describe('success', () => {
      let res;
      let put;
      beforeEach(function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({
          rows: [
            {
              doc: {
                _rev: '12345',
                _id: req().payload._id,
                data: {
                  entities: req().payload.entities,
                  name: 'testModel1',
                  changelog: [],
                },
              }
            }
          ]
        });
        put = sinon.stub(PouchDb.prototype, 'put').resolves();
        res = yield server.inject(req());
      });

      it('calls put', () => {
        expect(put.callCount).to.equal(1);
      });

      it('returns OK', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns the revision number', () => {
        expect(res.result._rev).to.equal('12345');
      });

      it('returns the model', () => {
        expect(res.result.entities).to.deep.equal(req().payload.entities);
      });
    });

    describe('errors', () => {
      it('errors if the model cannot be found', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [] });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(404);
      });

      it('errors if _rev does not match and sends back _rev for overwrite', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [stubModel()] });
        const badRev = req();
        badRev.payload._rev = 'wrong!';
        const res = yield server.inject(badRev);
        expect(res.statusCode).to.equal(409);
        expect(res.result.data._rev).to.equal('12345');
      });

      it('passes database error codes on to the client', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [stubModel()] });
        sinon.stub(PouchDb.prototype, 'put').throws({
          status: '419',
          message: 'teapots'
        });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(419);
        expect(res.result.message).to.equal('teapots');
      });
    });
  });

  describe('DELETE', () => {
    function req () {
      return {
        method: 'DELETE',
        url: '/v2/models/testModel1',
        auth: {
          strategy: 'session',
          credentials: {
            id: 123,
            username: 'ben',
            user: {
              name: 'Ben Hernandez',
            },
          },
        }
      };
    }

    describe('success', () => {
      let res;
      beforeEach(function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [stubModel()] });
        sinon.stub(PouchDb.prototype, 'remove').resolves();
        res = yield server.inject(req());
      });

      it('responds with code 204', () => {
        expect(res.statusCode).to.equal(204);
      });
    });

    describe('errors', () => {
      it('responds with 404 if the model cannot be found', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [] });
        sinon.stub(PouchDb.prototype, 'remove').resolves();
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(404);
        expect(res.result.message).to.equal('Not Found');
      });

      it('responds with an error if it cannot delete the model', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [stubModel()] });
        sinon.stub(PouchDb.prototype, 'remove').rejects({ status: 409, message: 'Conflict!' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(409);
        expect(res.result.message).to.equal('Conflict!');
      });

      it('unknown errors come through as 500', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [stubModel()] });
        sinon.stub(PouchDb.prototype, 'remove').rejects({ message: 'some error' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });
    });
  });

  describe('GET', () => {
    function req () {
      return {
        method: 'GET',
        url: '/v2/models/testModel1',
      };
    }
    describe('success', () => {
      let res;

      beforeEach(function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [stubModel()] });
        res = yield server.inject(req());
      });

      it('has a status of 200', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns the correct number of entities', () => {
        expect(Reflect.ownKeys(res.result.entities).length).to.equal(2);
      });
    });

    describe('old models', () => {
      let res;

      beforeEach(function* foo () {
        const stubbedModel = stubModel();
        delete stubbedModel.doc.data.changelog;
        sinon.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [stubbedModel] });
        res = yield server.inject(req());
      });

      it('appends a placeholder changelog on older, unmigrated models', () => {
        expect(res.result.latestCommit.user).to.equal('robot@buildit');
      });
    });

    describe('errors', () => {
      it('passes on errors to the client', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').rejects({ status: 419 });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(419);
      });

      it('handles unknown errors by passing 500', function* foo () {
        sinon.stub(PouchDb.prototype, 'allDocs').rejects({ message: 'some message' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });
    });
  });
});
