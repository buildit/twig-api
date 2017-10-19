/* eslint no-unused-expressions: 0 */

'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const rp = require('request-promise');
const jwt = require('jsonwebtoken');
const Auth = require('./auth');
const server = require('../../../../test/unit/test-server');

server.route(Auth.routes);

// TODO
describe('/v2/validateMothershipJwt', () => {
  const oidConfigResponse = { jwks_uri: 'some_uri' };

  const jwkResponse = {
    keys: [
      { kid: 'z039zd...', x5c: ['MIIDB...'] },
      { kid: '9FXDpb...', x5c: ['MIIDBT...'] }
    ]
  };

  let sandbox = sinon.sandbox.create();
  const req = {
    method: 'POST',
    url: '/v2/validateJwt',
    payload: {
      token: 'some_giant_encoded_jwt_token'
    },
  };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(jwt, 'decode').returns({ header: { kid: 'z039zd...' } });

    const rpGet = sandbox.stub(rp, 'get');
    rpGet.onFirstCall().resolves(JSON.stringify(oidConfigResponse));
    rpGet.onSecondCall().resolves(JSON.stringify(jwkResponse));
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('is valid token', () => {
    // arrange
    sandbox.stub(jwt, 'verify').resolves({ upn: 'foo@bar.com', name: 'Foo Bar' });

    // act
    return server.inject(req)
      .then((response) => {
        expect(response.headers['set-cookie']).to.exist;
        expect(response.result.user.name).to.eq('Foo Bar');
        expect(response.result.user.id).to.eq('foo@bar.com');
      });
  });

  it('is invalid token', () => {
    // arrange
    sandbox.stub(jwt, 'verify').rejects({});

    // act
    return server.inject(req)
      .then((response) => {
        expect(response.headers['set-cookie']).to.not.exist;
        expect(response.statusCode).to.equal(401);
      });
  });
});
