'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

const { expect } = chai;
chai.use(chaiHttp);

describe('/v2/models/{name}/changelog', () => {
  describe('(Successful)', () => {
    let res;

    before(async () => {
      res = await createModel(baseModel());
      res = await chai.request(res.body.changelog_url).get('');
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('returns a the changelog information', () => {
      expect(res.body.changelog.length).to.equal(1);
    });

    after(async () => {
      await deleteModel(baseModel());
    });
  });
});
