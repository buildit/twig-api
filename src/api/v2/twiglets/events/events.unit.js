// 'use strict';
// /* eslint no-unused-expressions: 0 */
// const expect = require('chai').expect;
// const sinon = require('sinon');
// require('sinon-as-promised');
// const PouchDb = require('pouchdb');
// const Events = require('./events');
// const server = require('../../../../../test/unit/test-server');
// const twigletInfo = require('../twiglets.unit').twigletInfo;
// const twigletDocs = require('../twiglets.unit').twigletDocs;

// server.route(Events.routes);

// describe('/v2/Twiglet::Events', () => {
//   let sandbox = sinon.sandbox.create();
//   beforeEach(() => {
//     sandbox = sinon.sandbox.create();
//   });

//   afterEach(() => {
//     sandbox.restore();
//   });

//   describe('getEventsHandler', () => {
//     function req () {
//       return {
//         method: 'GET',
//         url: '/v2/twiglets/Some%20Twiglet/events',
//       };
//     }

//     beforeEach(() => {
//       const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
//       allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//     });

//     describe('success', () => {
//       let response;


//       beforeEach(function* foo () {
//         sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[4].doc);
//         response = yield server.inject(req());
//       });

//       it('has a status of OK', () => {
//         expect(response.statusCode).to.equal(200);
//       });

//       it('only returns 3 keys per event', () => {
//         expect(Reflect.ownKeys(response.result[0]).length).to.equal(3);
//       });

//       it('returns the url', () => {
//         const eventUrl = '/twiglets/Some%20Twiglet/events/bd79213c-8e17-49bc-9fc2-392f3c5acd28';
//         expect(response.result[0].url).to.exist.and.endsWith(eventUrl);
//       });

//       it('returns the events', () => {
//         expect(response.result).to.have.length.of(2);
//       });
//     });

//     describe('errors', () => {
//       it('returns an empty array if there are no events on the twiglet yet', function* foo () {
//         sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 404 });
//         const response = yield server.inject(req());
//         expect(response.result).to.deep.equal([]);
//       });

//       it('relays errors', function* foo () {
//         sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 420 });
//         const response = yield server.inject(req());
//         expect(response.statusCode).to.equal(420);
//       });

//       it('passes 500 for unknown errors', function* foo () {
//         sandbox.stub(PouchDb.prototype, 'get').rejects({ message: 'some message' });
//         const response = yield server.inject(req());
//         expect(response.statusCode).to.equal(500);
//       });
//     });
//   });

//   describe('getViewHandler', () => {
//     const event = twigletDocs().rows[4].doc.data[0];
//     function req () {
//       return {
//         method: 'GET',
//         url: '/v2/twiglets/Some%20Twiglet/events/bd79213c-8e17-49bc-9fc2-392f3c5acd28',
//       };
//     }

//     beforeEach(() => {
//       const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
//       allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//     });

//     describe('success', () => {
//       let response;

//       beforeEach(function* foo () {
//         sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[4].doc);
//         response = yield server.inject(req());
//       });

//       it('has a status of OK', () => {
//         expect(response.statusCode).to.equal(200);
//       });

//       it('returns the description', () => {
//         expect(response.result.description)
//           .to.exist.and.equal(event.description);
//       });

//       it('returns the links', () => {
//         expect(response.result.links).to.exist.and.deep.equal(event.links);
//       });

//       it('returns the name', () => {
//         expect(response.result.name).to.exist.and.equal(event.name);
//       });

//       it('returns the nodes', () => {
//         expect(response.result.nodes).to.exist.and.deep.equal(event.nodes);
//       });

//       it('returns the url', () => {
//         const viewUrl = '/twiglets/Some%20Twiglet/events/bd79213c-8e17-49bc-9fc2-392f3c5acd28';
//         expect(response.result.url).to.exist.and.endsWith(viewUrl);
//       });
//     });

//     describe('errors', () => {
//       it('relays errors', function* foo () {
//         sandbox.stub(PouchDb.prototype, 'get').rejects({ status: 420 });
//         const response = yield server.inject(req());
//         expect(response.statusCode).to.equal(420);
//       });

//       it('passes 500 for unknown errors', function* foo () {
//         sandbox.stub(PouchDb.prototype, 'get').rejects({ message: 'some message' });
//         const response = yield server.inject(req());
//         expect(response.statusCode).to.equal(500);
//       });
//     });
//   });

//   describe.only('postViewsHandler', () => {
//     function req () {
//       const singleEvent = twigletDocs().rows[4].doc.data[0];
//       console.log(singleEvent);
//       return {
//         method: 'POST',
//         url: '/v2/twiglets/Some%20Twiglet/events',
//         credentials: {
//           id: 123,
//           username: 'ben',
//           user: {
//             name: 'Ben Hernandez',
//           },
//         },
//         payload: {
//           description: 'some description',
//           name: 'Ben got fired',
//           links: singleEvent.links,
//           nodes: singleEvent.nodes,
//         }
//       };
//     }

//     describe('success', () => {
//       let response;
//       let put;
//       beforeEach(function* foo () {
//         sandbox.stub(PouchDb.prototype, 'allDocs')
            // .resolves({ rows: [{ doc: (twigletInfo()) }] });
//         sandbox.stub(PouchDb.prototype, 'get').resolves(twigletDocs().rows[4].doc);
//         put = sandbox.stub(PouchDb.prototype, 'put').resolves('');
//         response = yield server.inject(req());
//         console.log(response.result);
//       });

//       it('calls put', () => {
//         expect(put.callCount).to.equal(1);
//       });

//       it('pushes the new event to the array', () => {
//         expect(put.onFirstCall().args[0].data.length).to.equal(3);
//       });

//       it('returns CREATED', () => {
//         expect(response.statusCode).to.equal(201);
//       });

//       it('returns OK', () => {
//         expect(response.result).to.equal('OK');
//       });
//     });

//     describe('errors', () => {
//       let allDocs;
//       beforeEach(() => {
//         allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
//         allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//         allDocs.onSecondCall().resolves(twigletDocs());
//         allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//         allDocs.onCall(3).resolves(twigletDocs());
//         const get = sandbox.stub(PouchDb.prototype, 'get');
//         get.withArgs('changelog').rejects({ status: 404 });
//         get.resolves(twigletDocs().rows[3].doc);
//         sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
//       });

//       it('relays the error', () => {
//         sandbox.stub(PouchDb.prototype, 'put').rejects({ status: 420 });
//         return server.inject(req())
//           .then((response) => {
//             expect(response.result.statusCode).to.equal(420);
//           });
//       });
//     });
//   });

//   describe('putViewsHandler', () => {
//     function req () {
//       return {
//         method: 'PUT',
//         url: '/v2/twiglets/Some%20Twiglet/views/view%20name',
//         credentials: {
//           id: 123,
//           username: 'ben',
//           user: {
//             name: 'Ben Hernandez',
//           },
//         },
//         payload: {
//           description: 'view description',
//           links: {},
//           nodes: {},
//           name: 'new view name',
//           userState: {
//             autoConnectivity: 'in',
//             autoScale: 'linear',
//             bidirectionalLinks: true,
//             cascadingCollapse: true,
//             currentNode: null,
//             filters: [{
//               attributes: [],
//               types: { }
//             }],
//             forceChargeStrength: 0.1,
//             forceGravityX: 0.1,
//             forceGravityY: 1,
//             forceLinkDistance: 20,
//             forceLinkStrength: 0.5,
//             forceVelocityDecay: 0.9,
//             linkType: 'path',
//             nodeSizingAutomatic: true,
//             scale: 8,
//             showLinkLabels: false,
//             showNodeLabels: false,
//             traverseDepth: 3,
//             treeMode: false,
//           }
//         }
//       };
//     }

//     describe('success', () => {
//       let response;
//       let put;
//       let allDocs;
//       beforeEach(function* foo () {
//         allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
//         allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//         allDocs.onSecondCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//         const get = sandbox.stub(PouchDb.prototype, 'get');
//         get.withArgs('changelog').rejects({ status: 404 });
//         get.resolves(twigletDocs().rows[3].doc);
//         sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
//         put = sandbox.stub(PouchDb.prototype, 'put').resolves(getViewResults());
//         response = yield server.inject(req());
//       });

//       it('calls put', () => {
//         expect(put.callCount).to.equal(2);
//       });

//       it('has a status of OK', () => {
//         expect(response.statusCode).to.equal(200);
//       });

//       it('returns the new view', () => {
//         expect(response.result).to.include.keys({ name: 'new view name' });
//       });
//     });

//     describe('errors', () => {
//       let allDocs;
//       beforeEach(() => {
//         allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
//         allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//         allDocs.onSecondCall().resolves(twigletDocs());
//         allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//         allDocs.onCall(3).resolves(twigletDocs());
//         const get = sandbox.stub(PouchDb.prototype, 'get');
//         get.withArgs('changelog').rejects({ status: 404 });
//         get.resolves(twigletDocs().rows[3].doc);
//         sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
//       });

//       it('relays the error', () => {
//         sandbox.stub(PouchDb.prototype, 'put').rejects({ status: 420 });
//         return server.inject(req())
//           .then((response) => {
//             expect(response.result.statusCode).to.equal(420);
//           });
//       });
//     });
//   });

//   describe('DELETE', () => {
//     function req () {
//       return {
//         method: 'DELETE',
//         url: '/v2/twiglets/Some%20Twiglet/views/view%20name',
//         credentials: {
//           id: 123,
//           username: 'ben',
//           user: {
//             name: 'Ben Hernandez',
//           },
//         }
//       };
//     }

//     describe('success', () => {
//       let response;
//       beforeEach(function* foo () {
//         const allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
//         allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//         allDocs.onSecondCall().resolves(twigletDocs());
//         allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//         allDocs.onCall(3).resolves(twigletDocs());
//         const get = sandbox.stub(PouchDb.prototype, 'get');
//         get.withArgs('changelog').rejects({ status: 404 });
//         get.resolves(twigletDocs().rows[3].doc);
//         sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
//         sandbox.stub(PouchDb.prototype, 'put').resolves(getViewResults());
//         response = yield server.inject(req());
//       });

//       it('responds with code 204', () => {
//         expect(response.statusCode).to.equal(204);
//       });
//     });

//     describe('errors', () => {
//       let allDocs;
//       beforeEach(() => {
//         allDocs = sandbox.stub(PouchDb.prototype, 'allDocs');
//         allDocs.onFirstCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//         allDocs.onSecondCall().resolves(twigletDocs());
//         allDocs.onThirdCall().resolves({ rows: [{ doc: (twigletInfo()) }] });
//         allDocs.onCall(3).resolves(twigletDocs());
//         const get = sandbox.stub(PouchDb.prototype, 'get');
//         get.withArgs('changelog').rejects({ status: 404 });
//         get.resolves(twigletDocs().rows[3].doc);
//         sandbox.stub(PouchDb.prototype, 'bulkDocs').resolves();
//       });

//       it('relays the error', () => {
//         sandbox.stub(PouchDb.prototype, 'put').rejects({ status: 420 });
//         return server.inject(req())
//           .then((response) => {
//             expect(response.result.statusCode).to.equal(420);
//           });
//       });
//     });
//   });
// });
