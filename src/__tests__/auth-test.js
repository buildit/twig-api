/* eslint no-unused-expressions: 0 */
const expect = require('chai').expect;
const sinon = require('sinon');
const Auth = require('../auth');
const ldap = require('ldapjs');

describe('Auth', () => {
  let sandbox = sinon.sandbox.create();
  const reply = (response) => response;
  let userCookie;
  const req = {
    payload: {
      email: 'foo@bar.com',
      password: 'foobarbaz',
    },
    cookieAuth: {
      set: (thing) => {
        userCookie = thing;
      }
    }
  };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    userCookie = undefined;
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
    return Auth.login(req, reply)
      .then((response) => {
        // assert
        expect(userCookie).to.exist;
        expect(response).to.exist;
        expect(userCookie.user.id).to.equal('foo@bar.com');
        expect(userCookie.user.name).to.equal('foo@bar.com');
        expect(userCookie).to.deep.equal(response);
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
    return Auth.login(req, reply)
      .then((response) => {
        // assert
        expect(userCookie).to.not.exist;
        expect(response.output.statusCode).to.equal(401);
      });
  });
});
