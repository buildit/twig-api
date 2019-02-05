/* eslint no-unused-expressions: 0 */

'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSubset = require('chai-subset');
const {
  authAgent, anonAgent, url, addWait
} = require('../../../../../test/e2e');
const { createTwiglet, deleteTwiglet, baseTwiglet } = require('../twiglets.e2e');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

const { expect } = chai;
chai.use(chaiHttp);
chai.use(chaiSubset);

function createSequence (twigletName, sequence) {
  return addWait(authAgent.post(`/v2/twiglets/${twigletName}/sequences`).send(sequence));
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
  return addWait(authAgent.put(`/v2/twiglets/${twigletName}/sequences/${sequenceId}`).send(sequence));
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

      beforeEach(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        res = await createSequence(baseTwiglet().name, baseSequence());
      });

      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
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

      it('errors if the name has already been used', async () => {
        try {
          await createSequence(baseTwiglet().name, baseSequence());
        }
        catch (error) {
          expect(error).to.have.status(409);
        }
      });
    });
  });

  describe('GET /twiglets/{twigletName}/sequences', () => {
    describe('success', () => {
      let res;

      beforeEach(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        res = await createSequence(baseTwiglet().name, baseSequence());
        res = await getSequences(baseTwiglet().name);
      });

      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
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

  describe('GET /twiglets/{twigletName}/sequences/{sequenceId}', () => {
    describe('success', () => {
      let res;
      let sequenceSnapshot;

      beforeEach(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        await createSequence(baseTwiglet().name, baseSequence());
        [sequenceSnapshot] = (await getSequences(baseTwiglet().name)).body;
        res = await hitUrl(sequenceSnapshot.url);
      });

      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
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

  describe('PUT /twiglets/{twigletName}/sequences/{sequenceId}', () => {
    describe('success', () => {
      let res;
      let updates;
      let sequenceSnapshot;

      beforeEach(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        await createSequence(baseTwiglet().name, baseSequence());
        updates = baseSequence();
        updates.name = 'a different name';
        [sequenceSnapshot] = (await getSequences(baseTwiglet().name)).body;
        res = await updateSequence(baseTwiglet().name, sequenceSnapshot.id, updates);
      });

      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('contains the updated sequence', () => {
        expect(res.body.name).to.equal('a different name');
      });
    });

    describe('errors', () => {
      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
      });

      it('fails the update if the sequence name is already being used', async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        await createSequence(baseTwiglet().name, baseSequence());
        const anotherSequence = baseSequence();
        anotherSequence.name = 'sequence name 2';
        await createSequence(baseTwiglet().name, anotherSequence);
        const sequenceSnapshot = (await getSequences(baseTwiglet().name)).body[1];
        anotherSequence.name = 'sequence name';
        try {
          await updateSequence(baseTwiglet().name, sequenceSnapshot.id, anotherSequence);
        }
        catch (error) {
          expect(error).to.have.status(409);
        }
      });
    });
  });

  describe('DELETE /twiglets/{twigletName}/sequences/{sequenceId}', () => {
    describe('succcess', () => {
      let res;
      let sequenceSnapshot;

      beforeEach(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        await createSequence(baseTwiglet().name, baseSequence());
        [sequenceSnapshot] = (await getSequences(baseTwiglet().name)).body;
        res = await hitUrl(sequenceSnapshot.url, 'delete', true);
      });

      afterEach('Delete new twiglet', async () => {
        await deleteTwiglet(baseTwiglet());
        await deleteModel(baseModel());
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

      it('not included in the list of sequences', async () => {
        const sequences = (await getSequences(baseTwiglet().name)).body;
        expect(sequences.length).to.equal(0);
      });
    });
  });
});
