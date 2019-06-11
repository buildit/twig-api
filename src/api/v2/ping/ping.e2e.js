'use strict';

/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { anonAgent } = require('../../../../test/e2e');

const { expect } = chai;
chai.use(chaiHttp);

describe('/v2/ping', () => {
  describe('GET', () => {
    let res;

    before(async () => {
      // act
      res = await anonAgent.get('/v2/ping');
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });
  });
});

// TODO: make this look into more of the result for better test coverage
describe('/v2/version', () => {
  describe('GET', () => {
    let res;

    before(async () => {
      // act
      res = await anonAgent.get('/v2/version');
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });
  });
});
