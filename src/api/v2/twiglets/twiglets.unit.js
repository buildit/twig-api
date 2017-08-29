'use strict';
/* eslint no-unused-expressions: 0 */
const chai = require('chai');
chai.use(require('chai-string'));
const sinon = require('sinon');
require('sinon-as-promised');
const PouchDb = require('pouchdb');
const Twiglet = require('./twiglets');
const server = require('../../../../test/unit/test-server');

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
function twigletDocs (keys) {
  const rows = [
    {
      id: 'nodes',
      doc: {
        _rev: 'nodeRev',
        data: [
          {
            id: 'node201',
            name: 'node 1',
            type: 'ent1'
          },
          {
            id: 'node202',
            name: 'node 2',
            type: 'ent2'
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
            id: 'link201',
            source: 'node201',
            target: 'node202',
          },
          {
            id: 'link202',
            source: 'node202',
            target: 'node201',
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
      id: 'views_2',
      doc: {
        _rev: 'viewsRev',
        data: [
          {
            description: 'view description',
            name: 'view name',
            userState: {
              autoConnectivity: 'in',
              autoScale: 'linear',
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
    {
      id: 'events',
      doc: {
        _rev: 'some rev',
        data: [
          {
            id: 'bd79213c-8e17-49bc-9fc2-392f3c5acd28',
            description: 'description of Event',
            links: [
              {
                id: '26ce4b06-af0b-4c29-8368-631441915e67',
                association: 'some name',
                source: 'c11000af-c3a5-4db8-a7ea-74255c6d672e',
                target: 'bb7d6af2-48ed-42f7-9fc1-705eb49b09bc',
              },
              {
                id: '626158d4-56db-4bfa-822b-9aaf7b17e88f',
                source: 'ab2752a2-cbc5-412d-87f8-fcc4d0000ee8',
                target: 'c11000af-c3a5-4db8-a7ea-74255c6d672e',
                attrs: [
                  { key: 'key1', value: 'value1' },
                  { key: 'key2', value: 'value2' }
                ],
              }
            ],
            nodes: [
              {
                id: 'c11000af-c3a5-4db8-a7ea-74255c6d672e',
                location: '',
                name: 'node 1',
                type: 'ent1',
                x: 100,
                y: 200,
                attrs: [],
              },
              {
                id: 'bb7d6af2-48ed-42f7-9fc1-705eb49b09bc',
                location: '',
                name: 'node 2',
                type: 'ent2',
                x: 200,
                y: 100,
                attrs: [
                  { key: 'key1', value: 'value1' },
                  { key: 'key2', value: 'value2' }
                ],
              },
              {
                id: 'ab2752a2-cbc5-412d-87f8-fcc4d0000ee8',
                location: '',
                name: 'node 3',
                type: 'ent3',
                x: 1000,
                y: 900,
                attrs: [],
              }
            ],
            name: 'event name',
          },
          {
            id: '6fe3d7f2-240b-40b1-a689-cbf9bc2fb9e8',
            description: 'another event',
            links: [],
            nodes: [],
            name: 'event 2',
          },
        ]
      }
    },
    {
      id: 'sequences',
      doc: {
        _rev: 'some rev',
        data: [
          {
            id: '75c4dc47-4131-4503-aa82-2c09ead3f357',
            name: 'sequence 1',
            description: 'description of sequence',
            events: [
              'f6b49795-0418-4ebd-ae52-adeb96885119',
              '1ff70005-08d6-4131-a8c9-e08f276a975b'
            ]
          },
          {
            id: 'ae2c4536-e0bb-43ed-a7c5-18cb23315a50',
            name: 'sequence 2',
            events: [
              'f6b49795-0418-4ebd-ae52-adeb96885119',
              '1ff70005-08d6-4131-a8c9-e08f276a975b',
              '2a0e95d9-91c5-4a64-b283-bd94195a8ef6'
            ]
          }
        ]
      }
    },
    {
      id: 'model',
      doc: {
        _rev: 'modelRev',
        data: {
          entities: {
            ent1: {},
            ent2: {},
          }
        }
      }
    },
  ];
  if (!keys) {
    return { rows };
  }
  return { rows: rows.filter(row => keys.includes(row.id)) };
}

describe('/v2/twiglets', () => {
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
      url: '/v2/twiglets'
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
      url: '/v2/twiglets/Some%20Twiglet'
    };
    let twiglet;
    describe('successes', () => {
      beforeEach(function* foo () {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves(twigletDocs(['nodes', 'links', 'changelog']));
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
        url: '/v2/twiglets',
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

    describe('successes - basic creation', () => {
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
              entities: {},
            }
          }
        }] });
        allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(3).resolves(twigletDocs(['nodes', 'links', 'changelog']));
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

    describe('successes - basic creation with old model', () => {
      let postedEntities;

      beforeEach(function* foo () {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [] });
        allDocs.onSecondCall().resolves({ rows: [{
          doc: {
            data: {
              name: 'some model',
              entities: {
                ent1: {
                  class: 'some class',
                },
                ent2: {
                  class: 'some other class',
                  attributes: [{ name: 'name1', dataType: 'string', required: true }],
                }
              }
            }
          }
        }] });
        allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(3).resolves(twigletDocs(['nodes', 'links', 'changelog']));
        sandbox.stub(PouchDb.prototype, 'post').resolves({
          id: 'some id',
        });
        const get = sandbox.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletInfo());
        const bulkDocs = sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
        sandbox.stub(PouchDb.prototype, 'put').resolves();
        yield server.inject(req());
        postedEntities = bulkDocs.getCall(0).args[0][0].data.entities;
      });

      it('adds the attributes key with an empty array', () => {
        expect(postedEntities.ent1.attributes).to.deep.equal([]);
      });

      it('adds the type key with same name as the key', () => {
        expect(postedEntities.ent1.type).to.deep.equal('ent1');
      });

      it('does not overwrite existing attributes', () => {
        expect(postedEntities.ent2.attributes).to.deep
          .equal([{ name: 'name1', dataType: 'string', required: true }]);
      });
    });

    describe('success - from JSON', () => {
      function jsonTwiglet () {
        return {
          model: {
            entities: {
              ent1: {},
              ent2: {}
            }
          },
          nodes: [
            {
              id: 'some node',
              type: 'ent1',
            },
            {
              id: 'some other node',
              type: 'ent2',
            }
          ],
          links: [{
            id: 'some link'
          }],
          views: [{
            links: {},
            name: 'some view',
            nodes: {},
            userState: {
              autoConnectivity: 'some string',
              autoScale: 'some string',
              cascadingCollapse: true,
              currentNode: 'some string',
              filters: { a: 'filter' },
              forceChargeStrength: 10,
              forceGravityX: 10,
              forceGravityY: 10,
              forceLinkDistance: 10,
              forceLinkStrength: 10,
              forceVelocityDecay: 10,
              linkType: 'some string',
              nodeSizingAutomatic: true,
              scale: 10,
              showLinkLabels: true,
              showNodeLabels: true,
              treeMode: true,
              traverseDepth: 3,
            }
          }],
          events: [
            {
              description: 'some event description',
              links: [],
              name: 'some event',
              nodes: [],
              id: 'some event id'
            }
          ],
          sequences: [
            {
              description: 'some event description',
              events: ['a', 'b'],
              id: 'some sequence id',
              name: 'some sequence name',
            }
          ],
        };
      }
      let bulkDocs;
      let twiglet;
      let put;
      let post;
      beforeEach(function* foo () {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [] });
        allDocs.onSecondCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onThirdCall().resolves(twigletDocs(['nodes', 'links', 'changelog']));
        post = sandbox.stub(PouchDb.prototype, 'post').resolves({
          id: 'some id',
        });
        const get = sandbox.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletInfo());
        bulkDocs = sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
        put = sandbox.stub(PouchDb.prototype, 'put').resolves();
        const jsonReq = req();
        jsonReq.payload.json = JSON.stringify(jsonTwiglet());
        twiglet = (yield server.inject(jsonReq)).result;
      });

      it('successfully creates the twiglet', () => {
        expect(twiglet).to.include.keys({ name: 'Some Name' });
      });

      it('creates the twiglet in the twiglets list database', () =>
        expect(post.getCall(0).args[0]).to.have.keys(
          { name: 'some name', description: 'a description', _id: 'some id' }
        )
      );

      it('pushes the json data to the bulkDocs call', () => {
        const json = jsonTwiglet();
        expect(bulkDocs.firstCall.args[0]).to.deep.equal([
          { _id: 'model', data: json.model },
          { _id: 'nodes', data: json.nodes },
          { _id: 'links', data: json.links },
          { _id: 'views_2', data: json.views },
          { _id: 'events', data: json.events },
          { _id: 'sequences', data: json.sequences },
        ]);
      });

      it('logs the post to the commit log.', () =>
        expect(put.getCall(0).args[0]).to.include.keys({ _id: 'changelog' })
      );
    });

    describe('successes - cloning', () => {
      let put;
      let post;
      let twiglet;
      let bulkDocs;
      function clone () {
        return {
          rows: [
            { doc: { data: 'a link' } },
            { doc: { data: 'a model' } },
            { doc: { data: 'a node' } },
            { doc: { data: 'a view' } },
            { doc: { data: 'an event' } },
            { doc: { data: 'a sequence' } },
          ]
        };
      }
      beforeEach(function* foo () {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [] });
        allDocs.onSecondCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onThirdCall().resolves(clone());
        allDocs.onCall(3).resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(4).resolves(twigletDocs(['nodes', 'links', 'changelog']));
        post = sandbox.stub(PouchDb.prototype, 'post').resolves({
          id: 'some id',
        });
        const get = sandbox.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletInfo());
        bulkDocs = sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
        put = sandbox.stub(PouchDb.prototype, 'put').resolves();
        const cloneReq = req();
        cloneReq.payload.cloneTwiglet = 'Some Twiglet';
        twiglet = (yield server.inject(cloneReq)).result;
      });

      it('returns the newly created twiglet', () =>
        expect(twiglet).to.include.keys({ name: 'Some Name' })
      );

      it('creates the twiglet in the twiglets list database', () =>
        expect(post.getCall(0).args[0]).to.have.keys(
          { name: 'some name', description: 'a description', _id: 'some id' }
        )
      );

      it('pushes the cloned data to the bulkDocs call', () => {
        const clonedTwiglet = clone();
        expect(bulkDocs.firstCall.args[0]).to.deep.equal([
          { _id: 'links', data: clonedTwiglet.rows[0].doc.data },
          { _id: 'model', data: clonedTwiglet.rows[1].doc.data },
          { _id: 'nodes', data: clonedTwiglet.rows[2].doc.data },
          { _id: 'views_2', data: clonedTwiglet.rows[3].doc.data },
          { _id: 'events', data: clonedTwiglet.rows[4].doc.data },
          { _id: 'sequences', data: clonedTwiglet.rows[5].doc.data },
        ]);
      });

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
        url: '/v2/twiglets/Some%20Twiglet',
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
          nodes: [
            {
              id: 'node1',
              name: 'node 1',
              type: 'ent1'
            },
            {
              id: 'node2',
              name: 'node 2',
              type: 'ent2'
            }
          ],
          links: [
            {
              id: 'link 1',
              source: 'node1',
              target: 'node2',
            },
            {
              id: 'link 2',
              source: 'node2',
              target: 'node1',
            }
          ],
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
        allDocs.onCall(3).resolves(twigletDocs(['nodes', 'links', 'model']));
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

      it('errors if the a node.type is not in the entities', () => {
        const request = req();
        request.payload.nodes[1].type = 'ent3';
        server.inject(request).then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.message.includes('some other new node id')).to.be(true);
        })
        .catch(() => {});
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

  describe('patchTwigletHandler', () => {
    function req () {
      return {
        method: 'PATCH',
        url: '/v2/twiglets/Some%20Twiglet',
        credentials: {
          id: 123,
          username: 'ben',
          user: {
            name: 'Ben Hernandez',
          },
        },
        payload: {
          name: 'Some new name',
          description: 'Some new description',
          _rev: 'infoRev:nodeRev:linkRev',
          nodes: [
            {
              id: 'some new node id',
              name: 'node 1',
              type: 'ent1'
            },
            {
              id: 'some other new node id',
              name: 'node 2',
              type: 'ent2'
            }
          ],
          links: [
            {
              id: 'some new link id',
              source: 'some new node id',
              target: 'some other new node id',
            },
            {
              id: 'some other new node id',
              source: 'some other new node id',
              target: 'some new node id',
            }
          ],
          commitMessage: 'an update'
        },
      };
    }

    describe('success', () => {
      let put;
      beforeEach(() => {
        const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
        allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onSecondCall().resolves(twigletDocs());
        allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
        allDocs.onCall(3).resolves(twigletDocs(['nodes', 'links', 'changelog']));
        const get = sandbox.stub(PouchDb.prototype, 'get');
        get.withArgs('changelog').rejects({ status: 404 });
        get.resolves(twigletInfo());
        sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
        put = sandbox.stub(PouchDb.prototype, 'put').resolves();
      });

      describe('updating name only', () => {
        beforeEach(function* foo () {
          const request = req();
          delete request.payload.description;
          delete request.payload.links;
          delete request.payload.nodes;
          yield server.inject(request);
        });

        it('correctly updates the name', () => {
          expect(put.getCall(0).args[0].name).to.deep.equal(req().payload.name);
        });

        it('keeps the original description', () => {
          expect(put.getCall(0).args[0].description).to.deep.equal(twigletInfo().description);
        });

        it('keeps the original nodes', () => {
          expect(put.getCall(1).args[0].data).to.deep.equal(twigletDocs().rows[0].doc.data);
        });

        it('keeps the original links', () => {
          expect(put.getCall(2).args[0].data).to.deep.equal(twigletDocs().rows[1].doc.data);
        });
      });

      describe('updating description only', () => {
        beforeEach(function* foo () {
          const request = req();
          delete request.payload.name;
          delete request.payload.links;
          delete request.payload.nodes;
          yield server.inject(request);
        });

        it('correctly updates the description', () => {
          expect(put.getCall(0).args[0].description).to.deep.equal(req().payload.description);
        });

        it('keeps the original name', () => {
          expect(put.getCall(0).args[0].name).to.deep.equal(twigletInfo().name);
        });

        it('keeps the original nodes', () => {
          expect(put.getCall(1).args[0].data).to.deep.equal(twigletDocs().rows[0].doc.data);
        });

        it('keeps the original links', () => {
          expect(put.getCall(2).args[0].data).to.deep.equal(twigletDocs().rows[1].doc.data);
        });
      });

      describe('updating nodes only', () => {
        beforeEach(function* foo () {
          const request = req();
          delete request.payload.name;
          delete request.payload.links;
          delete request.payload.description;
          yield server.inject(request);
        });

        it('correctly updates the nodes', () => {
          expect(put.getCall(1).args[0].data).to.deep.equal(req().payload.nodes);
        });

        it('keeps the original name', () => {
          expect(put.getCall(0).args[0].name).to.deep.equal(twigletInfo().name);
        });

        it('keeps the original description', () => {
          expect(put.getCall(0).args[0].description).to.deep.equal(twigletInfo().description);
        });

        it('keeps the original links', () => {
          expect(put.getCall(2).args[0].data).to.deep.equal(twigletDocs().rows[1].doc.data);
        });
      });

      describe('updating links only', () => {
        beforeEach(function* foo () {
          const request = req();
          delete request.payload.name;
          delete request.payload.nodes;
          delete request.payload.description;
          yield server.inject(request);
        });

        it('correctly updates the links', () => {
          expect(put.getCall(2).args[0].data).to.deep.equal(req().payload.links);
        });

        it('keeps the original name', () => {
          expect(put.getCall(0).args[0].name).to.deep.equal(twigletInfo().name);
        });

        it('keeps the original description', () => {
          expect(put.getCall(0).args[0].description).to.deep.equal(twigletInfo().description);
        });

        it('keeps the original nodes', () => {
          expect(put.getCall(1).args[0].data).to.deep.equal(twigletDocs().rows[0].doc.data);
        });
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

      it('errors if the a node.type is not in the entities', () => {
        const request = req();
        delete request.payload.name;
        delete request.payload.links;
        delete request.payload.description;
        request.payload.nodes[1].type = 'ent3';
        server.inject(request).then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.message.includes('some other new node id')).to.be(true);
        })
        .catch(() => {});
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
        url: '/v2/twiglets/Some%20Twiglet',
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
