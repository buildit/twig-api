'use strict';
/* eslint no-unused-expressions: 0 */
const expect = require('chai').expect;
const sinon = require('sinon');
require('sinon-as-promised');
const PouchDb = require('pouchdb');
const Views = require('./views');
const server = require('../../../../test/unit/test-server');
const twigletInfo = require('../twiglets.unit').twigletInfo;

server.route(Views.routes);

describe('Twiglet::Views', () => {
  let sandbox = sinon.sandbox.create();
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getViewsHandler', () => {
    function req () {
      return {
        method: 'GET',
        url: '/twiglets/Some%20Twiglet/views',
      };
    }

    beforeEach(() => {
      const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
    });

    describe('success', () => {
      let response;
      function getViewResults () {
        return {
          data: [
            {
              _rev: 'some revision number',
              description: 'description of view',
              name: 'view name',
            }
          ]
        };
      }

      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves(getViewResults());
        response = yield server.inject(req());
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('only returns 4 keys', () => {
        expect(Reflect.ownKeys(response.result[0]).length).to.equal(4);
      });

      it('returns the the _rev field', () => {
        expect(response.result[0]._rev).to.equal(getViewResults().data[0]._rev);
      });

      it('returns the url', () => {
        const viewUrl = '/twiglets/Some%20Twiglet/views/view%20name';
        expect(response.result[0].url).to.exist.and.endsWith(viewUrl);
      });

      it('returns the views', () => {
        expect(response.result).to.have.length.of(1);
        expect(response.result[0].name).to.deep.equal(getViewResults().data[0].name);
      });
    });

    describe('errors', () => {
      it('relays errors', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 420 });
        const response = yield server.inject(req());
        expect(response.statusCode).to.equal(420);
      });

      it('passes 500 for unknown errors', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ message: 'some message' });
        const response = yield server.inject(req());
        expect(response.statusCode).to.equal(500);
      });
    });
  });

  describe('getViewHandler', () => {
    function req () {
      return {
        method: 'GET',
        url: '/twiglets/Some%20Twiglet/views/view%20name',
      };
    }

    beforeEach(() => {
      const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
    });

    describe('success', () => {
      let response;
      function getViewResults () {
        return {
          data: [
            {
              _rev: 'some revision number',
              description: 'description of view',
              name: 'view name',
              data: {
                _rev: 'some revision number',
                collapsed_nodes: [],
                description: 'description of view',
                display_name: 'view display',
                fixed_nodes: {},
                link_types: {},
                name: 'view name',
                nav: {
                  scale: '3',
                  'show-node-label': false
                },
                node_types: {}
              }
            }
          ]
        };
      }

      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves(getViewResults());
        response = yield server.inject(req());
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('returns the the _rev field', () => {
        expect(response.result._rev).to.equal(getViewResults().data[0]._rev);
      });

      it('returns the url', () => {
        const viewUrl = '/twiglets/Some%20Twiglet/views/view%20name';
        expect(response.result.url).to.exist.and.endsWith(viewUrl);
      });

      it('returns the correct nav settings', () => {
        expect(response.result.nav['show-node-label']).to.equal(false);
      });
    });

    describe('errors', () => {
      it('relays errors', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 420 });
        const response = yield server.inject(req());
        expect(response.statusCode).to.equal(420);
      });

      it('passes 500 for unknown errors', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ message: 'some message' });
        const response = yield server.inject(req());
        expect(response.statusCode).to.equal(500);
      });
    });
  });
});
