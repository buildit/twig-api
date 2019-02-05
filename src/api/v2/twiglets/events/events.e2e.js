/* eslint no-unused-expressions: 0 */

'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSubset = require('chai-subset');
const { authAgent, anonAgent, addWait } = require('../../../../../test/e2e');
const { createTwiglet, deleteTwiglet, baseTwiglet } = require('../twiglets.e2e');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

const { expect } = chai;
chai.use(chaiHttp);
chai.use(chaiSubset);

function createEvent (twigletName, event) {
  return addWait(authAgent.post(`/v2/twiglets/${twigletName}/events`).send(event));
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
    name: 'event name',
  };
}

describe.only('events', () => {
  describe('POST /twiglets/{twigletName}/events', () => {
    describe('success', () => {
      let res;

      beforeEach(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        res = await createEvent(baseTwiglet().name, baseEvent());
      });

      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
      });

      it('returns 201', () => {
        expect(res).to.have.status(201);
      });

      it('expects "OK" back', () => {
        expect(res.text).to.equal('OK');
      });
    });

    describe('errors', () => {
      beforeEach(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        await createEvent(baseTwiglet().name, baseEvent());
      });

      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
      });

      it('409 for names not being unique', async () => {
        try {
          await createEvent(baseTwiglet().name, baseEvent());
        }
        catch (error) {
          expect(error).to.have.status(409);
        }
      });
    });
  });

  describe('GET /twiglets/{twigletName}/events', () => {
    describe('success', () => {
      let res;

      beforeEach(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        res = await createEvent(baseTwiglet().name, baseEvent());
        res = await getEvents(baseTwiglet().name);
      });

      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
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

      beforeEach(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        await createEvent(baseTwiglet().name, baseEvent());
        [eventSnapshot] = (await getEvents(baseTwiglet().name)).body;
        res = await hitUrl(eventSnapshot.url);
      });

      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
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
        expect(res.body.nodes).to.deep.equal([]);
      });

      it('returns the nodes', () => {
        expect(res.body.nodes).to.deep.equal([]);
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

      beforeEach(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        await createEvent(baseTwiglet().name, baseEvent());
        [eventSnapshot] = (await getEvents(baseTwiglet().name)).body;
        res = await hitUrl(eventSnapshot.url, 'delete', true);
      });

      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
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

      it('not included in the list of events', async () => {
        const events = (await getEvents(baseTwiglet().name)).body;
        expect(events.length).to.equal(0);
      });
    });
  });

  describe('DELETE /twiglets/{twigletName}/events', () => {
    describe('success', () => {
      let res;
      let twiglet;

      beforeEach(async () => {
        await createModel(baseModel());
        twiglet = (await createTwiglet(baseTwiglet())).body;
        await createEvent(baseTwiglet().name, baseEvent());
        res = await hitUrl(twiglet.events_url, 'delete', true);
      });

      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
      });

      it('returns 204', () => {
        expect(res).to.have.status(204);
      });

      it('GET events returns empty array', async () => {
        const events = (await getEvents(baseTwiglet().name)).body;
        expect(events.length).to.equal(0);
      });

      it('returns 204 when no events', async () => {
        const secondResponse = await hitUrl(twiglet.events_url, 'delete', true);
        expect(secondResponse).to.have.status(204);
      });
    });
  });
});
