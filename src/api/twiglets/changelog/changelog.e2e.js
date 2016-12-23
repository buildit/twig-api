/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { anonAgent, authAgent } = require('../../../../test/e2e');
const { createTwiglet, deleteTwiglet } = require('../twiglets.e2e');

const expect = chai.expect;
chai.use(chaiHttp);

describe('/twiglets/{id}/changelog', () => {
  describe('POST', () => {
    it('Unauthenticated agent -> 401', (done) => {
      anonAgent.post('/twiglets/twig-b4f84c0f-81a3-4dde-b4d1-3e04b9f1949c/changelog')
        .send({
          commitMessage: 'foobarbaz'
        })
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('Twiglet does not exist -> 404', (done) => {
      authAgent.post('/twiglets/twig-41189dde-7189-494e-98ec-e3a766090270/changelog')
        .send({
          commitMessage: 'foobarbaz'
        })
        .end((err, res) => {
          expect(res).to.have.status(404);
          done();
        });
    });

    describe('Success', () => {
      const twiglet = {
        _id: 'twig-01b0c01d-65f0-4285-b039-ba07901bc35b'
      };

      beforeEach('Create new twiglet', () => createTwiglet(twiglet));

      it('Creates a changelog', function* () {
        const res = yield authAgent.post(`/twiglets/${twiglet._id}/changelog`)
        .send({
          commitMessage: 'foobarbaz'
        });

        expect(res).to.have.status(204);
      });

      afterEach('Delete new twiglet', () => deleteTwiglet(twiglet));
    });
  });
});
