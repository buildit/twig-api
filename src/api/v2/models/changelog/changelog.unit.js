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
            message: 'First commit'
          }
        ]
      },
    }
  };
}

// JB 043019 - had linting errors but function seems to be unused
// function props (obj) {
//   const p = [];
//   for (; obj != null; obj = Object.getPrototypeOf(obj)) {
//     const op = Object.getOwnPropertyNames(obj);
//     for (let i = 0; i < op.length; i++) {
//       if (p.indexOf(op[i]) === -1) {
//         p.push(op[i]);
//       }
//     }
//   }
//   return p;
// }

describe.only('/v2/models/{name}/changelog', () => {
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


    it.only('returns populated changelog', async () => {
      // arrange
      console.log('before', PouchDb.prototype.allDocs.displayName);
      const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
      console.log('after', PouchDb.prototype.allDocs.displayName);
      allDocs.returns(Promise.resolve({ rows: [changeLoggedModel()] }));
      const db = new PouchDb('http://localhost:5984/organisation-models');
      console.log('???', Object.getPrototypeOf(db));
      console.log(db.allDocs);
      const docs = await db.allDocs({ include_docs: true });
      console.log('wtf?', docs);

      // act
      // const response = await server.inject(req);
      // assert
      // expect(response.result.changelog).to.have.lengthOf(1);
    });

    it('fails when twiglet doesn\'t exist', async () => {
      // arrange
      const allDocs = sinon.stub(PouchDb.prototype, 'allDocs');
      allDocs.onFirstCall().resolves({ rows: [] });

      // act
      const response = await server.inject(req);
      // assert
      expect(response.statusCode).to.eq(404);
    });
  });
});
