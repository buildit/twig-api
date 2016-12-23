/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const version = require('../../../package').version;
const anonAgent = require('../../../test/e2e').anonAgent;

const expect = chai.expect;
chai.use(chaiHttp);

describe('/ping', () => {
  describe('GET', () => {
    let res;

    before(function* () {
      // act
      res = yield anonAgent.get('/ping');
    });

    it('returns 200', () => {
      expect(res).to.have.status(200);
    });

    it('returns the version', () => {
      expect(res.body.version).to.eq(version);
    });
  });
});
