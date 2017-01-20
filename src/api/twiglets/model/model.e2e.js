'use strict';
/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { authAgent } = require('../../../../test/e2e');
const { createTwiglet, deleteTwiglet, baseTwiglet } = require('../twiglets.e2e');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

const expect = chai.expect;
chai.use(chaiHttp);

describe('/twiglets/{id}/model', () => {
  describe('PUT', () => {
    describe('Success', () => {
      beforeEach('Create new twiglet', function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteModel(baseModel());
        yield deleteTwiglet(baseTwiglet());
      });

      it('updates a model', function* () {
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
