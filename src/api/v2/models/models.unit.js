'use strict';
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
chai.use(require('chai-string'));
const sinon = require('sinon');
require('sinon-as-promised');
const Models = require('./models');
const server = require('../../../../test/unit/test-server');
const dao = require('../DAO');

const expect = chai.expect;
server.route(Models.routes);

function stubModel () {
  return {
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
        user: 'test.user@corp.riglet.io',
        timestamp: new Date().toISOString(),
      }],
    },
  };
}

describe('/v2/models/', () => {
  let sandbox = sinon.sandbox.create();
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('POST', () => {
    function req () {
      return {
        method: 'POST',
        url: '/v2/models',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
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
        sandbox.stub(dao.models, 'create').resolves();
        sandbox.stub(dao.models, 'getOne').resolves({
          _rev: 'some rev',
          _id: req().payload._id,
          data: {
            entities: req().payload.entities,
            name: 'model1',
          },
        });
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
      it('returns an errors passed on', function* foo () {
        const error = new Error('conflict');
        error.status = 409;
        sandbox.stub(dao.models, 'create').rejects(error);
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(409);
      });

      it('passes database errors on to the client', function* foo () {
        const error = new Error('teapots');
        error.status = 419;
        sandbox.stub(dao.models, 'create').rejects(error);
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(419);
      });

      it('unknown errors are passed as 500', function* foo () {
        const error = new Error('some error');
        sandbox.stub(dao.models, 'create').rejects(error);
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
        return [
          {
            _id: 'testModel',
            _key: 'testModel',
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
          },
          {
            _id: 'buildit',
            _key: 'buildit',
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
        ];
      }
      beforeEach(function* foo () {
        sandbox.stub(dao.models, 'getAll').resolves(stubModels());
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
        sandbox.stub(dao.models, 'getAll').rejects({ status: 418 });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(418);
      });

      it('handles unknown errors by passing 500', function* foo () {
        sandbox.stub(dao.models, 'getAll').rejects(new Error('some error'));
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });
    });
  });
});

describe('/models/{name}', () => {
  let sandbox = sinon.sandbox.create();
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('PUT', () => {
    function req () {
      return {
        method: 'PUT',
        url: '/v2/models/testModel1',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
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
      let update;
      beforeEach(function* foo () {
        update = sandbox.stub(dao.models, 'update').resolves();
        sandbox.stub(dao.models, 'getOne').resolves({
          _rev: '12345',
          _id: req().payload._id,
          data: {
            entities: req().payload.entities,
            name: 'testModel1',
            changelog: [],
          }
        });
        res = yield server.inject(req());
      });

      it('calls update', () => {
        expect(update.callCount).to.equal(1);
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
      it('passes back errors', function* foo () {
        const dbError = new Error('conflict');
        dbError.status = 409;
        sandbox.stub(dao.models, 'update').rejects(dbError);
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(409);
      });

      it('passes back 500 errors for unknown codes', function* foo () {
        const dbError = new Error('some error');
        sandbox.stub(dao.models, 'update').rejects(dbError);
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });
    });
  });

  describe('DELETE', () => {
    function req () {
      return {
        method: 'DELETE',
        url: '/v2/models/testModel1',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        }
      };
    }

    describe('success', () => {
      let res;
      beforeEach(function* foo () {
        sandbox.stub(dao.models, 'delete').resolves();
        res = yield server.inject(req());
      });

      it('responds with code 204', () => {
        expect(res.statusCode).to.equal(204);
      });
    });

    describe('errors', () => {
      it('passes pouchdb errors on to the client', function* foo () {
        const dbError = new Error('conflict');
        dbError.status = 409;
        sandbox.stub(dao.models, 'delete').rejects(dbError);
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(409);
      });

      it('unknown errors come through as 500', function* foo () {
        sandbox.stub(dao.models, 'delete').rejects(new Error('some error'));
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
        sandbox.stub(dao.models, 'getOne').resolves(stubModel());
        res = yield server.inject(req());
      });

      it('has a status of 200', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns the correct number of entities', () => {
        expect(Reflect.ownKeys(res.result.entities).length).to.equal(2);
      });
    });

    describe('errors', () => {
      it('passes on errors to the client', function* foo () {
        const dbError = new Error('conflict');
        dbError.status = 409;
        sandbox.stub(dao.models, 'getOne').rejects(dbError);
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(409);
      });

      it('handles unknown errors by passing 500', function* foo () {
        sandbox.stub(dao.models, 'getOne').rejects(new Error('some message'));
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });
    });
  });
});
