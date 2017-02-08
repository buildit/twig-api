'use strict';
/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { createTwiglet, deleteTwiglet, baseTwiglet } = require('../twiglets.e2e');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

const expect = chai.expect;
chai.use(chaiHttp);

describe('/twiglets/{name}/changelog', () => {
  describe('(Successful)', () => {
    let res;

    before(function* () {
      yield createModel(baseModel());
      res = yield createTwiglet(baseTwiglet());
      res = yield chai.request(res.body.changelog_url).get('');
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('returns a the changelog information', () => {
      expect(res.body.changelog.length).to.equal(1);
    });

    after(function* foo () {
      yield deleteTwiglet(baseTwiglet());
      yield deleteModel(baseModel());
    });
  });
});
