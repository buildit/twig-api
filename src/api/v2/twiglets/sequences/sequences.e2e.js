/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
'use strict';
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSubset = require('chai-subset');
const { authAgent, anonAgent, url } = require('../../../../../test/e2e');
const { createTwiglet, deleteTwiglet, baseTwiglet } = require('../twiglets.e2e');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

const expect = chai.expect;
chai.use(chaiHttp);
chai.use(chaiSubset);

function createSequence (twigletName, sequence) {
  return authAgent.post(`/v2/twiglets/${twigletName}/sequences`).send(sequence);
}

function hitUrl (firstUrl, type = 'get', auth = false) {
  let cleanedUrl = firstUrl;
  if (!cleanedUrl.startsWith('/v2')) {
    const index = cleanedUrl.indexOf('/v2');
    cleanedUrl = cleanedUrl.substring(index);
  }
  if (auth) {
    return authAgent[type](cleanedUrl);
  }
  return anonAgent[type](cleanedUrl);
}

function getSequences (twigletName) {
  return anonAgent.get(`/v2/twiglets/${twigletName}/sequences`);
}

function updateSequence (twigletName, sequenceId, sequence) {
  return authAgent.put(`/v2/twiglets/${twigletName}/sequences/${sequenceId}`).send(sequence);
}

function baseSequence () {
  return {
    description: 'some sequence',
    name: 'sequence name',
    events: [
      'f6b49795-0418-4ebd-ae52-adeb96885119',
      '1ff70005-08d6-4131-a8c9-e08f276a975b'
    ]
  };
}

describe('sequences', () => {
  describe('POST /twiglets/{twigletName}/sequences', () => {
    describe('success', () => {
      let res;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        res = yield createSequence(baseTwiglet().name, baseSequence());
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 201', () => {
        expect(res).to.have.status(201);
      });

      it('has an entity response', () => {
        expect(res.body).to.contain.keys({
          name: baseSequence().name,
          url: `${url}/twiglets/${baseTwiglet().name}/views/${baseSequence().name}`
        });
      });
    });
  });

  describe('GET /twiglets/{twigletName}/sequences', () => {
    describe('success', () => {
      let res;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        res = yield createSequence(baseTwiglet().name, baseSequence());
        res = yield getSequences(baseTwiglet().name);
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 200 (OK)', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns a list of sequences', () => {
        expect(res.body.length).to.equal(1);
      });

      it('returns the name', () => {
        expect(res.body[0].name).to.equal(baseSequence().name);
      });

      it('has a url', () => {
        expect(res.body[0].url).to.exist;
      });
    });
  });

  describe('GET /twiglets/{twigletName}/sequences/${sequenceId}', () => {
    describe('success', () => {
      let res;
      let sequenceSnapshot;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        yield createSequence(baseTwiglet().name, baseSequence());
        sequenceSnapshot = (yield getSequences(baseTwiglet().name)).body[0];
        res = yield hitUrl(sequenceSnapshot.url);
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 200 (OK)', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns the name', () => {
        expect(res.body.name).to.equal(baseSequence().name);
      });

      it('returns the description', () => {
        expect(res.body.description).to.equal(baseSequence().description);
      });

      it('returns the events', () => {
        expect(res.body.events).to.deep.equal(baseSequence().events);
      });

      it('returns the correct url', () => {
        expect(res.body.url).to.equal(sequenceSnapshot.url);
      });
    });
  });

  describe('PUT /twiglets/{twigletName}/sequences/${sequenceId}', () => {
    describe('success', () => {
      let res;
      let updates;
      let sequenceSnapshot;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        yield createSequence(baseTwiglet().name, baseSequence());
        updates = baseSequence();
        updates.name = 'a different name';
        sequenceSnapshot = (yield getSequences(baseTwiglet().name)).body[0];
        res = yield updateSequence(baseTwiglet().name, sequenceSnapshot.id, updates);
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('contains the updated sequence', () => {
        expect(res.body.name).to.equal('a different name');
      });
    });
  });

  describe('DELETE /twiglets/{twigletName}/sequences/${sequenceId}', () => {
    describe('succcess', () => {
      let res;
      let sequenceSnapshot;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        yield createSequence(baseTwiglet().name, baseSequence());
        sequenceSnapshot = (yield getSequences(baseTwiglet().name)).body[0];
        res = yield hitUrl(sequenceSnapshot.url, 'delete', true);
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 204', () => {
        expect(res).to.have.status(204);
      });

      it('GET event returns 404', (done) => {
        hitUrl(sequenceSnapshot.url)
          .end((err, response) => {
            expect(response).to.have.status(404);
            done();
          });
      });

      it('not included in the list of sequences', function* () {
        const sequences = (yield getSequences(baseTwiglet().name)).body;
        expect(sequences.length).to.equal(0);
      });
    });
  });
});
