'use strict';

/* eslint no-unused-expressions: 0 */
const { expect } = require('chai');
const sinon = require('sinon');
const PouchDb = require('pouchdb');
const Model = require('./model');
const init = require('../../../../../test/unit/test-server');
const { twigletInfo } = require('../twiglets.unit');

describe('/v2/Twiglet::Models', () => {
  let server;

  before(async () => {
    server = await init(Model.routes);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getModelHandler', () => {
    function req () {
      return {
        method: 'GET',
        url: '/v2/twiglets/Some%20Twiglet/model',
      };
    }

    beforeEach(() => {
      const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
    });

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
                image: '',
                attributes: [{ name: 'name1', dataType: 'string', required: true }],
              },
              client: {
                type: 'client',
                color: '#aec7e8',
                size: '40',
                class: 'building',
                image: '',
                attributes: [],
              },
            },
          },
        };
      }

      beforeEach(function* foo () {
        sinon.stub(PouchDb.prototype, 'get').resolves(getModelResults());
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

    describe('twiglet uses old model style', () => {
      let result;
      function getModelResults () {
        return {
          _rev: 'some revision number',
          data: {
            entities: {
              organisation: {
                color: '#1f77b4',
                size: '50',
                class: 'amazon',
                image: '',
              },
              client: {
                type: 'client',
                color: '#aec7e8',
                size: '40',
                class: 'building',
                image: '',
                attributes: [{ name: 'name1', dataType: 'string', required: true }],
              },
            },
          },
        };
      }

      beforeEach(function* foo () {
        sinon.stub(PouchDb.prototype, 'get').resolves(getModelResults());
        ({ result } = (yield server.inject(req())));
      });

      it('adds a type if it does not exist', () => {
        expect(result.entities.organisation.type).to.equal('organisation');
      });

      it('adds attributes with an empty array if it does not exist', () => {
        expect(result.entities.organisation.attributes).to.deep.equal([]);
      });

      it('does not overwrite existing attributes', () => {
        expect(result.entities.client.attributes).to.deep
          .equal([{ name: 'name1', dataType: 'string', required: true }]);
      });
    });

    describe('errors', () => {
      it('relays errors', function* foo () {
        sinon.stub(PouchDb.prototype, 'get').rejects({ status: 420 });
        const response = yield server.inject(req());
        expect(response.statusCode).to.equal(420);
      });

      it('passes 500 for unknown errors', function* foo () {
        sinon.stub(PouchDb.prototype, 'get').rejects({ message: 'some message' });
        const response = yield server.inject(req());
        expect(response.statusCode).to.equal(500);
      });
    });
  });
});
