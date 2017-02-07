'use strict';
/* eslint no-unused-expressions: 0 */
const expect = require('chai').expect;
const sinon = require('sinon');
const PouchDb = require('pouchdb');
const Changelog = require('./changelog');
const server = require('../../../../test/unit/test-server');

server.route(Changelog.routes);

describe('/twiglets/{id}/changelog', () => {
  let sandbox = sinon.sandbox.create();
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('GET', () => {
    const req = {
      method: 'GET',
      url: '/twiglets/12345/changelog',
    };

    it('returns empty changelog', () => {
      // arrange
      sandbox.stub(PouchDb.prototype, 'info').returns(Promise.resolve());
      sandbox.stub(PouchDb.prototype, 'get').returns(Promise.reject({ status: 404 }));
      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(response.result.changelog).to.be.empty;
        });
    });

    it('returns populated changelog', () => {
      // arrange
      sandbox.stub(PouchDb.prototype, 'info').returns(Promise.resolve());
      sandbox.stub(PouchDb.prototype, 'get').returns(Promise.resolve({
        data: [
          {
            user: 'foo@bar.com',
            timestamp: new Date(2000, 3, 6).toISOString(),
            message: 'First commit'
          }
        ]
      }));

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(response.result.changelog).to.have.length.of(1);
          expect(response.result.changelog[0].user).to.be.eq('foo@bar.com');
          expect(response.result.changelog[0].message).to.be.eq('First commit');
          expect(response.result.changelog[0].timestamp).to.be
            .eq(new Date(2000, 3, 6).toISOString());
        });
    });

    it('fails when twiglet doesn\'t exist', () => {
      // arrange
      const error = new Error('Not Found');
      error.status = 404;
      sandbox.stub(PouchDb.prototype, 'info').returns(Promise.reject(error));

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(response.statusCode).to.eq(404);
        });
    });
  });
});
