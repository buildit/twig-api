'use strict';

/* eslint no-unused-expressions: 0 */
const { expect } = require('chai');
const sinon = require('sinon');
const PouchDb = require('pouchdb');
const Changelog = require('./changelog');
const init = require('../../../../../test/unit/test-server');


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
            message: 'First commit',
          },
        ],
      },
    },
  };
}

describe('/v2/models/{name}/changelog', () => {
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
      url: '/v2/models/model1/changelog',
    };


    it('returns populated changelog', async () => {
      // arrange

      const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
      allDocs.resolves({ rows: [changeLoggedModel()] });

      // act
      const response = await server.inject(req);

      // assert
      expect(response.result.changelog).to.have.lengthOf(1);
    });

    it('fails when model doesn\'t exist', async () => {
      const errReq = {
        method: 'GET',
        url: '/v2/models/nomodel/changelog',
      };
      // arrange
      const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [] });

      // act
      const response = await server.inject(errReq);
      // assert
      expect(response.statusCode).to.eq(404);
    });
  });
});
