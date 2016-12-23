/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
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

function deleteTwiglet ({ _id }) {
  return authAgent.delete(`/twiglets/${_id}`);
}

describe('/twiglets', () => {
  describe('POST', () => {
    describe('Successful', () => {
      const twiglet = {
        _id: 'twig-c44e6001-1abd-483f-a8ab-bf807da7e455',
      };
      let res;

      before(function* () {
        // act
        res = yield createTwiglet(twiglet);
      });

      it('returns 201', () => {
        expect(res).to.have.status(201);
      });

      it('has Location header', () => {
        expect(res).to.have.header('Location', `${url}/twiglets/${twiglet._id}`);
      });

      it('has an entity response', () => {
        expect(res.body).to.deep.equal({ url: `${url}/twiglets/${twiglet._id}` });
      });

      after(() => deleteTwiglet(twiglet));
    });
  });
});

describe('/twiglets/{id}', () => {
  describe('GET', () => {
    describe('Successful', () => {
      const twiglet = {
        _id: 'twig-0b88190e-930e-4272-b428-bfaab00dc580',
      };
      let res;

      before(function* () {
        yield createTwiglet(twiglet);
        res = yield getTwiglet({ _id: twiglet._id });
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('contains the twiglet', () => {
        expect(res.body).to.deep.equal(twiglet);
      });

      after(() => deleteTwiglet(twiglet));
    });
  });

  describe('DELETE', () => {
    describe('Successful', () => {
      const twiglet = {
        _id: 'twig-c44e6001-1abd-483f-a8ab-bf807da7e455',
      };
      let res;

      before(function* () {
        yield createTwiglet(twiglet);
        res = yield deleteTwiglet(twiglet);
      });

      it('returns 204', () => {
        expect(res).to.have.status(204);
      });

      it('returns 204 when twiglet doesnt exist', function* () {
        yield deleteTwiglet(twiglet);
        expect(res).to.have.status(204);
      });
    });
  });
});


module.exports = { createTwiglet, deleteTwiglet, getTwiglet };
