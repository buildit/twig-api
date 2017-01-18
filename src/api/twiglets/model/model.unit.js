'use strict';
/* eslint no-unused-expressions: 0 */
const expect = require('chai').expect;
const sinon = require('sinon');
require('sinon-as-promised');
const PouchDb = require('pouchdb');
const Model = require('./model');
const server = require('../../../../test/unit/test-server');

server.route(Model.routes);

describe('Twiglet::Models', () => {
  let sandbox = sinon.sandbox.create();
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getModelHandler', () => {
    function req () {
      return {
        method: 'GET',
        url: '/twiglets/{id}/model',
      };
    }

    describe('success', () => {
      let response;
      function getModelResults () {
        return {
          _rev: 'some revision number',
          data: {
            entities: {
              organisation: {
                type: 'organisation',
                color: '#1f77b4',
                size: '50',
                class: 'amazon',
                image: ''
              },
              client: {
                type: 'client',
                color: '#aec7e8',
                size: '40',
                class: 'building',
                image: ''
              },
            }
          }
        };
      }

      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'info').resolves();
        sandbox.stub(PouchDb.prototype, 'get').resolves(getModelResults());
        response = yield server.inject(req());
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('only returns 2 keys', () => {
        expect(Reflect.ownKeys(response.result).length).to.equal(2);
      });

      it('returns the the _rev field', () => {
        expect(response.result._rev).to.equal(getModelResults()._rev);
      });

      it('returns the entities', () => {
        expect(response.result.entities).to.deep.equal(getModelResults().data.entities);
      });
    });

    describe('errors', () => {
      beforeEach(() => {
        sandbox.stub(PouchDb.prototype, 'info').resolves();
      });

      it('relays errors', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 420 });
        const response = yield server.inject(req());
        expect(response.statusCode).to.equal(420);
      });

      it('passes 500 for unknown errors', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects();
        const response = yield server.inject(req());
        expect(response.statusCode).to.equal(500);
      });
    });
  });
});
