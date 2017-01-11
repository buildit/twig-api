/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
'use strict';
const chai = require('chai');
const chaiHttp = require('chai-http');
const { authAgent, anonAgent, url } = require('../../../test/e2e');

const expect = chai.expect;
chai.use(chaiHttp);

function createTwiglet (twiglet) {
  return authAgent.post('/twiglets').send(twiglet);
}

function getTwiglet ({ _id }) {
  return anonAgent.get(`/twiglets/${_id}`);
}

function getTwiglets () {
  return anonAgent.get('/twiglets');
}

function deleteTwiglet ({ _id }) {
  return authAgent.delete(`/twiglets/${_id}`);
}

const baseTwiglet = {
  _id: 'test-c44e6001-1abd-483f-a8ab-bf807da7e455',
  name: 'test-c44e6001-1abd-483f-a8ab-bf807da7e455',
  description: 'foo bar baz',
  model: 'fake model',
  commitMessage: 'fee fie fo fum'
};

describe('/twiglets', () => {
  describe('POST', () => {
    describe('Successful', () => {
      let res;

      before(function* () {
        // act
        res = yield createTwiglet(baseTwiglet);
      });

      it('returns 201', () => {
        expect(res).to.have.status(201);
      });

      it('has Location header', () => {
        expect(res).to.have.header('Location', `${url}/twiglets/${baseTwiglet._id}`);
      });

      it('has an entity response', () => {
        expect(res.body).to.contain.all.keys({
          _id: baseTwiglet._id,
          url: `${url}/twiglets/${baseTwiglet._id}`
        });
        expect(res.body).to.contain.all.keys(['_rev']);
      });

      after(() => deleteTwiglet(baseTwiglet));
    });
  });

  describe('GET', () => {
    describe('Successful', () => {
      let res;
      let createdTwiglet;

      before(function* () {
        res = yield createTwiglet(baseTwiglet);
        createdTwiglet = res.body;
        res = yield getTwiglets();
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('returns a list of twiglets', () => {
        expect(res.body).to.deep.include(createdTwiglet);
      });

      after(() => deleteTwiglet(baseTwiglet));
    });
  });
});

describe('/twiglets/{id}', () => {
  describe('GET', () => {
    describe.only('Successful', () => {
      let res;

      before(function* () {
        yield createTwiglet(baseTwiglet);
        res = yield getTwiglet({ _id: baseTwiglet._id });
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('contains the twiglet', () => {
        expect(res.body).to.deep.equal(baseTwiglet);
      });

      after(() => deleteTwiglet(baseTwiglet));
    });
  });

  describe('DELETE', () => {
    describe('Successful', () => {
      let res;

      before(function* () {
        yield createTwiglet(baseTwiglet);
        res = yield deleteTwiglet(baseTwiglet);
      });

      it('returns 204', () => {
        expect(res).to.have.status(204);
      });

      it('GET twiglet returns 404', (done) => {
        getTwiglet({ _id: baseTwiglet._id })
          .end((err, response) => {
            expect(response).to.have.status(404);
            done();
          });
      });

      it('not included in the list of twiglets', function* () {
        const twiglets = yield getTwiglets();
        expect(twiglets.body).to.not.deep.contains(baseTwiglet);
      });

      it('returns 404 when twiglet doesnt exist', (done) => {
        deleteTwiglet(baseTwiglet)
          .end((err, response) => {
            expect(response).to.have.status(404);
            done();
          });
      });
    });
  });
});


module.exports = { createTwiglet, deleteTwiglet, getTwiglet, baseTwiglet };
