/* eslint func-names: 0 */
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

function createView (twigletName, view) {
  return addWait(authAgent.post(`/v2/twiglets/${twigletName}/views`).send(view));
}

function updateView (twigletName, viewName, view) {
  return addWait(authAgent.put(`/v2/twiglets/${twigletName}/views/${viewName}`).send(view));
}

function getView (twigletName, viewName) {
  return anonAgent.get(`/v2/twiglets/${twigletName}/views/${viewName}`);
}

function getViews (twigletName) {
  return anonAgent.get(`/v2/twiglets/${twigletName}/views`);
}

function deleteView (twigletName, viewName) {
  return addWait(authAgent.delete(`/v2/twiglets/${twigletName}/views/${viewName}`));
}

function baseView () {
  return {
    description: 'description of view',
    links: {},
    nodes: {},
    name: 'view name',
    userState: {
      autoConnectivity: 'in',
      cascadingCollapse: true,
      currentNode: null,
      filters: [{
        attributes: [],
        types: { }
      }],
      forceChargeStrength: 0.1,
      forceGravityX: 0.1,
      forceGravityY: 1,
      forceLinkDistance: 20,
      forceLinkStrength: 0.5,
      forceVelocityDecay: 0.9,
      linkType: 'path',
      scale: 8,
      showLinkLabels: false,
      showNodeLabels: false,
      traverseDepth: 3,
      treeMode: false,
    }
  };
}

describe('views', () => {
  describe('POST /twiglets/{twigletName}/views', () => {
    describe('success', () => {
      let res;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        res = yield createView(baseTwiglet().name, baseView());
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
          name: baseView().name,
          url: `${url}/twiglets/${baseTwiglet().name}/views/${baseView().name}`
        });
      });
    });
  });

  describe('GET /twiglets/{twigletName}/views', () => {
    describe('success', () => {
      let res;
      let createdView;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        res = yield createView(baseTwiglet().name, baseView());
        createdView = res.body;
        res = yield getViews(baseTwiglet().name);
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 200 (OK)', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns a list of views', () => {
        expect(res.body.length).to.equal(1);
      });

      it('returns a list including the newly created view', () => {
        expect(res.body[0].name).to.equal(createdView.name);
      });
    });
  });

  describe('GET /twiglets/{twigletName}/views/{viewName}', () => {
    describe('success', () => {
      let res;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        yield createView(baseTwiglet().name, baseView());
        res = yield getView(baseTwiglet().name, baseView().name);
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 200 (OK)', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('contains the view', () => {
        expect(res.body.description).to.equal(baseView().description);
      });
    });

    describe('(Error)', () => {
      let promise;

      before(() => {
        promise = getView(baseTwiglet().name, 'no name');
      });

      it('returns 404', (done) => {
        promise.catch((res) => {
          expect(res).to.have.status(404);
          done();
        });
      });
    });
  });

  describe('PUT /twiglets/{twigletName}/views/{viewName}', () => {
    describe('success', () => {
      let res;
      let updates;
      const viewName = baseView().name;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        yield createView(baseTwiglet().name, baseView());
        updates = baseView();
        updates.name = 'a different name';
        res = yield updateView(baseTwiglet().name, viewName, updates);
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('contains the view', () => {
        expect(res.body.name).to.equal('a different name');
      });
    });

    describe('(Error)', () => {
      let promise;

      before(() => {
        promise = getView(baseTwiglet().name, 'no name');
      });

      it('returns 404', (done) => {
        promise.catch((res) => {
          expect(res).to.have.status(404);
          done();
        });
      });
    });
  });

  describe('DELETE /twiglets/{twigletName}/views/{viewName}', () => {
    describe('success', () => {
      let res;

      beforeEach(function* foo () {
        yield createModel(baseModel());
        yield createTwiglet(baseTwiglet());
        yield createView(baseTwiglet().name, baseView());
        res = yield deleteView(baseTwiglet().name, baseView().name);
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 204', () => {
        expect(res).to.have.status(204);
      });

      it('GET view returns 404', (done) => {
        getView(baseTwiglet().name, baseView().name)
          .end((err, response) => {
            expect(response).to.have.status(404);
            done();
          });
      });

      it('not included in the list of views', function* () {
        const views = yield getViews(baseTwiglet().name);
        expect(views.body).to.not.deep.contains(baseTwiglet());
      });
    });
  });
});
