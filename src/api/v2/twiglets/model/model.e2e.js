/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */

'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const { authAgent, addWait } = require('../../../../../test/e2e');
const { createTwiglet, deleteTwiglet, baseTwiglet } = require('../twiglets.e2e');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

function updateModel (twigletName, data) {
  return addWait(authAgent.put(`/v2/twiglets/${twigletName}/model`).send(data));
}

const { expect } = chai;
chai.use(chaiHttp);

describe('/v2/twiglets/{name}/model', () => {
  describe('PUT', () => {
    describe('Success', () => {
      let _rev;
      beforeEach('Create new twiglet', async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        ({ _rev } = (await authAgent.get(`/v2/twiglets/${baseTwiglet().name}/model`)).body);
      });

      afterEach('Delete new twiglet', async () => {
        await deleteModel(baseModel());
        await deleteTwiglet(baseTwiglet());
      });

      it('updates a model', async () => {
        const res = await updateModel(baseTwiglet().name, {
          _rev,
          entities: {
            some: {
              type: 'some',
              color: '#008800',
              size: '40',
              class: 'idk',
              image: 'S',
              attributes: [],
            },
            entity: {
              type: 'entity',
              color: '#880000',
              size: '30',
              class: 'still do not know',
              image: 'E',
              attributes: [],
            },
          },
          nameChanges: [],
        });
        expect(res).to.have.status(200);
      });

      it('updates a model (without nameChanges coming in)', async () => {
        const res = await updateModel(baseTwiglet().name, {
          _rev,
          entities: {
            some: {
              type: 'some',
              color: '#008800',
              size: '40',
              class: 'idk',
              image: 'S',
              attributes: [],
            },
            entity: {
              type: 'entity',
              color: '#880000',
              size: '30',
              class: 'still do not know',
              image: 'E',
              attributes: [],
            },
          },
        });
        expect(res).to.have.status(200);
      });
    });

    describe('errors', () => {
      it('Twiglet does not exist -> 404', (done) => {
        authAgent.put(`/v2/twiglets/${baseTwiglet().name}/model`)
          .send({
            entities: {},
            nameChanges: [],
          })
          .end((err, res) => {
            expect(res).to.have.status(404);
            done();
          });
      });
    });
  });

  describe('GET', () => {
    describe('success', () => {
      let res;
      beforeEach(async () => {
        await createModel(baseModel());
        res = await createTwiglet(baseTwiglet());
        res = await chai.request(res.body.model_url).get('');
      });

      afterEach('Delete new twiglet', async () => {
        await deleteModel(baseModel());
        await deleteTwiglet(baseTwiglet());
      });

      it('returns 200 (OK)', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns the model', () => {
        expect(res.body.entities).to.deep.equal(baseModel().entities);
      });
    });
  });
});
