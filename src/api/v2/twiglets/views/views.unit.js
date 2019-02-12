'use strict';

/* eslint no-unused-expressions: 0 */
const { expect } = require('chai');
const sinon = require('sinon');
const PouchDb = require('pouchdb');
const Views = require('./views');
const init = require('../../../../../test/unit/test-server');
const { twigletInfo } = require('../twiglets.unit');
const { twigletDocs } = require('../twiglets.unit');

function getViewResults () {
  return {
    data: [
      {
        description: 'description of view',
        links: {},
        nodes: {},
        name: 'view name',
        userState: {
          autoConnectivity: 'in',
          cascadingCollapse: true,
          currentNode: null,
          filters: [{
            attributes: [],
            types: { }
          }],
          forceChargeStrength: 0.1,
          forceGravityX: 0.1,
          forceGravityY: 1,
          forceLinkDistance: 20,
          forceLinkStrength: 0.5,
          forceVelocityDecay: 0.9,
          linkType: 'path',
          scale: 8,
          showLinkLabels: false,
          showNodeLabels: false,
          traverseDepth: 3,
          treeMode: false,
        }
      }
    ]
  };
}

describe('/v2/Twiglet::Views', () => {
  let server;
  before(async () => {
    server = await init(Views.routes);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getViewsHandler', () => {
    function req () {
      return {
        method: 'GET',
        url: '/v2/twiglets/Some%20Twiglet/views',
      };
    }

    beforeEach(() => {
      const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
    });

    describe('success', () => {
      let response;


      beforeEach(function* foo () {
        sinon.stub(PouchDb.prototype, 'get').resolves(getViewResults());
        response = yield server.inject(req());
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('only returns 3 keys', () => {
        expect(Reflect.ownKeys(response.result[0]).length).to.equal(3);
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

  describe('getViewHandler', () => {
    function req () {
      return {
        method: 'GET',
        url: '/v2/twiglets/Some%20Twiglet/views/view%20name',
      };
    }

    beforeEach(() => {
      const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
    });

    describe('success', () => {
      let response;

      beforeEach(function* foo () {
        sinon.stub(PouchDb.prototype, 'get').resolves(getViewResults());
        response = yield server.inject(req());
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('returns the url', () => {
        const viewUrl = '/twiglets/Some%20Twiglet/views/view%20name';
        expect(response.result.url).to.exist.and.endsWith(viewUrl);
      });

      it('returns the correct userState settings', () => {
        expect(response.result.userState.showNodeLabels).to.equal(false);
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

  describe('postViewsHandler', () => {
    function req () {
      return {
        method: 'POST',
        url: '/v2/twiglets/Some%20Twiglet/views',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        },
        payload: {
          description: 'view description',
          links: {},
          nodes: {},
          name: 'test view',
          userState: {
            autoConnectivity: 'in',
            cascadingCollapse: true,
            currentNode: null,
            filters: [{
              attributes: [],
              types: { }
            }],
            forceChargeStrength: 0.1,
            forceGravityX: 0.1,
            forceGravityY: 1,
            forceLinkDistance: 20,
            forceLinkStrength: 0.5,
            forceVelocityDecay: 0.9,
            linkType: 'path',
            scale: 8,
            showLinkLabels: false,
            showNodeLabels: false,
            traverseDepth: 3,
            treeMode: false,
          }
        }
      };
    }

    describe('success', () => {
      let response;
      let put;
      beforeEach(function* foo () {
        const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves(twigletDocs());
        allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(3).resolves(twigletDocs());
        const get = sinon.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletDocs().rows[3].doc);
        sinon.stub(PouchDb.prototype, 'bulkDocs').resolves();
        put = sinon.stub(PouchDb.prototype, 'put').resolves(getViewResults());
        response = yield server.inject(req());
      });

      it('calls put', () => {
        expect(put.callCount).to.equal(2);
      });

      it('returns CREATED', () => {
        expect(response.statusCode).to.equal(201);
      });

      it('returns the new view', () => {
        expect(response.result).to.include.keys({ name: 'test view' });
      });
    });

    describe('errors', () => {
      let allDocs;
      beforeEach(() => {
        allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves(twigletDocs());
        allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(3).resolves(twigletDocs());
        const get = sinon.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletDocs().rows[3].doc);
        sinon.stub(PouchDb.prototype, 'bulkDocs').resolves();
      });

      it('relays the error', () => {
        sinon.stub(PouchDb.prototype, 'put').rejects({ status: 420 });
        return server.inject(req())
          .then((response) => {
            expect(response.result.statusCode).to.equal(420);
          });
      });
    });
  });

  describe('putViewsHandler', () => {
    function req () {
      return {
        method: 'PUT',
        url: '/v2/twiglets/Some%20Twiglet/views/view%20name',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        },
        payload: {
          description: 'view description',
          links: {},
          nodes: {},
          name: 'new view name',
          userState: {
            autoConnectivity: 'in',
            cascadingCollapse: true,
            currentNode: null,
            filters: [{
              attributes: [],
              types: { }
            }],
            forceChargeStrength: 0.1,
            forceGravityX: 0.1,
            forceGravityY: 1,
            forceLinkDistance: 20,
            forceLinkStrength: 0.5,
            forceVelocityDecay: 0.9,
            linkType: 'path',
            scale: 8,
            showLinkLabels: false,
            showNodeLabels: false,
            traverseDepth: 3,
            treeMode: false,
          }
        }
      };
    }

    describe('success', () => {
      let response;
      let put;
      let allDocs;
      beforeEach(function* foo () {
        allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        const get = sinon.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletDocs().rows[3].doc);
        sinon.stub(PouchDb.prototype, 'bulkDocs').resolves();
        put = sinon.stub(PouchDb.prototype, 'put').resolves(getViewResults());
        response = yield server.inject(req());
      });

      it('calls put', () => {
        expect(put.callCount).to.equal(2);
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('returns the updated view', () => {
        expect(response.result).to.include.keys({ name: 'new view name' });
      });
    });

    describe('errors', () => {
      let allDocs;
      beforeEach(() => {
        allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves(twigletDocs());
        allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(3).resolves(twigletDocs());
        const get = sinon.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletDocs().rows[3].doc);
        sinon.stub(PouchDb.prototype, 'bulkDocs').resolves();
      });

      it('relays the error', () => {
        sinon.stub(PouchDb.prototype, 'put').rejects({ status: 420 });
        return server.inject(req())
          .then((response) => {
            expect(response.result.statusCode).to.equal(420);
          });
      });
    });
  });

  describe('DELETE', () => {
    function req () {
      return {
        method: 'DELETE',
        url: '/v2/twiglets/Some%20Twiglet/views/view%20name',
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
      let response;
      beforeEach(function* foo () {
        const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves(twigletDocs());
        allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(3).resolves(twigletDocs());
        const get = sinon.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletDocs().rows[3].doc);
        sinon.stub(PouchDb.prototype, 'bulkDocs').resolves();
        sinon.stub(PouchDb.prototype, 'put').resolves(getViewResults());
        response = yield server.inject(req());
      });

      it('responds with code 204', () => {
        expect(response.statusCode).to.equal(204);
      });
    });

    describe('errors', () => {
      let allDocs;
      beforeEach(() => {
        allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves(twigletDocs());
        allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(3).resolves(twigletDocs());
        const get = sinon.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletDocs().rows[3].doc);
        sinon.stub(PouchDb.prototype, 'bulkDocs').resolves();
      });

      it('relays the error', () => {
        sinon.stub(PouchDb.prototype, 'put').rejects({ status: 420 });
        return server.inject(req())
          .then((response) => {
            expect(response.result.statusCode).to.equal(420);
          });
      });
    });
  });
});
