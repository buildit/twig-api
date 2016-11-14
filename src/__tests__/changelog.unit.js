/* eslint no-unused-expressions: 0 */
const expect = require('chai').expect;
const sinon = require('sinon');
const Changelog = require('../changelog');
const PouchDb = require('pouchdb');
const config = require('../utils/config');
const server = require('./test-server');

server.route(Changelog.routes);

describe('/twiglets/{id}/changelog', () => {
  let sandbox = sinon.sandbox.create();
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    config.DB_URL = 'foo'; // pouchdb won't stub if db_url is remote
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

  describe('POST', () => {
    const req = {
      method: 'POST',
      url: '/twiglets/12345/changelog',
      payload: {
        commitMessage: 'Foo',
      },
      credentials: {
        user: {
          name: 'bar@baz.com'
        }
      }
    };

    it('adds first commit message', () => {
      // arrange
      sandbox.stub(PouchDb.prototype, 'info').returns(Promise.resolve());
      sandbox.stub(PouchDb.prototype, 'get').returns(Promise.reject({ status: 404 }));
      sandbox.stub(PouchDb.prototype, 'put').returns(Promise.resolve());

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(response.statusCode).to.eq(204);
        });
    });

    it('prepends additional commit message', () => {
      // arrange
      sandbox.stub(PouchDb.prototype, 'info').returns(Promise.resolve());
      sandbox.stub(PouchDb.prototype, 'get').returns(Promise.resolve({
        data: [
          {
            user: 'foo@bar.com',
            timestamp: new Date(2000, 2, 14).toISOString(),
            message: 'First commit'
          }
        ]
      }));
      const putCall = sandbox.stub(PouchDb.prototype, 'put').returns(Promise.resolve());
      const now = new Date();

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(response.statusCode).to.eq(204);
          expect(putCall.firstCall.args[0].data).to.have.length.of(2);
          expect(putCall.firstCall.args[0].data[0].message).to.be.eq('Foo');
          expect(putCall.firstCall.args[0].data[0].user).to.be.eq('bar@baz.com');
          const commitDate = Date.parse(putCall.firstCall.args[0].data[0].timestamp);
          expect(commitDate).to.be.at.least(now.getTime());
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
