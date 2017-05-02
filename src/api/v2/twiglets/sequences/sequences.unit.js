'use strict';
/* eslint no-unused-expressions: 0 */
const expect = require('chai').expect;
const sinon = require('sinon');
require('sinon-as-promised');
const PouchDb = require('pouchdb');
const Sequences = require('./sequences');
const server = require('../../../../../test/unit/test-server');
const twigletInfo = require('../twiglets.unit').twigletInfo;
const twigletDocs = require('../twiglets.unit').twigletDocs;

server.route(Sequences.routes);

describe('/v2/Twiglet::Sequences', () => {
  let sandbox = sinon.sandbox.create();
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getSequencesHandler', () => {
    function req () {
      return {
        method: 'GET',
        url: '/v2/twiglets/Some%20Twiglet/sequences',
      };
    }

    beforeEach(() => {
      const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
    });

    describe('success', () => {
      let response;

      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[5].doc);
        response = yield server.inject(req());
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('only returns 4 keys per event', () => {
        expect(Reflect.ownKeys(response.result[0]).length).to.equal(4);
      });

      it('returns the url', () => {
        const seqUrl = '/twiglets/Some%20Twiglet/sequences/75c4dc47-4131-4503-aa82-2c09ead3f357';
        expect(response.result[0].url).to.exist.and.endsWith(seqUrl);
      });

      it('returns the sequences', () => {
        expect(response.result).to.have.length.of(2);
      });
    });

    describe('errors', () => {
      it('returns an empty array if there are no sequences on the twiglet yet', function* foo () {
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

  describe('getSequenceHandler', () => {
    const sequence = twigletDocs().rows[5].doc.data[0];
    function req () {
      return {
        method: 'GET',
        url: '/v2/twiglets/Some%20Twiglet/sequences/75c4dc47-4131-4503-aa82-2c09ead3f357',
      };
    }

    beforeEach(() => {
      const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
    });

    describe('success', () => {
      let response;

      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[5].doc);
        response = yield server.inject(req());
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('returns the description', () => {
        expect(response.result.description).to.exist.and.equal(sequence.description);
      });

      it('returns the name', () => {
        expect(response.result.name).to.exist.and.equal(sequence.name);
      });

      it('returns the events', () => {
        expect(response.result.events).to.exist.and.deep.equal(sequence.events);
      });

      it('returns the url', () => {
        const seqUrl = '/twiglets/Some%20Twiglet/sequences/75c4dc47-4131-4503-aa82-2c09ead3f357';
        expect(response.result.url).to.exist.and.endsWith(seqUrl);
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

  describe('postSequencesHandler', () => {
    function req () {
      return {
        method: 'POST',
        url: '/v2/twiglets/Some%20Twiglet/sequences',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        },
        payload: {
          description: 'some description',
          name: 'Sequence of Hires',
          events: [
            '1ff70005-08d6-4131-a8c9-e08f276a975b',
            '2a0e95d9-91c5-4a64-b283-bd94195a8ef6'
          ]
        }
      };
    }

    describe('success', () => {
      let response;
      let put;
      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [{ doc: (twigletInfo()) }] });
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[5].doc);
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

      it('returns the new sequence', () => {
        expect(response.result).to.include.keys({ name: 'Sequence of Hires' });
      });
    });

    describe('there is no sequences table on the twiglet', () => {
      let response;
      let put;
      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [{ doc: (twigletInfo()) }] });
        const get = sandbox.stub(PouchDb.prototype, 'get')
            .resolves(twigletDocs().rows[5].doc);
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

      it('returns the new sequence', () => {
        expect(response.result).to.include.keys({ name: 'Sequence of Hires' });
      });
    });

    describe('errors', () => {
      beforeEach(() => {
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [{ doc: (twigletInfo()) }] });
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[5].doc);
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

  describe('putSequenceHandler', () => {
    function req () {
      return {
        method: 'PUT',
        url: '/v2/twiglets/Some%20Twiglet/sequences/75c4dc47-4131-4503-aa82-2c09ead3f357',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        },
        payload: {
          description: 'some description',
          name: 'new sequence name',
          events: [
            'f6b49795-0418-4ebd-ae52-adeb96885119',
            '1ff70005-08d6-4131-a8c9-e08f276a975b'
          ]
        }
      };
    }

    describe('success', () => {
      let response;
      let put;
      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [{ doc: (twigletInfo()) }] });
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[5].doc);
        put = sandbox.stub(PouchDb.prototype, 'put').resolves('');
        response = yield server.inject(req());
      });

      it('calls put', () => {
        expect(put.callCount).to.equal(1);
      });

      it('has a status of OK', () => {
        expect(response.statusCode).to.equal(200);
      });

      it('returns the updated sequence', () => {
        expect(response.result).to.include.keys({ name: 'new sequence name' });
      });
    });

    describe('errors', () => {
      beforeEach(() => {
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [{ doc: (twigletInfo()) }] });
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[5].doc);
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

  describe('deleteSequenceHandler', () => {
    function req () {
      return {
        method: 'DELETE',
        url: '/v2/twiglets/Some%20Twiglet/sequences/75c4dc47-4131-4503-aa82-2c09ead3f357',
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
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[5].doc);
        put = sandbox.stub(PouchDb.prototype, 'put').resolves('');
        response = yield server.inject(req());
      });

      it('responds with code 204', () => {
        expect(response.statusCode).to.equal(204);
      });

      it('slices out the correct event', () => {
        expect(put.firstCall.args[0].data[0].name).to.equal('sequence 2');
      });
    });

    describe('errors', () => {
      let response;
      beforeEach(function* foo () {
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves({ rows: [{ doc: (twigletInfo()) }] });
        sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[5].doc);
        sandbox.stub(PouchDb.prototype, 'put').rejects({ status: 420 });
        response = yield server.inject(req());
      });

      it('relays the error', () => {
        expect(response.result.statusCode).to.equal(420);
      });
    });
  });
});
