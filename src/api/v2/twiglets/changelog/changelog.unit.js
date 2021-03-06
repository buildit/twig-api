'use strict';

/* eslint no-unused-expressions: 0 */
const { expect } = require('chai');
const sinon = require('sinon');
const PouchDb = require('pouchdb');
const { twigletInfo } = require('../twiglets.unit');
const Changelog = require('./changelog');
const init = require('../../../../../test/unit/test-server');

describe('/v2/twiglets/{name}/changelog', () => {
  let server;

  before(async () => {
    server = await init(Changelog.routes);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('GET', () => {
    const req = {
      method: 'GET',
      url: '/v2/twiglets/Some%20Twiglet/changelog',
    };

    it('returns empty changelog', () => {
      // arrange
      const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
      // sinon.stub(PouchDb.prototype, 'get').returns(Promise.reject(new Error({ status: 404 })));
      sinon.stub(PouchDb.prototype, 'get').rejects({ status: 404 });
      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(response.result.changelog).to.be.an('array').and.to.be.empty;
        });
    });

    it('returns populated changelog', () => {
      // arrange
      const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
      sinon.stub(PouchDb.prototype, 'get').returns(Promise.resolve({
        data: [
          {
            user: 'foo@bar.com',
            timestamp: new Date(2000, 3, 6).toISOString(),
            message: 'First commit',
          },
        ],
      }));

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(response.result.changelog).to.have.lengthOf(1);
          expect(response.result.changelog[0].user).to.be.eq('foo@bar.com');
          expect(response.result.changelog[0].message).to.be.eq('First commit');
          expect(response.result.changelog[0].timestamp).to.be
            .eq(new Date(2000, 3, 6).toISOString());
        });
    });

    it('fails when twiglet doesn\'t exist', () => {
      // arrange
      const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [] });

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(response.statusCode).to.eq(404);
        });
    });
  });
});
