'use strict';
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
chai.use(require('chai-string'));
const sinon = require('sinon');
require('sinon-as-promised');
const PouchDb = require('pouchdb');
const Models = require('./models');
const server = require('../../../test/unit/test-server');

const expect = chai.expect;
server.route(Models.routes);

function stubModel () {
  return {
    _id: 'testModel',
    _rev: '12345',
    name: 'some name',
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

describe('/models/', () => {
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
        url: '/models',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        },
        payload: {
          _id: 'anId',
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
        },
      };
    }

    describe('success', () => {
      let res;

      beforeEach(function* foo () {
        const get = sandbox.stub(PouchDb.prototype, 'get');
        get.onFirstCall().rejects({ status: 404 });
        const secondGet = req().payload;
        secondGet._rev = 'some rev';
        get.onSecondCall().resolves(secondGet);
        sandbox.stub(PouchDb.prototype, 'put').resolves();
        res = yield server.inject(req());
      });

      it('returns a status code of "Created"', () => {
        expect(res.statusCode).to.equal(201);
      });

      it('returns a url', () => {
        expect(res.result.url).to.endsWith('/models/anId');
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
        sandbox.stub(PouchDb.prototype, 'get').resolves();
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(409);
      });

      it('passes database errors on to the client', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 419, message: 'teapots' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(419);
        expect(res.result.message).to.equal('teapots');
      });

      it('unknown errors are passed as 500', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ message: 'not teapots' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });

      it('handles passes on put errors to the client', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 404 });
        sandbox.stub(PouchDb.prototype, 'put').rejects({ status: 419, message: 'teapots' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(419);
      });

      it('handles passes on put errors to the client', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 404 });
        sandbox.stub(PouchDb.prototype, 'put').rejects({ message: 'not teapots' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });
    });
  });

  describe('GET', () => {
    function req () {
      return {
        method: 'GET',
        url: '/models',
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
            },
            {
              id: 'buildit',
              key: 'buildit',
              value: { rev: '67890' },
              doc: {
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
          ]
        };
      }
      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves(stubModels());
        res = yield server.inject(req());
      });

      it('has a status of 200', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns the correct number of models', () => {
        expect(res.result.length).to.equal(2);
      });

      it('returns model ids and url to accesss more', () => {
        const first = res.result[0];
        expect(first).to.have.keys(['_id', 'url']);
        expect(first._id).to.exist.and.equal('testModel');
        expect(first.url).to.exist.and.endsWith('/models/testModel');

        const second = res.result[1];
        expect(first).to.have.keys(['_id', 'url']);
        expect(second._id).to.exist.and.equal('buildit');
        expect(second.url).to.exist.and.endsWith('/models/buildit');
      });
    });

    describe('errors', () => {
      it('passes on errors to the client', function* foo () {
        sandbox.stub(PouchDb.prototype, 'allDocs').rejects({ status: 418 });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(418);
      });

      it('handles unknown errors by passing 500', function* foo () {
        sandbox.stub(PouchDb.prototype, 'allDocs').rejects({ message: 'some message' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });
    });
  });
});

describe('/models/{id}', () => {
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
        url: '/models/testModel',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        },
        payload: {
          _id: 'testModel',
          _rev: '12345',
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
        sandbox.stub(PouchDb.prototype, 'get').resolves(stubModel());
        put = sandbox.stub(PouchDb.prototype, 'put').resolves();
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
        sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 404, message: 'Not Found' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(404);
      });

      it('errors if _rev does not match and sends back _rev for overwrite', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves(stubModel());
        const badRev = req();
        badRev.payload._rev = 'wrong!';
        const res = yield server.inject(badRev);
        expect(res.statusCode).to.equal(409);
        expect(res.result._rev).to.equal('12345');
      });

      it('passes database error codes on to the client', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves(stubModel());
        sandbox.stub(PouchDb.prototype, 'put').rejects({ status: 419, message: 'teapots' });
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
        url: '/models/1234',
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
        sandbox.stub(PouchDb.prototype, 'get').resolves({ _rev: 'some rev' });
        sandbox.stub(PouchDb.prototype, 'remove').resolves();
        res = yield server.inject(req());
      });

      it('responds with code 204', () => {
        expect(res.statusCode).to.equal(204);
      });
    });

    describe('errors', () => {
      it('responds with 404 if the model cannot be found', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 404, message: 'Not Found!' });
        sandbox.stub(PouchDb.prototype, 'remove').resolves();
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(404);
        expect(res.result.message).to.equal('Not Found!');
      });

      it('responds with an error if it cannot delete the model', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves({ _rev: 'some rev' });
        sandbox.stub(PouchDb.prototype, 'remove').rejects({ status: 409, message: 'Conflict!' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(409);
        expect(res.result.message).to.equal('Conflict!');
      });

      it('unknown errors come through as 500', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves({ _rev: 'some rev' });
        sandbox.stub(PouchDb.prototype, 'remove').rejects({ message: 'some error' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });
    });
  });

  describe('GET', () => {
    function req () {
      return {
        method: 'GET',
        url: '/models/testModel',
      };
    }
    describe('success', () => {
      let res;

      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves(stubModel());
        res = yield server.inject(req());
      });

      it('has a status of 200', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns the correct number of entities', () => {
        console.log('res.result', res.result);
        expect(Reflect.ownKeys(res.result.entities).length).to.equal(2);
      });
    });

    describe('errors', () => {
      it('passes on errors to the client', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 418 });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(418);
      });

      it('handles unknown errors by passing 500', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ message: 'some message' });
        const res = yield server.inject(req());
        expect(res.statusCode).to.equal(500);
      });
    });
  });
});
