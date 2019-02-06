'use strict';

/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { createTwiglet, deleteTwiglet, baseTwiglet } = require('../twiglets.e2e');
const { createModel, deleteModel, baseModel } = require('../../models/models.e2e.js');

const { expect } = chai;
chai.use(chaiHttp);

describe('/v2/twiglets/{name}/changelog', () => {
  describe('(Successful)', () => {
    let res;

    before(async () => {
      await createModel(baseModel());
      res = await createTwiglet(baseTwiglet());
      res = await chai.request(res.body.changelog_url).get('');
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('returns a the changelog information', () => {
      expect(res.body.changelog.length).to.equal(1);
    });

    after(async () => {
      await deleteTwiglet(baseTwiglet());
      await deleteModel(baseModel());
    });
  });
});
