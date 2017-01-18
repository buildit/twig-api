'use strict';
/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { authAgent } = require('../../../../test/e2e');
const { createTwiglet, deleteTwiglet, baseTwiglet } = require('../twiglets.e2e');

const expect = chai.expect;
chai.use(chaiHttp);

describe('/twiglets/{id}/model', () => {
  describe('PUT', () => {
    describe('Success', () => {
      beforeEach('Create new twiglet', () => createTwiglet(baseTwiglet()));

      afterEach('Delete new twiglet', () => deleteTwiglet(baseTwiglet()));

      it('Creates a model', function* () {
        const res = yield authAgent.put(`/twiglets/${baseTwiglet()._id}/model`)
        .send({
          entities: {
            some: {
              type: 'some',
              color: '#008800',
              size: '40',
              class: 'idk',
              image: 'S'
            },
            entity: {
              type: 'entity',
              color: '#880000',
              size: '30',
              class: 'still do not know',
              image: 'E'
            }
          }
        });
        expect(res).to.have.status(204);
      });
    });

    describe('errors', () => {
      it('Twiglet does not exist -> 404', (done) => {
        authAgent.put(`/twiglets/${baseTwiglet()._id}/model`)
          .send({
            entities: {}
          })
          .end((err, res) => {
            expect(res).to.have.status(404);
            done();
          });
      });
    });
  });
});
