'use strict';

/* eslint no-unused-expressions: 0 */
const expect = require('chai').expect;
const sinon = require('sinon');
require('sinon-as-promised');
const PouchDb = require('pouchdb');
const Events = require('./events');
const server = require('../../../../../test/unit/test-server');
const twigletInfo = require('../twiglets.unit').twigletInfo;
const twigletDocs = require('../twiglets.unit').twigletDocs;

server.route(Events.routes);

describe('/v2/Twiglet::Events', () => {
  let sandbox = sinon.sandbox.create();
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getEventsHandler', () => {
    function req () {
      return {
        method: 'GET',
        url: '/v2/twiglets/Some%20Twiglet/events',
      };
    }

    beforeEach(() => {
      const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
    });

    describe('success', () => {
      let response;

      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[4].doc);
        response = yield server.inject(req());
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('only returns 4 keys per event', () => {
        expect(Reflect.ownKeys(response.result[0]).length).to.equal(4);
      });

      it('returns the url', () => {
        const eventUrl = '/twiglets/Some%20Twiglet/events/bd79213c-8e17-49bc-9fc2-392f3c5acd28';
        expect(response.result[0].url).to.exist.and.endsWith(eventUrl);
      });

      it('returns the events', () => {
        expect(response.result).to.have.length.of(2);
      });
    });

    describe('errors', () => {
      it('returns an empty array if there are no events on the twiglet yet', function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 404 });
        const response = yield server.inject(req());
        expect(response.result).to.deep.equal([]);
      });

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

  describe('getEventHandler', () => {
    const event = twigletDocs().rows[4].doc.data[0];
    function req () {
      return {
        method: 'GET',
        url: '/v2/twiglets/Some%20Twiglet/events/bd79213c-8e17-49bc-9fc2-392f3c5acd28',
      };
    }

    beforeEach(() => {
      const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
    });

    describe('success', () => {
      let response;

      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[4].doc);
        response = yield server.inject(req());
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('returns the description', () => {
        expect(response.result.description)
          .to.exist.and.equal(event.description);
      });

      it('returns the links', () => {
        expect(response.result.links).to.exist.and.deep.equal(event.links);
      });

      it('returns the name', () => {
        expect(response.result.name).to.exist.and.equal(event.name);
      });

      it('returns the nodes', () => {
        expect(response.result.nodes).to.exist.and.deep.equal(event.nodes);
      });

      it('returns the url', () => {
        const eventUrl = '/twiglets/Some%20Twiglet/events/bd79213c-8e17-49bc-9fc2-392f3c5acd28';
        expect(response.result.url).to.exist.and.endsWith(eventUrl);
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

  describe('postEventsHandler', () => {
    function req () {
      return {
        method: 'POST',
        url: '/v2/twiglets/Some%20Twiglet/events',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        },
        payload: {
          description: 'some description',
          name: 'Ben got fired',
        }
      };
    }

    describe('success', () => {
      let response;
      let put;
      beforeEach(function* foo () {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves({
          rows: [
            {
              doc: {
                data: [],
              }
            },
            {
              doc: {
                data: [],
              }
            }
          ]
        });
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[4].doc);
        put = sandbox.stub(PouchDb.prototype, 'put').resolves('');
        response = yield server.inject(req());
      });

      it('calls put', () => {
        expect(put.callCount).to.equal(1);
      });

      it('pushes the new event to the array', () => {
        expect(put.firstCall.args[0].data.length).to.equal(3);
      });

      it('returns CREATED', () => {
        expect(response.statusCode).to.equal(201);
      });

      it('returns OK', () => {
        expect(response.result).to.equal('OK');
      });
    });

    describe('there is no events table on the twiglet', () => {
      let response;
      let put;
      beforeEach(function* foo () {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves({
          rows: [
            {
              doc: {
                data: [],
              }
            },
            {
              doc: {
                data: [],
              }
            }
          ]
        });
        const get = sandbox.stub(PouchDb.prototype, 'get')
          .resolves(twigletDocs().rows[4].doc);
        get.onFirstCall().rejects({ status: 404 });
        put = sandbox.stub(PouchDb.prototype, 'put').resolves('');
        response = yield server.inject(req());
      });

      it('calls put', () => {
        expect(put.callCount).to.equal(2);
      });

      it('pushes the new event to the array', () => {
        expect(put.secondCall.args[0].data.length).to.equal(3);
      });

      it('returns CREATED', () => {
        expect(response.statusCode).to.equal(201);
      });

      it('returns OK', () => {
        expect(response.result).to.equal('OK');
      });
    });

    describe('errors', () => {
      beforeEach(() => {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves({
          rows: [
            {
              doc: {
                data: [],
              }
            },
            {
              doc: {
                data: [],
              }
            }
          ]
        });
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[4].doc);
      });

      it('relays the error', () => {
        sandbox.stub(PouchDb.prototype, 'put').rejects({ status: 420 });
        return server.inject(req())
          .then((response) => {
            expect(response.result.statusCode).to.equal(420);
          });
      });
    });
  });

  describe('DELETE one event', () => {
    function req () {
      return {
        method: 'DELETE',
        url: '/v2/twiglets/Some%20Twiglet/events/bd79213c-8e17-49bc-9fc2-392f3c5acd28',
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
      let put;
      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [{ doc: (twigletInfo()) }] });
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[4].doc);
        put = sandbox.stub(PouchDb.prototype, 'put').resolves('');
        response = yield server.inject(req());
      });

      it('responds with code 204', () => {
        expect(response.statusCode).to.equal(204);
      });

      it('slices out the correct event', () => {
        expect(put.firstCall.args[0].data[0].name).to.equal('event 2');
      });
    });

    describe('errors', () => {
      let response;
      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [{ doc: (twigletInfo()) }] });
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[4].doc);
        sandbox.stub(PouchDb.prototype, 'put').rejects({ status: 420 });
        response = yield server.inject(req());
      });

      it('relays the error', () => {
        expect(response.result.statusCode).to.equal(420);
      });
    });
  });

  describe('DELETE all events', () => {
    function req () {
      return {
        method: 'DELETE',
        url: '/v2/twiglets/Some%20Twiglet/events',
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
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [{ doc: (twigletInfo()) }] });
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[4].doc);
        sandbox.stub(PouchDb.prototype, 'remove').resolves({ });
        response = yield server.inject(req());
      });

      it('responds with code 204', () => {
        expect(response.statusCode).to.equal(204);
      });
    });

    describe('errors', () => {
      let response;
      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [{ doc: (twigletInfo()) }] });
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[4].doc);
        sandbox.stub(PouchDb.prototype, 'remove').rejects({ status: 420 });
        response = yield server.inject(req());
      });

      it('relays the error', () => {
        expect(response.result.statusCode).to.equal(420);
      });
    });
  });
});
