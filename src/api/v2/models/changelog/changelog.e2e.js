'use strict';
/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

const expect = chai.expect;
chai.use(chaiHttp);

describe('/v2/models/{name}/changelog', () => {
  describe('(Successful)', () => {
    let res;

    before(function* () {
      res = yield createModel(baseModel());
      res = yield chai.request(res.body.changelog_url).get('');
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('returns a the changelog information', () => {
      expect(res.body.changelog.length).to.equal(1);
    });

    after(function* foo () {
      yield deleteModel(baseModel());
    });
  });
});
