'use strict';
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
chai.use(require('chai-string'));
const sinon = require('sinon');
require('sinon-as-promised');
const PouchDb = require('pouchdb');
const Twiglet = require('./twiglets');
const server = require('../../../test/unit/test-server');

const expect = chai.expect;

server.route(Twiglet.routes);

function twigletInfo () {
  return {
    _id: 'some id',
    _rev: 'infoRev',
    name: 'Some Twiglet',
    description: 'The returning twiglet',
  };
}
function twigletDocs () {
  return {
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
              user: 'test@test.com',
              message: 'this one should be returned',
              timestamp: '2017-02-09T20:12:33.805Z'
            },
            {
              user: 'test2@test.com',
              message: 'older log, should not come through',
              timestamp: '2017-02-07T20:12:33.805Z'
            }
          ]
        }
      },
      {
        id: 'views',
        doc: {
          _rev: 'viewsRev',
          data: [
            {
              description: 'view description',
              name: 'view name',
              userState: {
                autoConnectivity: 'in',
                autoScale: 'linear',
                bidirectionalLinks: true,
                cascadingCollapse: true,
                currentNode: null,
                filters: {
                  attributes: [],
                  types: { }
                },
                forceChargeStrength: 0.1,
                forceGravityX: 0.1,
                forceGravityY: 1,
                forceLinkDistance: 20,
                forceLinkStrength: 0.5,
                forceVelocityDecay: 0.9,
                linkType: 'path',
                nodeSizingAutomatic: true,
                scale: 8,
                showLinkLabels: false,
                showNodeLabels: false,
                traverseDepth: 3,
                treeMode: false,
              }
            }
          ]
        }
      },
    ]
  };
}

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
      let results;
      beforeEach(function* foo () {
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
        results = (yield server.inject(req)).result;
      });

      it('does not return a _rev if it exists', () =>
        results.forEach(twiglet => {
          expect(twiglet._rev).to.not.exist;
        })
      );

      it('returns name and description', () =>
        results.forEach(twiglet => {
          expect(twiglet.name).to.exist;
          expect(twiglet.description).to.exist;
        })
      );

      it('returns the twiglet url', () =>
        expect(results[0].url).to.exist.and.endsWith('/twiglets/first')
      );

      it('returns the model_url', () =>
        expect(results[0].model_url).to.exist.and.endsWith('/twiglets/first/model')
      );

      it('returns the changelog_url', () =>
        expect(results[0].changelog_url).to.exist.and.endsWith('/twiglets/first/changelog')
      );

      it('results the views_url', () => {
        expect(results[0].views_url).to.exist.and.endsWith('/twiglets/first/views');
      });
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
    const req = {
      method: 'get',
      url: '/twiglets/Some%20Twiglet'
    };
    let twiglet;
    describe('successes', () => {
      beforeEach(function* foo () {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves(twigletDocs());
        twiglet = (yield server.inject(req)).result;
      });

      it('returns the name and description', () =>
        expect(twiglet.name).to.exist.and.to.equal('Some Twiglet')
      );

      it('returns the description', () =>
        expect(twiglet.description).to.exist.and.to.equal('The returning twiglet')
      );

      it('returns a concatinated _rev info:nodes:links', () =>
        expect(twiglet._rev).to.exist.and.to.equal('infoRev:nodeRev:linkRev')
      );

      it('returns the latest changelog (0th index)', () =>
        expect(twiglet.latestCommit).to.exist.and.to.deep
          .equal(twigletDocs().rows[2].doc.data[0])
      );

      it('returns the correct array of nodes', () =>
        expect(twiglet.nodes).to.exist.and.to.deep.equal(twigletDocs().rows[0].doc.data)
      );

      it('returns the correct array of links', () =>
        expect(twiglet.links).to.exist.and.to.deep.equal(twigletDocs().rows[1].doc.data)
      );

      it('returns the url for the twiglet', () =>
        expect(twiglet.url).to.exist.and.endsWith('/twiglets/Some%20Twiglet')
      );

      it('returns the url for the twiglet model', () =>
        expect(twiglet.model_url).to.exist.and.endsWith('/twiglets/Some%20Twiglet/model')
      );

      it('returns the url for the changelog', () =>
        expect(twiglet.changelog_url).to.exist.and.endsWith('/twiglets/Some%20Twiglet/changelog')
      );

      it('returns the url for the twiglet views', () =>
        expect(twiglet.views_url).to.exist.and.endsWith('/twiglets/Some%20Twiglet/views')
      );
    });

    describe('errors', () => {
      it('relays errors from the database with correct error codes', () => {
        sandbox.stub(PouchDb.prototype, 'allDocs').returns(Promise.reject({
          status: '500',
          message: 'Internal Server Error or something'
        }));

        return server.inject(req)
          .then((response) => {
            expect(response.result.statusCode).to.equal(500);
            expect(response.result.message).to.equal('An internal server error occurred');
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

  describe('createTwigletHandler', () => {
    function req () {
      return {
        method: 'post',
        url: '/twiglets',
        payload: {
          name: 'Some Twiglet',
          description: 'a description',
          model: 'some model',
          commitMessage: 'Creation',
          cloneTwiglet: 'N/A'
        },
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        }
      };
    }

    describe('successes', () => {
      let put;
      let post;
      let twiglet;
      beforeEach(function* foo () {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [] });
        allDocs.onSecondCall().resolves({ rows: [{
          doc: {
            data: {
              name: 'some model',
            }
          }
        }] });
        allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(3).resolves(twigletDocs());
        post = sandbox.stub(PouchDb.prototype, 'post').resolves({
          id: 'some id',
        });
        const get = sandbox.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletInfo());
        sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
        put = sandbox.stub(PouchDb.prototype, 'put').resolves();
        twiglet = (yield server.inject(req())).result;
      });

      it('returns the newly created twiglet', () =>
        expect(twiglet).to.include.keys({ name: 'Some Name' })
      );

      it('creates the twiglet in the twiglets list database', () =>
        expect(post.getCall(0).args[0]).to.have.keys(
          { name: 'some name', description: 'a description', _id: 'some id' }
        )
      );

      it('logs the post to the commit log.', () =>
        expect(put.getCall(0).args[0]).to.include.keys({ _id: 'changelog' })
      );
    });

    describe('errors', () => {
      describe('Joi errors', () => {
        let request;
        beforeEach(() => {
          request = req();
        });

        it('requires a name', () => {
          delete request.payload.name;
          return server.inject(request)
          .then((response) => {
            expect(response.result.statusCode).to.equal(400);
            expect(response.result.message).to.contain('"name" is required');
          });
        });

        it('requires a description', () => {
          delete request.payload.description;
          return server.inject(request)
          .then((response) => {
            expect(response.result.statusCode).to.equal(400);
            expect(response.result.message).to.contain('"description" is required');
          });
        });

        it('requires a commit message', () => {
          delete request.payload.commitMessage;
          return server.inject(request)
          .then((response) => {
            expect(response.result.statusCode).to.equal(400);
            expect(response.result.message).to.contain('"commitMessage" is required');
          });
        });
      });

      it('responds with a conflict if the twiglet already exists', () => {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.resolves({ rows: [{ doc: (twigletInfo()) }] });
        return server.inject(req())
          .then((response) => {
            expect(response.result.statusCode).to.equal(409);
          });
      });

      it('Passes along the error if the error is anything other than a 404', () => {
        sandbox.stub(PouchDb.prototype, 'allDocs').rejects({ status: 419 });
        return server.inject(req())
          .then((response) => {
            expect(response.result.statusCode).to.equal(419);
          });
      });
    });
  });

  describe('putTwigletHandler', () => {
    function req () {
      return {
        method: 'put',
        url: '/twiglets/Some%20Twiglet',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        },
        payload: {
          name: 'Some Twiglet',
          description: 'a descirption',
          _rev: 'infoRev:nodeRev:linkRev',
          nodes: [{ a: 'node' }],
          links: [{ a: 'link' }],
          commitMessage: 'an update'
        },
      };
    }

    describe('success', () => {
      let put;
      beforeEach(function* foo () {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves(twigletDocs());
        allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(3).resolves(twigletDocs());
        const get = sandbox.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletInfo());
        sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
        put = sandbox.stub(PouchDb.prototype, 'put').resolves();
        yield server.inject(req());
      });

      it('correctly updates the name and description of the twiglet', () => {
        const newTwigletInfo = twigletInfo();
        newTwigletInfo.name = req().payload.name;
        newTwigletInfo.description = req().payload.description;
        expect(put.getCall(0).args[0]).to.deep.equal(newTwigletInfo);
      });

      it('updates the nodes and links', () => {
        expect(put.getCall(1).args[0].data).to.deep.equal(req().payload.nodes);
        expect(put.getCall(2).args[0].data).to.deep.equal(req().payload.links);
      });

      it('adds a changelog entry for the put', () => {
        const expectedLogEntry = {
          user: req().credentials.user.name,
          message: req().payload.commitMessage,
        };
        expect(put.getCall(3).args[0].data[0]).to.include.keys(expectedLogEntry);
      });
    });

    describe('errors', () => {
      let allDocs;
      beforeEach(() => {
        allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves(twigletDocs());
        allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(3).resolves(twigletDocs());
        const get = sandbox.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletInfo());
        sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
      });

      it('fails immediately if the rev cannot be split into 3 parts', () => {
        const request = req();
        request.payload._rev = 'not splittable';
        return server.inject(request)
          .then(response => {
            expect(response.statusCode).to.equal(400);
          });
      });

      it('responds with a 404 the twiglet cannot be found', () => {
        allDocs.onFirstCall().resolves({ rows: [] });
        return server.inject(req())
          .then(response => {
            expect(response.statusCode).to.equal(404);
          });
      });

      describe('_rev mistakes', () => {
        const docs = twigletDocs();
        docs.rows.pop();
        it('breaks when the twigletInfo._rev is incorrect', () => {
          const request = req();
          request.payload._rev = 'INCORRECTinfoRev:nodeRev:linkRev';
          return server.inject(request)
            .then(response => {
              expect(response.statusCode).to.equal(409);
              expect(response.result.data._rev).to.equal('infoRev:nodeRev:linkRev');
            });
        });

        it('breaks when the twigletInfo._rev is incorrect', () => {
          const request = req();
          request.payload._rev = 'infoRev:INCORRECTnodeRev:linkRev';
          return server.inject(request)
            .then(response => {
              expect(response.statusCode).to.equal(409);
              expect(response.result.data._rev).to.equal('infoRev:nodeRev:linkRev');
            });
        });

        it('breaks when the twigletInfo._rev is incorrect', () => {
          const request = req();
          request.payload._rev = 'infoRev:nodeRev:INCORRECTlinkRev';
          return server.inject(request)
            .then(response => {
              expect(response.statusCode).to.equal(409);
              expect(response.result.data._rev).to.equal('infoRev:nodeRev:linkRev');
            });
        });
      });
    });
  });

  describe('deleteTwigletHandler', () => {
    function req () {
      return {
        method: 'delete',
        url: '/twiglets/Some%20Twiglet',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        }
      };
    }

    describe('success', () => {
      beforeEach(() => {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        sandbox.stub(PouchDb.prototype, 'destroy').resolves();
        sandbox.stub(PouchDb.prototype, 'get').resolves({ _id: 'some id', _rev: 'rev' });
        sandbox.stub(PouchDb.prototype, 'remove').resolves();
      });
      it('returns 204 once deleted', () =>
        server.inject(req())
          .then(response => {
            expect(response.statusCode).to.equal(204);
          })
      );
    });

    describe('errors', () => {
      it('relays an error from the database', () => {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        sandbox.stub(PouchDb.prototype, 'destroy')
          .rejects({ status: 419, message: 'some message' });
        return server.inject(req())
          .catch((response) => {
            expect(response.result.statusCode).to.equal(500);
          });
      });
    });
  });
});

module.exports = {
  twigletInfo,
  twigletDocs
};
