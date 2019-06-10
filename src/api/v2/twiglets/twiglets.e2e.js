/* eslint func-names: 0 */
/* eslint no-unused-expressions: 0 */

'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSubset = require('chai-subset');
const R = require('ramda');
const {
  authAgent, anonAgent, url, addWait,
} = require('../../../../test/e2e');
const { createModel, deleteModel, baseModel } = require('../models/models.e2e.js');

const { expect } = chai;
chai.use(chaiHttp);
chai.use(chaiSubset);

function createTwiglet (twiglet) {
  return addWait(authAgent.post('/v2/twiglets').send(twiglet));
}

function updateTwiglet (name, twiglet) {
  return addWait(authAgent.put(`/v2/twiglets/${name}`).send(twiglet));
}

function patchTwiglet (name, twiglet) {
  return authAgent.patch(`/v2/twiglets/${name}`).send(twiglet);
}

function getTwiglet ({ name }) {
  return anonAgent.get(`/v2/twiglets/${name}`);
}

async function getEntireTwiglet ({ name }) {
  const response = await getTwiglet({ name });
  const [model, changelog, views] = await Promise.all([
    anonAgent.get(`/v2/twiglets/${name}/model`),
    anonAgent.get(`/v2/twiglets/${name}/changelog`),
    anonAgent.get(`/v2/twiglets/${name}/views`),
  ]);
  response.body.model = model.body;
  response.body.changelog = changelog.body.changelog;
  response.body.views = views.body.views;
  return response.body;
}

function getTwiglets () {
  return anonAgent.get('/v2/twiglets');
}

function deleteTwiglet ({ name }) {
  return addWait(authAgent.delete(`/v2/twiglets/${name}`));
}

function baseTwiglet () {
  return {
    name: 'test-c44e6001-1abd-483f-a8ab-bf807da7e455',
    description: 'foo bar baz',
    model: baseModel().name,
    commitMessage: 'fee fie fo fum',
  };
}

describe('twiglets', () => {
  describe('POST /v2/twiglets', () => {
    describe('(Successful)', () => {
      let res;

      before(async () => {
        // act
        await createModel(baseModel());
        res = await createTwiglet(baseTwiglet());
      });

      it('returns 201', () => {
        expect(res).to.have.status(201);
      });

      it('has Location header', () => {
        expect(res).to.have.header('Location', `${url}/v2/twiglets/${baseTwiglet().name}`);
      });

      it('has an entity response', () => {
        expect(res.body).to.contain.all.keys({
          name: baseTwiglet().name,
          url: `${url}/twiglets/${baseTwiglet().name}`,
        });
        expect(res.body).to.contain.all.keys(['_rev']);
      });

      it('returns a conflict error if the twiglet already exists', () => {
        createTwiglet(baseTwiglet())
          .catch((secondResponse) => {
            expect(secondResponse).to.have.status(409);
          });
      });

      after(async () => {
        await deleteModel(baseModel());
        await deleteTwiglet(baseTwiglet());
      });
    });

    describe('(Clone)', () => {
      let res;

      function cloneTwiglet () {
        return {
          cloneTwiglet: baseTwiglet().name,
          commitMessage: 'cloned from BaseTwiglet',
          description: 'This was cloned',
          model: 'does not matter',
          name: 'clone',
        };
      }

      before(async () => {
        await createModel(baseModel());
        const updates = baseTwiglet();
        delete updates.model;
        updates._rev = (await createTwiglet(baseTwiglet())).body._rev;
        updates.nodes = [
          {
            id: 'node1',
            name: 'node 1',
            type: 'ent1',
          },
          {
            id: 'node2',
            name: 'node 2',
            type: 'ent2',
          },
        ];
        updates.links = [
          {
            id: 'link1',
            source: 'node1',
            target: 'node2',
          },
          {
            id: 'link2',
            source: 'node2',
            target: 'node1',
          },
        ];
        res = await updateTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
        res = await createTwiglet(cloneTwiglet());
        res = await getEntireTwiglet(cloneTwiglet());
      });

      after(async () => {
        await deleteModel(baseModel());
        await deleteTwiglet(cloneTwiglet());
        await deleteTwiglet(baseTwiglet());
      });

      it('correctly clones the nodes', () => {
        expect(res.nodes).to.deep.equal([
          {
            id: 'node1',
            name: 'node 1',
            type: 'ent1',
          },
          {
            id: 'node2',
            name: 'node 2',
            type: 'ent2',
          },
        ]);
      });

      it('correctly clones the links', () => {
        expect(res.links).to.deep.equal([
          {
            id: 'link1',
            source: 'node1',
            target: 'node2',
          },
          {
            id: 'link2',
            source: 'node2',
            target: 'node1',
          },
        ]);
      });

      it('correctly clones the model', () => {
        expect(res.model.entities).to.deep.equal(baseModel().entities);
      });

      it('does not clone the name or description', () => {
        expect(res.name).to.equal('clone');
        expect(res.description).to.equal('This was cloned');
      });
    });

    describe('(From JSON)', () => {
      let res;

      function jsonRepresentationOfTwiglet () {
        return {
          model: {
            entities: {
              ent1: {
                class: 'some class',
                image: 'a',
                type: 'ent1',
                attributes: [],
              },
              ent2: {
                class: 'second class',
                image: 'b',
                type: 'ent2',
                attributes: [],
              },
            },
          },
          nodes: [
            {
              id: 'node1',
              name: 'node 1',
              type: 'ent1',
            },
            {
              id: 'node2',
              name: 'node 2',
              type: 'ent2',
            },
          ],
          links: [
            {
              id: 'link1',
              source: 'node1',
              target: 'node2',
            },
            {
              id: 'link2',
              source: 'node2',
              target: 'node1',
            },
          ],
          views: [{
            links: {},
            name: 'some view',
            nodes: {},
            userState: {
              autoConnectivity: 'some string',
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
              scale: 10,
              showLinkLabels: true,
              showNodeLabels: true,
              treeMode: true,
              traverseDepth: 3,
            },
          }],
        };
      }

      function jsonTwiglet () {
        return {
          cloneTwiglet: '',
          commitMessage: 'cloned from BaseTwiglet',
          description: 'This was cloned',
          model: 'does not matter',
          name: 'json',
          json: JSON.stringify(jsonRepresentationOfTwiglet()),
        };
      }

      describe('success', () => {
        before(async () => {
          res = await createTwiglet(jsonTwiglet());
          res = await getEntireTwiglet(jsonTwiglet());
        });

        after(async () => {
          await deleteTwiglet(jsonTwiglet());
        });

        it('correctly processes the nodes', () => {
          expect(res.nodes).to.deep.equal(jsonRepresentationOfTwiglet().nodes);
        });

        it('correctly processes the links', () => {
          expect(res.links).to.deep.equal(jsonRepresentationOfTwiglet().links);
        });

        it('correctly processes the model', () => {
          expect(res.model.entities).to.deep.equal(jsonRepresentationOfTwiglet().model.entities);
        });

        it('correctly processes the views ', () => {
          expect(res.view).to.deep.equal(jsonRepresentationOfTwiglet().view);
        });
      });

      describe('errors', () => {
        after(async () => {
          await deleteTwiglet(jsonTwiglet());
        });

        it('errors if the node.type is not in the entities', async () => {
          const illegalTwiglet = jsonRepresentationOfTwiglet();
          illegalTwiglet.nodes[1].type = 'ent3';
          const jsonRequest = jsonTwiglet();
          jsonRequest.json = JSON.stringify(illegalTwiglet);
          res = await createTwiglet(jsonRequest);
          expect(res).to.have.status(400);
          expect(res.error.text.includes('node2')).to.equal(true);
        });
      });
    });

    describe('(Error)', () => {
      before(async () => {
        // act
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
      });

      after(async () => {
        await deleteModel(baseModel());
        await deleteTwiglet(baseTwiglet());
      });

      it('errors if the name is already being used', async () => {
        const res = await createTwiglet(baseTwiglet());
        expect(res).to.have.status(409);
      });
    });
  });

  describe('GET /v2/twiglets', () => {
    describe('(Successful)', () => {
      let res;
      let createdTwiglet;

      before(async () => {
        await createModel(baseModel());
        res = await createTwiglet(baseTwiglet());
        createdTwiglet = res.body;
        res = await getTwiglets();
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('returns a list of twiglets', () => {
        const foundTwiglet = res.body.find(({ name }) => name === baseTwiglet().name);
        expect(foundTwiglet).to.containSubset(
          R.omit(['links', 'nodes', '_rev', 'latestCommit'], createdTwiglet),
        );
      });

      after(async () => {
        await deleteModel(baseModel());
        await deleteTwiglet(baseTwiglet());
      });
    });
  });

  describe('GET /v2/twiglets/{name}', () => {
    describe('(Successful)', () => {
      let res;

      before(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        res = await getTwiglet(baseTwiglet());
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('contains the twiglet', () => {
        expect(res.body).to.containSubset(R.merge(
          R.omit(['model', 'commitMessage'], baseTwiglet()),
          {
            nodes: [],
            links: [],
            latestCommit: {
              message: 'fee fie fo fum',
              user: 'local@user.com',
            },
          },
        ));
        expect(res.body).to.include.keys('_rev', 'url', 'model_url', 'changelog_url', 'views_url');
      });

      after(async () => {
        await deleteModel(baseModel());
        await deleteTwiglet(baseTwiglet());
      });
    });

    // describe('(Error)', () => {
    //   let promise;

    //   before(() => {
    //     promise = getTwiglet({ name: 'non-existant-name' });
    //   });

    //   it('returns 404', (done) => {
    //     promise.then((res) => {
    //       expect(res).to.have.status(404);
    //       done();
    //     });
    //   });
    // });
  });

  describe('PUT /v2/twiglets/{name}', () => {
    describe('(Successful)', () => {
      let res;
      let updates;

      before(async () => {
        await createModel(baseModel());
        updates = baseTwiglet();
        delete updates.model;
        updates._rev = (await createTwiglet(baseTwiglet())).body._rev;
        updates.name = 'a different name';
        updates.description = 'a different description';
        updates.nodes = [
          {
            id: 'node1',
            name: 'node 1',
            type: 'ent1',
          },
          {
            id: 'node2',
            name: 'node 2',
            type: 'ent2',
          },
        ];
        updates.links = [
          {
            id: 'link1',
            source: 'node1',
            target: 'node2',
          },
          {
            id: 'link2',
            source: 'node2',
            target: 'node1',
          },
        ];
        updates.commitMessage = 'this was totally updated!';
        res = await updateTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
      });

      it('returns 200', () => {
        expect(res).to.have.status(200);
      });

      it('contains the twiglet', () => {
        expect(res.body).to.containSubset(R.omit(['_rev', 'commitMessage'], updates));
        expect(res.body).to.include.keys('_rev', 'url', 'model_url', 'changelog_url',
          'views_url', 'latestCommit');
      });

      after(async () => {
        await deleteModel(baseModel());
        await deleteTwiglet({ name: 'a different name' });
      });
    });

    describe('(Error)', () => {
      let updates;
      beforeEach(async () => {
        updates = baseTwiglet();
        delete updates.model;
        updates._rev = 'whatever:whatever:whatever';
        updates.name = 'a different name';
        updates.description = 'a different description';
        updates.nodes = [
          {
            id: 'node 1',
            name: 'node 1',
            type: 'ent1',
          },
          {
            id: 'node 2',
            name: 'node 2',
            type: 'ent2',
          },
        ];
        updates.links = [
          {
            id: 'link 1',
            source: 'node 1',
            target: 'node 2',
          },
          {
            id: 'link 2',
            source: 'node 2',
            target: 'node 1',
          },
        ];
        updates.commitMessage = 'this was totally updated!';
        await createModel(baseModel());
      });

      afterEach(async () => {
        await deleteModel(baseModel());
        try {
          await deleteTwiglet(baseTwiglet());
        }
        catch (error) {
          if (error.status !== 404) {
            throw error;
          }
        }
      });

      it('returns 404', async () => {
        const res = await updateTwiglet({ name: 'non-existant-name' }, updates);
        expect(res).to.have.status(404);
      });

      it('fails if the node.type is not in the entities', async () => {
        updates._rev = (await createTwiglet(baseTwiglet())).body._rev;
        updates.nodes[1].type = 'ent3';
        updates.commitMessage = 'invalid nodes';
        const res = await updateTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
        expect(res).to.have.status(400);
        expect(res.error.text.includes('node 2')).to.equal(true);
      });
    });
  });

  describe('PATCH /v2/twiglets/{name}', () => {
    describe('(Successful)', () => {
      let res;
      let updates;

      beforeEach(async () => {
        await createModel(baseModel());
        updates = baseTwiglet();
        delete updates.model;
        updates._rev = (await createTwiglet(baseTwiglet())).body._rev;
        updates.name = 'a different name';
        updates.description = 'a different description';
        updates.nodes = [
          {
            id: 'node1',
            name: 'node 1',
            type: 'ent1',
          },
          {
            id: 'node2',
            name: 'node 2',
            type: 'ent2',
          },
        ];
        updates.links = [
          {
            id: 'link1',
            source: 'node1',
            target: 'node2',
          },
          {
            id: 'link2',
            source: 'node2',
            target: 'node1',
          },
        ];
        updates.commitMessage = 'this was totally updated!';
      });

      it('returns 200', async () => {
        res = await patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
        expect(res).to.have.status(200);
      });

      it('contains the twiglet', async () => {
        res = await patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
        expect(res.body).to.containSubset(R.omit(['_rev', 'commitMessage'], updates));
        expect(res.body).to.include.keys('_rev', 'url', 'model_url', 'changelog_url',
          'views_url', 'latestCommit');
      });

      it('can update only the name', async () => {
        delete updates.description;
        delete updates.nodes;
        delete updates.links;
        res = await patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
        expect(res.body.name).to.equal('a different name');
      });

      it('can update only the description', async () => {
        delete updates.description;
        delete updates.nodes;
        delete updates.links;
        res = await patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
        expect(res.body.description).to.equal('foo bar baz');
      });

      it('can update only the nodes', async () => {
        delete updates.description;
        delete updates.name;
        delete updates.links;
        res = await patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
        expect(res.body.nodes.length).to.equal(2);
      });

      it('can update only the links', async () => {
        delete updates.description;
        delete updates.name;
        delete updates.nodes;
        res = await patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
        expect(res.body.links.length).to.equal(2);
      });

      afterEach(async () => {
        await deleteModel(baseModel());
        await deleteTwiglet({ name: res.body.name });
      });
    });

    describe('(Error)', () => {
      let updates;
      beforeEach(async () => {
        updates = baseTwiglet();
        delete updates.model;
        updates._rev = 'whatever:whatever:whatever';
        updates.name = 'a different name';
        updates.description = 'a different description';
        updates.nodes = [
          {
            id: 'node 1',
            name: 'node 1',
            type: 'ent1',
          },
          {
            id: 'node 2',
            name: 'node 2',
            type: 'ent2',
          },
        ];
        updates.links = [
          {
            id: 'link 1',
            source: 'node 1',
            target: 'node 2',
          },
          {
            id: 'link 2',
            source: 'node 2',
            target: 'node 1',
          },
        ];
        updates.commitMessage = 'this was totally updated!';
        await createModel(baseModel());
      });

      afterEach(async () => {
        await deleteModel(baseModel());
        await deleteTwiglet(baseTwiglet());
      });

      it('returns 404', async () => {
        const res = await patchTwiglet({ name: 'non-existant-name' }, updates);
        expect(res).to.have.status(404);
      });

      it('fails if the node.type is not in the entities', async () => {
        updates._rev = (await createTwiglet(baseTwiglet())).body._rev;
        delete updates.description;
        delete updates.name;
        delete updates.links;
        updates.nodes[1].type = 'ent3';
        updates.commitMessage = 'invalid nodes';
        const res = await patchTwiglet('test-c44e6001-1abd-483f-a8ab-bf807da7e455', updates);
        expect(res).to.have.status(400);
        expect(res.error.text.includes('node 2')).to.equal(true);
      });
    });
  });

  describe('DELETE /v2/twiglets/{name}', () => {
    describe('(Successful)', () => {
      let res;

      before(async () => {
        await createModel(baseModel());
        await createTwiglet(baseTwiglet());
        await deleteModel(baseModel());
        res = await deleteTwiglet(baseTwiglet());
      });

      it('returns 204', () => {
        expect(res).to.have.status(204);
      });

      // it('GET twiglet returns 404', async () => {
      //   res = await getTwiglet({ name: baseTwiglet().name });
      //   expect(res).to.have.status(404);
      // });

      it('not included in the list of twiglets', async () => {
        const twiglets = await getTwiglets();
        expect(twiglets.body).to.not.deep.contains(baseTwiglet());
      });

      it('returns 404 when twiglet doesnt exist', async () => {
        res = await deleteTwiglet(baseTwiglet());
        expect(res).to.have.status(404);
      });
    });
  });
});


module.exports = {
  createTwiglet, deleteTwiglet, getTwiglet, baseTwiglet,
};
