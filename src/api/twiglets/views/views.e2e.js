/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
'use strict';
const chai = require('chai');
const chaiHttp = require('chai-http');
const { createTwiglet, deleteTwiglet, baseTwiglet } = require('../twiglets.e2e');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

const expect = chai.expect;
chai.use(chaiHttp);

describe('/twiglets/{name}/views', () => {
  describe('GET', () => {
    describe('success', () => {
      let res;
      beforeEach(function* foo () {
        yield createModel(baseModel());
        res = yield createTwiglet(baseTwiglet());
        res = yield chai.request(res.body.views_url).get('');
      });

      afterEach('Delete new twiglet', function* foo () {
        yield deleteTwiglet(baseTwiglet());
        yield deleteModel(baseModel());
      });

      it('returns 200 (OK)', () => {
        expect(res.statusCode).to.equal(200);
      });

      it('returns the views', () => {
        expect(res.body.views).to.exist;
      });
    });
  });
});
