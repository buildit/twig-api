'use strict';
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
chai.use(require('chai-string'));
const sinon = require('sinon');
const PouchDb = require('pouchdb');
const Twiglet = require('./twiglets');
const server = require('../../../test/unit/test-server');

const expect = chai.expect;

server.route(Twiglet.routes);

describe('/twiglets', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getTwigletsHandler', () => {
    const req = {
      method: 'get',
      url: '/twiglets'
    };

    it('returns an empty list of twiglets', () => {
      sandbox.stub(PouchDb.prototype, 'allDocs').returns(Promise.resolve({ rows: [] }));

      return server.inject(req)
        .then(response => {
          expect(response.result).to.be.empty;
        });
    });

    describe('non-empty successes', () => {
      beforeEach(() => {
        const twiglets = {
          total_rows: 5,
          offset: 0,
          rows: [
            { id: 'one',
              key: 'one',
              doc: {
                _id: 'one',
                _rev: 'rev1',
                name: 'first',
                description: 'the first one',
              },
            },
            { id: 'two',
              key: 'two',
              doc: {
                _id: 'two',
                _rev: 'rev2',
                name: 'second',
                description: 'the second one',
              }
            },
          ]
        };
        sandbox.stub(PouchDb.prototype, 'allDocs').returns(Promise.resolve(twiglets));
      });

      it('does not return a _rev if it exists', () =>
        server.inject(req)
          .then(response => {
            response.result.forEach(twiglet => {
              expect(twiglet._rev).to.not.exist;
            });
          })
      );

      it('returns name and description', () =>
        server.inject(req)
          .then(response => {
            response.result.forEach(twiglet => {
              expect(twiglet.name).to.exist;
              expect(twiglet.description).to.exist;
            });
          })
      );

      it('returns urls to request more informations', () =>
        server.inject(req)
          .then(response => {
            const first = response.result[0];
            expect(first.url).to.exist.and.endsWith('/twiglets/one');
            expect(first.model_url).to.exist.and.endsWith('/twiglets/one/model');
            expect(first.changelog_url).to.exist.and.endsWith('/twiglets/one/changelog');
            expect(first.views_url).to.exist.and.endsWith('/twiglets/one/views');

            const second = response.result[1];
            expect(second.url).to.exist.and.endsWith('/twiglets/two');
            expect(second.model_url).to.exist.and.endsWith('/twiglets/two/model');
            expect(second.changelog_url).to.exist.and.endsWith('/twiglets/two/changelog');
            expect(second.views_url).to.exist.and.endsWith('/twiglets/two/views');
          })
      );
    });

    describe('errors', () => {
      it('relays errors from the database with correct error codes', () => {
        sandbox.stub(PouchDb.prototype, 'allDocs').returns(Promise.reject({
          status: '404',
          message: 'this twiglet can not be found!'
        }));

        return server.inject(req)
          .then((response) => {
            expect(response.result.statusCode).to.equal(404);
            expect(response.result.message).to.equal('this twiglet can not be found!');
          });
      });

      it('returns 500 if there is no status from the database', () => {
        sandbox.stub(PouchDb.prototype, 'allDocs').returns(Promise.reject({
          message: 'this message will not be pushed to the user'
        }));

        return server.inject(req)
          .then((response) => {
            expect(response.result.statusCode).to.equal(500);
            expect(response.result.message).to
              .not.equal('this message will not be pushed to the user');
          });
      });
    });
  });

  describe('getTwiglet', () => {
    let twigletDocs;
    const req = {
      method: 'get',
      url: '/twiglets/someid'
    };
    describe('successes', () => {
      beforeEach(() => {
        const twigletInfo = {
          _rev: 'infoRev',
          name: 'Some Twiglet',
          description: 'The returning twiglet',
        };
        twigletDocs = {
          rows: [
            {
              id: 'nodes',
              doc: {
                _rev: 'nodeRev',
                data: [
                  {
                    id: 'node 1',
                  },
                  {
                    id: 'node 2',
                  }
                ]
              }
            },
            {
              id: 'links',
              doc: {
                _rev: 'linkRev',
                data: [
                  {
                    id: 'link 1',
                    source: 'node 1',
                    target: 'node 2',
                  },
                  {
                    id: 'link 2',
                    source: 'node 2',
                    target: 'node 1',
                  }
                ]
              }
            },
            {
              id: 'changelog',
              doc: {
                _rev: 'changelogRev',
                data: [
                  {
                    message: 'this one should be returned',
                  },
                  {
                    message: 'older log, should not come through',
                  }
                ]
              }
            },
          ]
        };
        sandbox.stub(PouchDb.prototype, 'get').returns(Promise.resolve(twigletInfo));
        sandbox.stub(PouchDb.prototype, 'allDocs').returns(Promise.resolve(twigletDocs));
      });

      it('returns the id, name and description', () =>
        server.inject(req)
          .then((response) => {
            const twiglet = response.result;
            expect(twiglet._id).to.exist.and.to.equal('someid');
            expect(twiglet.name).to.exist.and.to.equal('Some Twiglet');
            expect(twiglet.description).to.exist.and.to.equal('The returning twiglet');
          })
      );

      it('returns a concatinated _rev info:nodes:links', () =>
        server.inject(req)
          .then((response) => {
            const twiglet = response.result;
            expect(twiglet._rev).to.exist.and.to.equal('infoRev:nodeRev:linkRev');
          })
      );

      it('returns the latest changelog (0th index)', () =>
        server.inject(req)
          .then((response) => {
            const twiglet = response.result;
            expect(twiglet.commitMessage).to.exist.and.to
              .equal(twigletDocs.rows[2].doc.data[0].message);
          })
      );

      it('returns the correct array of nodes and links', () =>
        server.inject(req)
          .then((response) => {
            const twiglet = response.result;
            expect(twiglet.nodes).to.exist.and.to.deep.equal(twigletDocs.rows[0].doc.data);
            expect(twiglet.links).to.exist.and.to.deep.equal(twigletDocs.rows[1].doc.data);
          })
      );

      it('returns a set of urls', () =>
        server.inject(req)
          .then(response => {
            const twiglet = response.result;
            expect(twiglet.url).to.exist.and.endsWith('/twiglets/someid');
            expect(twiglet.model_url).to.exist.and.endsWith('/twiglets/someid/model');
            expect(twiglet.changelog_url).to.exist.and.endsWith('/twiglets/someid/changelog');
            expect(twiglet.views_url).to.exist.and.endsWith('/twiglets/someid/views');
          })
      );
    });

    describe('errors', () => {
      it('relays errors from the database with correct error codes', () => {
        sandbox.stub(PouchDb.prototype, 'allDocs').returns(Promise.reject({
          status: '404',
          message: 'this twiglet can not be found!'
        }));

        return server.inject(req)
          .then((response) => {
            expect(response.result.statusCode).to.equal(404);
            expect(response.result.message).to.equal('this twiglet can not be found!');
          });
      });

      it('returns 500 if there is no status from the database', () => {
        sandbox.stub(PouchDb.prototype, 'allDocs').returns(Promise.reject({
          message: 'this message will not be pushed to the user'
        }));

        return server.inject(req)
          .then((response) => {
            expect(response.result.statusCode).to.equal(500);
            expect(response.result.message).to
              .not.equal('this message will not be pushed to the user');
          });
      });
    });
  });
});

