'use strict';
const Models = require('./');
const sinon = require('sinon');
const PouchDB = require('pouchdb');
const expect = require('chai').expect;
const { pick } = require('ramda');

describe('DOA - Models', () => {
  let sandbox;
  let models;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    models = new Models();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getOne', () => {
    beforeEach(() => {
      sandbox.stub(PouchDB.prototype, 'allDocs').resolves({
        rows: [
          { doc: { data: { name: 'model1', entities: [{ some: 'entities' }] } } },
          { doc: { data: { name: 'model2', entities: [{ someOther: 'entities' }] } } },
        ]
      });
    });

    it('returns the correct model', () =>
      models.getOne('model1').then(model =>
        expect(model).to.deep
          .equal({ data: { name: 'model1', entities: [{ some: 'entities' }], } })));

    it('throws a 404 error if there is no matching model', () =>
      models.getOne('model3')
      .then(() => expect('this never').to.be('called'))
      .catch(error => expect(error.status).to.equal(404))
    );
  });

  describe('getAll', () => {
    beforeEach(() => {
      sandbox.stub(PouchDB.prototype, 'allDocs').resolves({
        rows: [
          { doc: { data: { name: 'model1', entities: [{ some: 'entities' }] } } },
          { doc: { data: { name: 'model2', entities: [{ someOther: 'entities' }] } } },
        ]
      });
    });

    it('returns an array of models', () =>
      models.getAll()
      .then(allModels => expect(allModels).to.deep.equal([
        { data: { name: 'model1', entities: [{ some: 'entities' }] } },
        { data: { name: 'model2', entities: [{ someOther: 'entities' }] } },
      ]))
    );
  });

  describe('create', () => {
    function newModel () {
      return {
        name: 'newModel',
        entities: [{ some: 'entities' }],
        commitMessage: 'initial creation!',
      };
    }

    describe('(Success)', () => {
      let post;

      beforeEach(() => {
        const error404 = new Error('Not Found');
        error404.status = 404;
        sandbox.stub(models, 'getOne').rejects(error404);
        post = sandbox.stub(PouchDB.prototype, 'post').resolves('success');
      });

      it('posts the model if the model does not exist', () => {
        models.create(newModel(), 'Test')
        .then((result) => expect(result).to.equal('success'));
      });

      it('posts the correct entities', () =>
        models.create(newModel(), 'Test')
        .then(() =>
          expect(post.getCall(0).args[0].data.entities).to.deep.equal([{ some: 'entities' }])));

      it('posts the correct changelog', () =>
        models.create(newModel(), 'Test')
        .then(() =>
          expect(pick(['message', 'user'], post.getCall(0).args[0].data.changelog[0]))
          .to.deep.equal({
            message: 'initial creation!',
            user: 'Test',
          })));
    });

    describe('(Failure)', () => {
      it('fails if the name is already being used', () => {
        sandbox.stub(models, 'getOne').resolves({ some: 'model' });
        models.create(newModel())
        .then(() => expect('this never').to.be('called'))
        .catch((error) => expect(error.status).to.equal(409));
      });

      it('posts the model if the model does not exist', () => {
        const error418 = new Error('Teapots');
        error418.status = 418;
        sandbox.stub(models, 'getOne').rejects(error418);
        models.create(newModel())
        .then(() => expect('this never').to.be('called'))
        .catch((error) => expect(error.status).to.equal(418));
      });
    });
  });

  describe('clone', () => {
    function cloneModel () {
      return {
        name: 'cloneModel',
        cloneModel: 'model1',
        entities: [{ some: 'entities' }],
        commitMessage: 'cloned!!',
      };
    }

    describe('(Success)', () => {
      let post;

      beforeEach(() => {
        const error404 = new Error('Not Found');
        error404.status = 404;
        const getOne = sandbox.stub(models, 'getOne');
        getOne.withArgs('cloneModel').rejects(error404);
        getOne.withArgs('model1').resolves({ data: { entities: [{ an: 'entity' }] } });
        post = sandbox.stub(PouchDB.prototype, 'post').resolves('success');
      });

      it('posts the model if the model does not exist', () => {
        models.clone(cloneModel(), 'Test')
        .then((result) => expect(result).to.equal('success'));
      });

      it('posts the correct entities', () =>
        models.clone(cloneModel(), 'Test')
        .then(() =>
          expect(post.getCall(0).args[0].data.entities).to.deep.equal([{ an: 'entity' }])));

      it('posts the correct changelog', () =>
        models.clone(cloneModel(), 'Test')
        .then(() =>
          expect(pick(['message', 'user'], post.getCall(0).args[0].data.changelog[0]))
          .to.deep.equal({
            message: 'cloned!!',
            user: 'Test',
          })));
    });

    describe('(Failure)', () => {
      it('fails if the name is already being used', () => {
        sandbox.stub(models, 'getOne').resolves({ some: 'model' });
        models.clone(cloneModel())
        .then(() => expect('this never').to.be('called'))
        .catch((error) => expect(error.status).to.equal(409));
      });

      it('posts the model if the model does not exist', () => {
        const error418 = new Error('Teapots');
        error418.status = 418;
        sandbox.stub(models, 'getOne').rejects(error418);
        models.clone(cloneModel())
        .then(() => expect('this never').to.be('called'))
        .catch((error) => expect(error.status).to.equal(418));
      });
    });
  });

  describe('update', () => {
    let put;

    function updates (doReplacement) {
      return {
        name: 'updatedModel',
        _rev: 'some rev',
        entities: [{ new: 'entities' }],
        commitMessage: 'update this model!',
        doReplacement,
      };
    }

    describe('(Success)', () => {
      beforeEach(() => {
        sandbox.stub(models, 'getOne').resolves({
          _id: 'some id',
          _rev: 'some rev',
          data: {
            name: 'old name',
            entities: [{ old: 'entities' }],
            changelog: [
              { message: 'firstLog', user: 'some user', timestamp: 'some date' }
            ]
          }
        });
        put = sandbox.stub(PouchDB.prototype, 'put').resolves('success');
      });

      it('calls put', () =>
        models.update(updates(false), 'old name', 'Test User')
        .then(() =>
          expect(put.callCount).to.equal(1)));

      it('puts the correct entitites', () =>
        models.update(updates(false), 'old name', 'Test User')
        .then(() =>
          expect(put.getCall(0).args[0].data.entities).to.deep.equal([{ new: 'entities' }])));

      it('updates the name correctly', () =>
        models.update(updates(false), 'old name', 'Test User')
        .then(() =>
          expect(put.getCall(0).args[0].data.name).to.equal('updatedModel')));

      it('updates the changelog correctly', () =>
        models.update(updates(false), 'old name', 'Test User')
        .then(() =>
          expect(pick(['message', 'user'], put.getCall(0).args[0].data.changelog[0]))
            .to.deep.equal({ message: 'update this model!', user: 'Test User' })));

      it('updates the changelog correctly with a replacement message', () =>
        models.update(updates(true), 'old name', 'Test User')
        .then(() =>
          expect(pick(['message', 'user'], put.getCall(0).args[0].data.changelog[1]))
            .to.deep.equal({ message: '--- previous change overwritten ---', user: 'Test User' })));

      it('returns any message from the db', () =>
        models.update(updates(true), 'old name', 'Test User')
        .then((message) =>
          expect(message).to.equal('success')));
    });

    describe('(Failure)', () => {
      beforeEach(() => {
        sandbox.stub(models, 'getOne').resolves({
          _id: 'some id',
          _rev: 'non-matching rev',
          data: {
            name: 'old name',
            entities: [{ old: 'entities' }],
            changelog: [
              { message: 'firstLog', user: 'some user', timestamp: 'some date' }
            ]
          }
        });
        put = sandbox.stub(PouchDB.prototype, 'put').resolves('success');
      });

      describe('bad _rev', () => {
        it('calls put', () =>
          models.update(updates(false), 'old name', 'Test User')
          .then(() => expect('this never').to.be('called'))
          .catch(() => expect(put.callCount).to.equal(0)));

        it('returns the correct _rev number', () =>
          models.update(updates(false), 'old name', 'Test User')
          .then(() => expect('this never').to.be('called'))
          .catch((error) => expect(error.model._rev).to.equal('non-matching rev')));

        it('returns a 409 (conflict) error', () =>
          models.update(updates(false), 'old name', 'Test User')
          .then(() => expect('this never').to.be('called'))
          .catch((error) => expect(error.status).to.equal(409)));
      });
    });
  });

  describe('delete', () => {
    let remove;
    beforeEach(() => {
      sandbox.stub(models, 'getOne').resolves({
        _id: 'some id',
        _rev: 'some _rev'
      });
      remove = sandbox.stub(PouchDB.prototype, 'remove').resolves('success');
    });

    it('calls remove', () => {
      models.delete({ name: 'some name' })
      .then(() => expect(remove.callCount).to.equal(1));
    });

    it('uses the correct information', () => {
      models.delete({ name: 'some name' })
      .then(() => expect(remove.getCall(0).args).to.deep.equal(['some id', 'some _rev']));
    });
  });
});
