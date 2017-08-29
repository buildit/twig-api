'use strict';

/* eslint no-unused-expressions: 0 */
const expect = require('chai').expect;
const sinon = require('sinon');
const PouchDb = require('pouchdb');
const Changelog = require('./changelog');
const server = require('../../../../../test/unit/test-server');

server.route(Changelog.routes);

function changeLoggedModel () {
  return {
    doc: {
      _rev: 'some rev',
      data: {
        name: 'model1',
        changelog: [
          {
            user: 'foo@bar.com',
            timestamp: new Date(2000, 3, 6).toISOString(),
            message: 'First commit'
          }
        ]
      },
    }
  };
}

describe('/v2/models/{name}/changelog', () => {
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
      url: '/v2/models/model1/changelog',
    };


    it('returns populated changelog', () => {
      // arrange
      const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
      allDocs.resolves({ rows: [changeLoggedModel()] });

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(response.result.changelog).to.have.length.of(1);
        });
    });

    it('fails when twiglet doesn\'t exist', () => {
      // arrange
      const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
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
