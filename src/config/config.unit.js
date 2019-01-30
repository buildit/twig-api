'use strict';

/* eslint no-unused-expressions: 0 */
const expect = require('chai').expect;
const cls = require('continuation-local-storage');
const config = require('../config');

describe('config', () => {
  describe('db_url', () => {
    let previousDbUrl;

    beforeEach(() => {
      previousDbUrl = config.DB_URL;
      config.DB_URL = undefined;
    });

    afterEach(() => {
      config.DB_URL = previousDbUrl;
      cls.destroyNamespace('hapi-request');
    });

    it('returns db_url if it is set', () => {
      // arrange
      config.DB_URL = 'foo';

      // act
      // assert
      expect(config.DB_URL).to.equal('foo');
    });
  });

  describe('tenant', () => {
    let ns;
    let previousTenant;
    beforeEach(() => {
      ns = cls.createNamespace('hapi-request');
      previousTenant = config.TENANT;
      config.TENANT = undefined;
    });

    afterEach(() => {
      config.TENANT = previousTenant;
      cls.destroyNamespace('hapi-request');
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

    it('returns empty string if hostname does not contain twig', () => {
      ns.run(() => {
        // arrange
        ns.set('host', 'foo');

        // act
        // assert
        expect(config.TENANT).to.equal('');
      });
    });

    it('returns empty string if hostname is twig-api.riglet', () => {
      ns.run(() => {
        // arrange
        ns.set('host', 'twig-api.riglet');

        // act
        // assert
        expect(config.TENANT).to.equal('');
      });
    });

    it('returns empty string if hostname is twig-api.buildit.tools', () => {
      ns.run(() => {
        // arrange
        ns.set('host', 'twig-api.buildit.tools');

        // act
        // assert
        expect(config.TENANT).to.equal('');
      });
    });

    it('returns empty string if hostname is twig-api', () => {
      ns.run(() => {
        // arrange
        ns.set('host', 'twig-api');

        // act
        // assert
        expect(config.TENANT).to.equal('');
      });
    });

    it('returns staging if hostname is staging.twig-api.riglet', () => {
      ns.run(() => {
        // arrange
        ns.set('host', 'staging.twig-api.riglet');

        // act
        // assert
        expect(config.TENANT).to.equal('staging');
      });
    });

    it('returns staging if hostname is staging-twig-api.buildit.tools', () => {
      ns.run(() => {
        // arrange
        ns.set('host', 'staging-twig-api.buildit.tools');

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
