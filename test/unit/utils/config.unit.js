/* eslint no-unused-expressions: 0 */
const expect = require('chai').expect;
const cls = require('continuation-local-storage');
const config = require('../../../src/utils/config');

describe('config', () => {
  describe('tenant', () => {
    let ns;
    beforeEach(() => {
      ns = cls.createNamespace('hapi-request');
    });
    afterEach(() => {
      config.TENANT = undefined;
    });

    it('returns tenant if it is set', () => {
      // arrange
      config.TENANT = 'foo';

      // act
      // assert
      expect(config.TENANT).to.equal('foo');
    });

    it('returns empty string if set to empty string', () => {
      // arrange
      config.TENANT = '';
      // act
      // assert
      expect(config.TENANT).to.equal('');
    });

    it('returns empty string if hostname is localhost', () => {
      ns.run(() => {
      // arrange
        ns.set('host', 'localhost');

      // act
      // assert
        expect(config.TENANT).to.equal('');
      });
    });

    it('returns empty string if hostname is twig.riglet', () => {
      ns.run(() => {
      // arrange
        ns.set('host', 'twig.riglet');

      // act
      // assert
        expect(config.TENANT).to.equal('');
      });
    });

    it('returns empty string if hostname is twig', () => {
      ns.run(() => {
      // arrange
        ns.set('host', 'twig');

      // act
      // assert
        expect(config.TENANT).to.equal('');
      });
    });

    it('returns staging if hostname is twig.staging.riglet', () => {
      ns.run(() => {
      // arrange
        ns.set('host', 'twig.staging.riglet');

      // act
      // assert
        expect(config.TENANT).to.equal('staging');
      });
    });
  });

  describe('getTenantDatabase', () => {
    afterEach(() => {
      config.TENANT = undefined;
    });

    it('defaults to dbName on empty tenant', () => {
      // arrange
      config.TENANT = '';
      // act
      // assert
      expect(config.getTenantDatabaseString('foo')).to.contain('/foo');
    });

    it('prefixes tenant to dbName on populated tenant', () => {
      // arrange
      config.TENANT = 'bar';
      // act
      // assert
      expect(config.getTenantDatabaseString('foo')).to.contain('/bar_foo');
    });
  });
});
