/* eslint no-unused-expressions: 0 */
'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const ldap = require('ldapjs');
const rp = require('request-promise');
const jwt = require('jsonwebtoken');
const Auth = require('./auth');
const server = require('../../../../test/unit/test-server');

server.route(Auth.routes);

describe('/v2/login', () => {
  let sandbox = sinon.sandbox.create();
  const req = {
    method: 'POST',
    url: '/v2/login',
    payload: {
      email: 'foo@bar.com',
      password: 'foobarbaz',
    },
  };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('logs in - success', () => {
    // arrange
    const ldapStub = {
      bind: (user, pass, callback) => callback(null),
      unbind: () => { }
    };
    sandbox.stub(ldap, 'createClient').returns(ldapStub);
    // act
    return server.inject(req)
        .then((response) => {
        // assert
          expect(response.headers['set-cookie']).to.exist;
          expect(response.result.user.name).to.eq('foo@bar.com');
          expect(response.result.user.id).to.eq('foo@bar.com');
        });
  });

  it('logs in - fail', () => {
    // arrange
    const ldapStub = {
      bind: (user, pass, callback) => callback({ message: 'FAILURE' }),
      unbind: () => { }
    };
    sandbox.stub(ldap, 'createClient').returns(ldapStub);

    // act
    return server.inject(req)
        .then((response) => {
        // assert
          expect(response.headers['set-cookie']).to.not.exist;
          expect(response.statusCode).to.equal(401);
        });
  });
});

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
