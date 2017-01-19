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
    const req = {
      method: 'get',
      url: '/twiglets/someid'
    };
    describe('successes', () => {
      beforeEach(() => {
        sandbox.stub(PouchDb.prototype, 'get').returns(Promise.resolve(twigletInfo()));
        sandbox.stub(PouchDb.prototype, 'allDocs').returns(Promise.resolve(twigletDocs()));
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
              .equal(twigletDocs().rows[2].doc.data[0].message);
          })
      );

      it('returns the correct array of nodes and links', () =>
        server.inject(req)
          .then((response) => {
            const twiglet = response.result;
            expect(twiglet.nodes).to.exist.and.to.deep.equal(twigletDocs().rows[0].doc.data);
            expect(twiglet.links).to.exist.and.to.deep.equal(twigletDocs().rows[1].doc.data);
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
          _id: 'anId',
          name: 'some name',
          description: 'a description',
          model: 'some model',
          commitMessage: 'Creation'
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
      beforeEach(() => {
        const info = sandbox.stub(PouchDb.prototype, 'info');
        info.onFirstCall().rejects({ status: 404 });
        info.resolves();

        const get = sandbox.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletInfo());
        sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
        put = sandbox.stub(PouchDb.prototype, 'put').resolves();
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves(twigletDocs());
      });

      it('returns the newly created twiglet', () =>
          server.inject(req())
          .then(response => {
            expect(response.result).to.include.keys({ _id: 'anId' });
          })
      );

      it('creates the twiglet in the twiglets list database', () =>
          server.inject(req())
          .then(() => {
            expect(put.getCall(0).args[0]).to.have.keys(
              { _id: 'anId', name: 'some name', description: 'a description' }
            );
          })
      );

      it('logs the post to the commit log.', () =>
          server.inject(req())
          .then(() => {
            expect(put.getCall(1).args[0]).to.include.keys({ _id: 'changelog' });
          })
      );
    });

    describe('errors', () => {
      describe('Joi errors', () => {
        let request;
        beforeEach(() => {
          request = req();
        });

        it('requires an id', () => {
          delete request.payload._id;
          return server.inject(request)
          .then((response) => {
            expect(response.result.statusCode).to.equal(400);
            expect(response.result.message).to.contain('"_id" is required');
          });
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
        sandbox.stub(PouchDb.prototype, 'info').resolves();

        return server.inject(req())
          .then((response) => {
            expect(response.result.statusCode).to.equal(409);
          });
      });

      it('Passes along the error if the error is anything other than a 404', () => {
        sandbox.stub(PouchDb.prototype, 'info').rejects({ status: 500 });

        return server.inject(req())
          .then((response) => {
            expect(response.result.statusCode).to.equal(500);
          });
      });
    });
  });

  describe('putTwigletHandler', () => {
    function req () {
      return {
        method: 'put',
        url: '/twiglets/anId',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        },
        payload: {
          name: 'a name',
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
        sandbox.stub(PouchDb.prototype, 'info').resolves();
        const get = sandbox.stub(PouchDb.prototype, 'get').resolves(twigletInfo());
        get.withArgs('changelog').rejects({ status: 404 });
        sandbox.stub(PouchDb.prototype, 'allDocs').resolves(twigletDocs());
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

      it('returns the updated twiglet', () => {

      });
    });

    describe('errors', () => {
      it('fails immediately if the rev cannot be split into 3 parts', () => {
        const request = req();
        request.payload._rev = 'not splittable';
        return server.inject(request)
          .then(response => {
            expect(response.statusCode).to.equal(400);
          });
      });

      it('responds with a 404 the twiglet cannot be found', () => {
        sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 404 });
        return server.inject(req())
          .then(response => {
            expect(response.statusCode).to.equal(404);
          });
      });

      describe('_rev mistakes', () => {
        const docs = twigletDocs();
        docs.rows.pop();
        it('breaks when the twigletInfo._rev is incorrect', () => {
          sandbox.stub(PouchDb.prototype, 'get').resolves(twigletInfo());
          sandbox.stub(PouchDb.prototype, 'allDocs').resolves(twigletDocs());
          const request = req();
          request.payload._rev = 'INCORRECTinfoRev:nodeRev:linkRev';
          return server.inject(request)
            .then(response => {
              expect(response.statusCode).to.equal(409);
              expect(response.result._rev).to.equal('infoRev:nodeRev:linkRev');
            });
        });

        it('breaks when the twigletInfo._rev is incorrect', () => {
          sandbox.stub(PouchDb.prototype, 'get').resolves(twigletInfo());
          sandbox.stub(PouchDb.prototype, 'allDocs').resolves(twigletDocs());
          const request = req();
          request.payload._rev = 'infoRev:INCORRECTnodeRev:linkRev';
          return server.inject(request)
            .then(response => {
              expect(response.statusCode).to.equal(409);
              expect(response.result._rev).to.equal('infoRev:nodeRev:linkRev');
            });
        });

        it('breaks when the twigletInfo._rev is incorrect', () => {
          sandbox.stub(PouchDb.prototype, 'get').resolves(twigletInfo());
          sandbox.stub(PouchDb.prototype, 'allDocs').resolves(twigletDocs());
          const request = req();
          request.payload._rev = 'infoRev:nodeRev:INCORRECTlinkRev';
          return server.inject(request)
            .then(response => {
              expect(response.statusCode).to.equal(409);
              expect(response.result._rev).to.equal('infoRev:nodeRev:linkRev');
            });
        });
      });
    });
  });

  describe('deleteTwigletHandler', () => {
    function req () {
      return {
        method: 'delete',
        url: '/twiglets/anId',
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
        sandbox.stub(PouchDb.prototype, 'destroy').rejects({ status: 500 });

        return server.inject(req())
          .catch((response) => {
            expect(response.result.statusCode).to.equal(500);
          });
      });
    });
  });
});

