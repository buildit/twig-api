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
          _rev: 'some revision number',
          data: [
            {
              _id: 'some id number',
              collapsed_nodes: [],
              description: 'description of view',
              display_name: 'view display name',
              fixed_nodes: {
                'node 1': {
                  rel_x: 0.2564247562344604,
                  rel_y: 0.48870828711778064
                }
              },
              link_types: {},
              name: 'view name',
              nav: {
                scale: '3',
                'show-node-label': false
              },
              node_types: {}
            },
          ],
        };
      }

      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves(getViewResults());
        response = yield server.inject(req());
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('only returns 3 keys', () => {
        expect(Reflect.ownKeys(response.result).length).to.equal(3);
      });

      it('returns the the _rev field', () => {
        expect(response.result._rev).to.equal(getViewResults()._rev);
      });

      it('returns the url', () => {
        expect(response.result.url).to.exist.and.endsWith('/twiglets/Some%20Twiglet/views');
      });

      it('returns the views', () => {
        expect(response.result.views).to.have.length.of(1);
        expect(response.result.views[0]).to.deep.equal(getViewResults().data[0]);
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
