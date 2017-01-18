'use strict';
/* eslint no-unused-expressions: 0 */
const expect = require('chai').expect;
const sinon = require('sinon');
require('sinon-as-promised');
const PouchDb = require('pouchdb');
const Models = require('./models');
const server = require('../../../test/unit/test-server');

server.route(Models.routes);

describe('/models/', () => {
  let sandbox = sinon.sandbox.create();
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
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
              id: 'bsc',
              key: 'bsc',
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
        expect(first._id).to.exist.and.equal('bsc');
        expect(first.url).to.exist.and.endsWith('/models/bsc');

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

describe.only('/models/{id}', () => {
  let sandbox = sinon.sandbox.create();
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('GET', () => {
    function req () {
      return {
        method: 'GET',
        url: '/models/bsc',
      };
    }
    describe('success', () => {
      let res;

      function stubModel () {
        return {
          _id: 'bsc',
          _rev: '12345',
          name: 'some name',
          data: {
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
        };
      }
      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves(stubModel());
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
