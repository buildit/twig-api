'use strict';
/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { anonAgent, authAgent } = require('../../../../test/e2e');
const { createTwiglet, deleteTwiglet, baseTwiglet } = require('../twiglets.e2e');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

const expect = chai.expect;
chai.use(chaiHttp);

describe('/twiglets/{id}/changelog', () => {
  describe('POST', () => {
    it('Unauthenticated agent -> 401', (done) => {
      anonAgent.post('/twiglets/test-b4f84c0f-81a3-4dde-b4d1-3e04b9f1949c/changelog')
        .send({
          commitMessage: 'foobarbaz'
        })
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('Twiglet does not exist -> 404', (done) => {
      authAgent.post('/twiglets/test-41189dde-7189-494e-98ec-e3a766090270/changelog')
        .send({
          commitMessage: 'foobarbaz'
        })
        .end((err, res) => {
          expect(res).to.have.status(404);
          done();
        });
    });

    describe('Success', () => {
      beforeEach('Create new twiglet', () => {
        createModel(baseModel());
        createTwiglet(baseTwiglet());
      });

      it('Creates a changelog', function* () {
        const res = yield authAgent.post(`/twiglets/${baseTwiglet()._id}/changelog`)
        .send({
          commitMessage: 'foobarbaz'
        });

        expect(res).to.have.status(204);
      });

      afterEach('Delete new twiglet', () => {
        deleteTwiglet(baseTwiglet());
        deleteModel(baseModel());
      });
    });
  });
});
