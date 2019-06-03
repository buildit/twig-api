/* eslint no-unused-expressions: 0 */

'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const rp = require('request-promise');
const jwt = require('jsonwebtoken');
const Auth = require('./auth');
const init = require('../../../../test/unit/test-server');

// TODO
describe('/v2/validateMothershipJwt', () => {
  let server;
  const oidConfigResponse = { jwks_uri: 'some_uri' };

  const jwkResponse = {
    keys: [
      { kid: 'z039zd...', x5c: ['MIIDB...'] },
      { kid: '9FXDpb...', x5c: ['MIIDBT...'] },
    ],
  };

  const req = {
    method: 'POST',
    url: '/v2/validateJwt',
    payload: {
      token: 'some_giant_encoded_jwt_token',
    },
  };

  before(async () => {
    server = await init(Auth.routes);
  });

  beforeEach(async () => {
    sinon.stub(jwt, 'decode').returns({ header: { kid: 'z039zd...' } });

    const rpGet = sinon.stub(rp, 'get');
    rpGet.onFirstCall().resolves(JSON.stringify(oidConfigResponse));
    rpGet.onSecondCall().resolves(JSON.stringify(jwkResponse));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('is valid token', async () => {
    // arrange
    sinon.stub(jwt, 'verify').resolves({ upn: 'foo@bar.com', name: 'Foo Bar' });

    // act
    const response = await server.inject(req);
    expect(response.headers['set-cookie']).to.exist;
    expect(response.result.user.name).to.eq('Foo Bar');
    expect(response.result.user.id).to.eq('foo@bar.com');
  });

  it('is invalid token', async () => {
    // arrange
    sinon.stub(jwt, 'verify').rejects({});

    // act
    const response = await server.inject(req);
    expect(response.headers['set-cookie']).to.not.exist;
    expect(response.statusCode).to.equal(401);
  });
});
