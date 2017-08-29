'use strict';

/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const anonAgent = require('../../../../test/e2e').anonAgent;

const expect = chai.expect;
chai.use(chaiHttp);

describe('/v2/ping', () => {
  describe('GET', () => {
    let res;

    before(function* () {
      // act
      res = yield anonAgent.get('/v2/ping');
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });
  });
});
