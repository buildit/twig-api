/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
'use strict';
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSubset = require('chai-subset');
const { authAgent, anonAgent } = require('../../../../../test/e2e');
const { createTwiglet, deleteTwiglet, baseTwiglet } = require('../twiglets.e2e');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

const expect = chai.expect;
chai.use(chaiHttp);
chai.use(chaiSubset);

function createEvent (twigletName, event) {
  return authAgent.post(`/v2/twiglets/${twigletName}/events`).send(event);
}

function hitUrl (url, type = 'get', auth = false) {
  let cleanedUrl = url;
  if (!cleanedUrl.startsWith('/v2')) {
    const index = cleanedUrl.indexOf('/v2');
    cleanedUrl = cleanedUrl.substring(index);
  }
  if (auth) {
    return authAgent[type](cleanedUrl);
  }
  return anonAgent[type](cleanedUrl);
}

function getEvents (twigletName) {
  return anonAgent.get(`/v2/twiglets/${twigletName}/events`);
}

function baseEvent () {
  return {
    description: 'description of event',
    links: [
      {
        id: '26ce4b06-af0b-4c29-8368-631441915e67',
        association: 'some name',
        source: 'c11000af-c3a5-4db8-a7ea-74255c6d672e',
        target: 'bb7d6af2-48ed-42f7-9fc1-705eb49b09bc',
      },
      {
        id: '626158d4-56db-4bfa-822b-9aaf7b17e88f',
        source: 'ab2752a2-cbc5-412d-87f8-fcc4d0000ee8',
        target: 'c11000af-c3a5-4db8-a7ea-74255c6d672e',
        attrs: [
          { key: 'key1', value: 'value1' },
          { key: 'key2', value: 'value2' }
        ],
      }
    ],
    nodes: [
      {
        id: 'c11000af-c3a5-4db8-a7ea-74255c6d672e',
        location: '',
        name: 'node 1',
        type: 'ent1',
        x: 100,
        y: 200,
        attrs: [],
      },
      {
        id: 'bb7d6af2-48ed-42f7-9fc1-705eb49b09bc',
        location: '',
        name: 'node 2',
        type: 'ent2',
        x: 200,
        y: 100,
        attrs: [
          { key: 'key1', value: 'value1' },
          { key: 'key2', value: 'value2' }
        ],
      },
      {
        id: 'ab2752a2-cbc5-412d-87f8-fcc4d0000ee8',
        location: '',
        name: 'node 3',
        type: 'ent3',
        x: 1000,
        y: 900,
        attrs: [],
      }
    ],
    name: 'event name',
    id: 'some id',
  };
}

describe.only('events', () => {
  describe('POST /twiglets/{twigletName}/events', () => {
    describe('success', () => {
      let res;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        res = yield createEvent(baseTwiglet().name, baseEvent());
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 201', () => {
        expect(res).to.have.status(201);
      });

      it('expects "OK" back', () => {
        expect(res.text).to.equal('OK');
      });
    });
  });

  describe('GET /twiglets/{twigletName}/events', () => {
    describe('success', () => {
      let res;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        res = yield createEvent(baseTwiglet().name, baseEvent());
        res = yield getEvents(baseTwiglet().name);
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 200 (OK)', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns a list of events', () => {
        expect(res.body.length).to.equal(1);
      });

      it('returns the name', () => {
        expect(res.body[0].name).to.equal(baseEvent().name);
      });

      it('returns the description', () => {
        expect(res.body[0].description).to.equal(baseEvent().description);
      });

      it('has a url', () => {
        expect(res.body[0].url).to.exist;
      });
    });
  });

  describe('GET /twiglets/{twigletName}/events/{eventId}', () => {
    describe('success', () => {
      let res;
      let eventSnapshot;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        yield createEvent(baseTwiglet().name, baseEvent());
        eventSnapshot = (yield getEvents(baseTwiglet().name)).body[0];
        res = yield hitUrl(eventSnapshot.url);
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 200 (OK)', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns the name', () => {
        expect(res.body.name).to.equal(baseEvent().name);
      });

      it('returns the description', () => {
        expect(res.body.description).to.equal(baseEvent().description);
      });

      it('returns the links', () => {
        expect(res.body.nodes).to.deep.equal(baseEvent().nodes);
      });

      it('returns the nodes', () => {
        expect(res.body.nodes).to.deep.equal(baseEvent().nodes);
      });

      it('returns the correct url', () => {
        expect(res.body.url).to.equal(eventSnapshot.url);
      });
    });
  });

  describe('DELETE /twiglets/{twigletName}/events/{eventId}', () => {
    describe('success', () => {
      let res;
      let eventSnapshot;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        yield createEvent(baseTwiglet().name, baseEvent());
        eventSnapshot = (yield getEvents(baseTwiglet().name)).body[0];
        res = yield hitUrl(eventSnapshot.url, 'delete', true);
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 204', () => {
        expect(res).to.have.status(204);
      });

      it('GET event returns 404', (done) => {
        hitUrl(eventSnapshot.url)
          .end((err, response) => {
            expect(response).to.have.status(404);
            done();
          });
      });

      it('not included in the list of events', function* () {
        const events = (yield getEvents(baseTwiglet().name)).body;
        expect(events.length).to.equal(0);
      });
    });
  });
});
