const config = require('../../src/utils/config');
const expect = require('chai').expect;
const sinon = require('sinon');
const node = require('../../src/node');
const restler = require('restler');
const server = require('./test-server');

server.route(node.routes);

/* eslint-disable no-unused-expressions */
describe('Node', () => {
  let sandbox = sinon.sandbox.create();

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(restler, 'get');
    sandbox.stub(restler, 'put');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Builds the Rollup View', () => {
    const rolledUpResponse = {
      ok: true,
      id: '_design/nodes',
      rev: '4-a3df20622dd9a8eb9362fe1d76aeed9c'
    };

    it('Builds the map function', () => {
      // setup

      // act
      const result = node.buildMapFunc();

      // assert
      expect(result).to.exist;
      expect(result.includes('function (doc)')).to.be.true;
      expect(result.includes('function (key, values)')).to.be.false;
    });

    it('Builds the reduce function', () => {
      // setup

      // act
      const result = node.buildReduceFunc();

      // assert
      expect(result).to.exist;
      expect(result.includes('function (doc)')).to.be.false;
      expect(result.includes('function (key')).to.be.true;
    });

    it('Builds the view json', () => {
      // setup
      const mapFunc = 'function(doc) {}';
      const reduceFunc = 'function (key, values) {}';

      // act
      const result = node.buildViewJson(mapFunc, reduceFunc);

      // assert
      expect(result.views).to.exist;
      expect(result.views.node_rollup).to.exist;
      expect(result.views.node_rollup.map).to.equal(mapFunc);
      expect(result.views.node_rollup.reduce).to.equal(reduceFunc);
    });

    it('Publishes the nodes rollup view', () => {
      // setup
      const database = 'twig-unittest';
      const viewJson = '';

      restler.put.returns({
        on: sandbox.stub().yields(rolledUpResponse, null)
      });

      // act
      return node.publishView(database, viewJson)
        .then((response) => {
          // assert
          expect(response).to.exist;
        });
    });
  });

  describe('Looksup the Rollup View', () => {
    it('Finds the node rolled up view', () => {
      // setup
      const database = 'twig-unittest';
      const foundResponseData = {
        id: '_design/nodes',
        _rev: '4-a3df20622dd9a8eb9362fe1d76aeed9c',
        views: {
          by_nodes: {
            map: 'function (doc) ...',
            reduce: 'function (key, values) ...'
          }
        }
      };
      const foundResponse = {
        statusCode: 200,
        statusMessage: 'found'
      };

      restler.get.returns({
        on: sandbox.stub().yields(foundResponseData, foundResponse)
      });

      // act
      return node.nodeRollupViewDoesNotExists(database)
        .then((response) => {
          // assert
          expect(response).to.exist;
          expect(response).to.equal(false);
        });
    });

    it('Does not find the node rolled up view', () => {
      // setup
      const database = 'twig-unittest';
      const notFoundResponseData = {
        error: 'not_found',
        reason: 'missing'
      };
      const notFoundResponse = {
        statusCode: 404,
        statusMessage: 'missing'
      };

      restler.get.returns({
        on: sandbox.stub().yields(notFoundResponseData, notFoundResponse)
      });

      // act
      return node.nodeRollupViewDoesNotExists(database)
        .then((response) => {
          // assert
          expect(response).to.exist;
          expect(response).to.equal(true);
        });
    });
  });

  describe('Fetch the Rollup View Data', () => {
    it('Retrieves the data', () => {
      // setup
      const database = 'twig-unittest';
      const foundResponseData = {
        rows: [
          {
            key: 'nodes',
            value: [
              {
                type: 'tribe',
                names: ['Mobile Tribe'],
                attrs: []
              },
              {
                type: 'person',
                names: [
                  'Tribal Leader', 'London Tribal Members', 'USA Tribal Members'
                ],
                attrs: [
                  'firstname', 'lastname', 'members'
                ]
              }
            ]
          }
        ]
      };
      const foundResponse = {
        statusCode: 200,
        statusMessage: ''
      };

      restler.get.returns({
        on: sandbox.stub().yields(foundResponseData, foundResponse)
      });

      // act
      return node.nodeRollupViewData(database)
        .then((response) => {
          // assert
          expect(response).to.exist;
          expect(response.rows).to.exist;
          expect(response.rows.length).to.equal(1);
        });
    });
  });

  describe('REST API', () => {
    const req = {
      method: 'GET',
      url: '/twiglets/twig-unittest/nodes/rolledup'
    };
    const notFoundResponseData = {
      error: 'not_found',
      reason: 'missing'
    };
    const notFoundResponse = {
      statusCode: 404,
      statusMessage: 'missing'
    };
    const publishViewResponseData = {
      ok: true,
      id: '_design/nodes',
      rev: '4-a3df20622dd9a8eb9362fe1d76aeed9c'
    };
    const foundResponseData = {
      rows: [
        {
          key: 'nodes',
          value: [
            {
              type: 'tribe',
              names: ['Mobile Tribe'],
              attrs: []
            },
            {
              type: 'person',
              names: [
                'Tribal Leader', 'London Tribal Members', 'USA Tribal Members'
              ],
              attrs: [
                'firstname', 'lastname', 'members'
              ]
            }
          ]
        }
      ]
    };
    const foundResponse = {
      statusCode: 200,
      statusMessage: ''
    };

    it('Creates view and gets node rolled up view data', () => {
      // setup
      const nodeRollupViewDoesNotExists = sandbox.spy(node, 'nodeRollupViewDoesNotExists');
      const publishView = sandbox.spy(node, 'publishView');
      const nodeRollupViewData = sandbox.spy(node, 'nodeRollupViewData');

      restler.get.onCall(0).returns({
        on: sandbox.stub().yields(notFoundResponseData, notFoundResponse)
      });

      restler.put.returns({
        on: sandbox.stub().yields(publishViewResponseData, null)
      });

      restler.get.onCall(1).returns({
        on: sandbox.stub().yields(foundResponseData, foundResponse)
      });

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(nodeRollupViewDoesNotExists.calledOnce,
            'nodeRolledupViewDoesNotExist was not called just once.').to.be.true;
          expect(publishView.calledOnce,
            'publishView was not called just once.').to.be.true;
          expect(nodeRollupViewData.calledOnce,
            'nodeRollupViewData was not called just once.').to.be.true;
          expect(response.result.rows.length).to.equal(1);
          expect(response.result.rows[0].key).to.equal('nodes');
          expect(response.statusCode).to.eq(200);
          expect(response.result.rows.length).to.equal(1);
          expect(response.result.rows[0].key).to.equal('nodes');
        });
    });

    it('Does not create view but still gets node rolled up view data', () => {
      // setup
      const nodeRollupViewDoesNotExists = sandbox.spy(node, 'nodeRollupViewDoesNotExists');
      const publishView = sandbox.spy(node, 'publishView');
      const nodeRollupViewData = sandbox.spy(node, 'nodeRollupViewData');

      restler.get.onCall(0).returns({
        on: sandbox.stub().yields(notFoundResponseData, foundResponse)
      });

      restler.get.onCall(1).returns({
        on: sandbox.stub().yields(foundResponseData, foundResponse)
      });

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(nodeRollupViewDoesNotExists.calledOnce,
            'nodeRolledupViewDoesNotExist was not called just once.').to.be.true;
          expect(publishView.calledOnce,
            'publishView was not called just once.').to.be.false;
          expect(nodeRollupViewData.calledOnce,
            'nodeRollupViewData was not called just once.').to.be.true;
          expect(response.result.rows.length).to.equal(1);
          expect(response.result.rows[0].key).to.equal('nodes');
        });
    });

    it('Node Rollup View Exists throws error', () => {
      // setup
      const errorMessage = '...';
      const errorResponse = {
        statusCode: 500,
        statusMessage: errorMessage
      };
      const nodeRollupViewDoesNotExists = sandbox.spy(node, 'nodeRollupViewDoesNotExists');
      const publishView = sandbox.spy(node, 'publishView');
      const nodeRollupViewData = sandbox.spy(node, 'nodeRollupViewData');

      restler.get.onCall(0).returns({
        on: sandbox.stub().yields(null, errorResponse)
      });

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(nodeRollupViewDoesNotExists.calledOnce,
            'nodeRolledupViewDoesNotExist was not called just once.').to.be.true;
          expect(publishView.calledOnce,
            'publishView was not called just once.').to.be.false;
          expect(nodeRollupViewData.calledOnce,
            'nodeRollupViewData was not called just once.').to.be.false;
          expect(response.statusCode).to.equal(500);
          expect(response.result.statusCode).to.equal(500);
        });
    });

    it('Publish View throws error', () => {
      // setup
      const errorMessage = '...';
      const errorResponse = {
        statusCode: 500,
        statusMessage: errorMessage
      };
      const nodeRollupViewDoesNotExists = sandbox.spy(node, 'nodeRollupViewDoesNotExists');
      const publishView = sandbox.spy(node, 'publishView');
      const nodeRollupViewData = sandbox.spy(node, 'nodeRollupViewData');

      restler.get.onCall(0).returns({
        on: sandbox.stub().yields(notFoundResponseData, notFoundResponse)
      });

      restler.put.returns({
        on: sandbox.stub().yields(null, errorResponse)
      });

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(nodeRollupViewDoesNotExists.calledOnce,
            'nodeRolledupViewDoesNotExist was not called just once.').to.be.true;
          expect(publishView.calledOnce,
            'publishView was not called just once.').to.be.true;
          expect(nodeRollupViewData.calledOnce,
            'nodeRollupViewData was not called just once.').to.be.false;
          expect(response.statusCode).to.equal(500);
          expect(response.result.statusCode).to.equal(500);
        });
    });

    it('Node Rolled Up View Data throws error', () => {
      // setup
      const errorMessage = '...';
      const errorResponse = {
        statusCode: 500,
        statusMessage: errorMessage
      };
      const nodeRollupViewDoesNotExists = sandbox.spy(node, 'nodeRollupViewDoesNotExists');
      const publishView = sandbox.spy(node, 'publishView');
      const nodeRollupViewData = sandbox.spy(node, 'nodeRollupViewData');

      restler.get.onCall(0).returns({
        on: sandbox.stub().yields(notFoundResponseData, notFoundResponse)
      });

      restler.put.returns({
        on: sandbox.stub().yields(publishViewResponseData, null)
      });

      restler.get.onCall(1).returns({
        on: sandbox.stub().yields(null, errorResponse)
      });

      // act
      return server.inject(req)
        .then((response) => {
          // assert
          expect(nodeRollupViewDoesNotExists.calledOnce,
            'nodeRolledupViewDoesNotExist was not called just once.').to.be.true;
          expect(publishView.calledOnce,
            'publishView was not called just once.').to.be.true;
          expect(nodeRollupViewData.calledOnce,
            'nodeRollupViewData was not called just once.').to.be.true;
          expect(response.statusCode).to.equal(500);
          expect(response.result.statusCode).to.equal(500);
        });
    });
  });
});
/* eslint-enable no-unused-expressions */
