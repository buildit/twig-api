'use strict';
/* eslint no-unused-expressions: 0 */
const PouchDB = require('pouchdb');
const CouchDB = require('./couchdb');
const chai = require('chai');
const sinon = require('sinon');
chai.use(require('chai-string'));

const expect = chai.expect;

describe('couchdb DAO', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('assigns a pouchdb object to this.db', () => {
      const cdb = new CouchDB('some_db');
      expect(cdb.db).to.be.an.instanceof(PouchDB);
    });

    it('defaults to creating the database if it does not exist', () => {
      const cdb = new CouchDB('some_db');
      expect(cdb.db.__opts.skip_setup).to.be.false;
    });

    it('passing in true creates the database if it does not exist', () => {
      const cdb = new CouchDB('some_db', true);
      expect(cdb.db.__opts.skip_setup).to.be.false;
    });

    it('does not create the database if false is passed in to createIfNotExists', () => {
      const cdb = new CouchDB('some_db', false);
      expect(cdb.db.__opts.skip_setup).to.be.true;
    });
  });

  describe('get', () => {
    let cdb;

    beforeEach(() => {
      cdb = new CouchDB('some_db', true);
      sandbox.stub(cdb.db, 'allDocs');
      sandbox.stub(cdb.db, 'get');
    });

    it('returns all of the docs with data if nothing is passed in', () => {
      cdb.get();
      expect(cdb.db.allDocs.getCall(0).args).to.deep.equal([{ include_docs: true }]);
    });

    it('returns a subset of all of the docs with data if an array is passed in', () => {
      cdb.get(['doc1', 'doc2', 'doc3']);
      expect(cdb.db.allDocs.getCall(0).args).to.deep.equal([{
        include_docs: true,
        keys: ['doc1', 'doc2', 'doc3'],
      }]);
    });

    it('returns a single document if a string is passed in', () => {
      cdb.get('doc1');
      expect(cdb.db.get.getCall(0).args).to.deep.equal(['doc1']);
    });
  });

  describe('post', () => {
    let cdb;

    beforeEach(() => {
      cdb = new CouchDB('some_db', true);
      sandbox.stub(cdb.db, 'post');
    });

    it('calls post when posting a new document', () => {
      cdb.post({ some: 'payload' });
      expect(cdb.db.post.getCall(0).args).to.deep.equal([{ some: 'payload' }]);
    });
  });

  describe('put', () => {
    let cdb;

    beforeEach(() => {
      cdb = new CouchDB('some_db');
      sandbox.stub(cdb.db, 'bulkDocs');
      sandbox.stub(cdb.db, 'put');
    });

    it('uses bulkDocs if an array of docs are passed in', () => {
      cdb.put([
        { _id: 'some doc1', data: 'some data' },
        { _id: 'some doc2', data: 'some other data' }
      ]);
      expect(cdb.db.bulkDocs.getCall(0).args).to.deep.equal([[
        { _id: 'some doc1', data: 'some data' },
        { _id: 'some doc2', data: 'some other data' }
      ]]);
    });

    it('uses put if there is a single doc', () => {
      cdb.put({ _id: 'some doc1', data: 'some data' });
      expect(cdb.db.put.getCall(0).args).to.deep.equal([
        { _id: 'some doc1', data: 'some data' },
      ]);
    });
  });

  describe('remove', () => {
    let cdb;

    beforeEach(() => {
      cdb = new CouchDB('some_db');
      sandbox.stub(cdb.db, 'remove');
    });

    it('calls remove with the correct information', () => {
      cdb.remove({ _id: 'some id', _rev: 'some revision number' });
      expect(cdb.db.remove.getCall(0).args).to.deep.equal(['some id', 'some revision number']);
    });
  });

  describe('destroy', () => {
    let cdb;

    beforeEach(() => {
      cdb = new CouchDB('some_db');
      sandbox.stub(cdb.db, 'destroy');
    });

    it('calls remove with the correct information', () => {
      cdb.destroy();
      expect(cdb.db.destroy.callCount).to.equal(1);
    });
  });
});
