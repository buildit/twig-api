/* eslint no-unused-expressions: 0 */
'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const ldap = require('ldapjs');
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
// describe('/v2/validateWiproJwt', () => {
//   let sandbox = sinon.sandbox.create();
//   const req = {
//     method: 'POST',
//     url: '/v2/validateWiproJwt',
//     payload: {
//       token_id: 'some_giant_token_id'
//     },
//   };
//
//   beforeEach(() => {
//     sandbox = sinon.sandbox.create();
//   });
//
//   afterEach(() => {
//     sandbox.restore();
//   });
//
//   it('is valid code', () => {
//   });
//
//   it('is invalid code', () => {
//   });
// });
