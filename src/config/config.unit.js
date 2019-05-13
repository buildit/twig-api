'use strict';

/* eslint no-unused-expressions: 0 */
const { expect } = require('chai');
const cls = require('continuation-local-storage');
const config = require('../config');

describe.only('config', () => {
  describe('db_url', () => {
    let previousDbUrl;

    beforeEach(() => {
      previousDbUrl = config.DB_URL;
      config.DB_URL = undefined;
      cls.createNamespace('hapi-request');
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

  describe.only('tenant', () => {
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
      delete process.env.TWIG_API_TENANT;
    });

    it('returns tenant if it is set', () => {
      // arrange
      // config.TENANT = 'foo';
      process.env.TWIG_API_TENANT = 'foo';
      // act
      // assert
      const configValue = config.getTenant(process.env.TWIG_API_TENANT);
      console.log('is this something', configValue);
      // expect(config.TENANT).to.equal('foo');
      expect(configValue).to.equal('foo');
    });

    it('returns empty string if set to empty string', () => {
      // arrange
      config.TENANT = '';
      // act
      // assert
      expect(config.TENANT).to.equal('');
    });

    it('returns empty string if hostname is localhost', () => {
      // ns.run(() => {
      //   // arrange
      //   ns.set('host', 'localhost');
      //   console.log('config.TENANT', config)
      //   // act
      //   // assert
      //   expect(config.TENANT).to.equal('');
      // });
      const tenant = config.getTenant('localhost:5984');
      console.log(tenant);
      expect(tenant).to.equal('');
    });

    it('returns empty string if hostname does not contain twig', () => {
      // ns.run(() => {
      //   // arrange
      //   ns.set('host', 'foo');
      //   console.log('config.TENANT', config.TENANT)
      //   // act
      //   // assert
      //   expect(config.TENANT).to.equal('');
      // });
      const tenant = config.getTenant('foo');
      console.log(tenant);
      expect(tenant).to.equal('');
    });

    it('returns empty string if hostname is twig-api.riglet', () => {
      // ns.run(() => {
      //   // arrange
      //   ns.set('host', 'twig-api.riglet');

      //   // act
      //   // assert
      //   expect(config.TENANT).to.equal('');
      // });
      const tenant = config.getTenant('twig-api.riglet');
      console.log(tenant);
      expect(tenant).to.equal('');
    });

    it('returns empty string if hostname is twig-api.buildit.tools', () => {
      // ns.run(() => {
      //   // arrange
      //   ns.set('host', 'twig-api.buildit.tools');

      //   // act
      //   // assert
      //   expect(config.TENANT).to.equal('');
      // });
      const tenant = config.getTenant('twig-api.buildit.tools');
      console.log(tenant);
      expect(tenant).to.equal('');
    });

    it('returns empty string if hostname is twig-api', () => {
      // ns.run(() => {
      //   // arrange
      //   ns.set('host', 'twig-api');

      //   // act
      //   // assert
      //   expect(config.TENANT).to.equal('');
      // });
      const tenant = config.getTenant('twig-api');
      console.log(tenant);
      expect(tenant).to.equal('');
    });

    it('returns staging if hostname is staging.twig-api.riglet', () => {
      // ns.run(() => {
      //   // arrange
      //   ns.set('host', 'staging.twig-api.riglet');

      //   // act
      //   // assert
      //   expect(config.TENANT).to.equal('staging');
      // });
      const tenant = config.getTenant('staging.twig-api.riglet');
      console.log(tenant);
      expect(tenant).to.equal('staging');
    });

    it('returns staging if hostname is staging-twig-api.buildit.tools', () => {
      // ns.run(() => {
      //   // arrange
      //   ns.set('host', 'staging-twig-api.buildit.tools');

      //   // act
      //   // assert
      //   expect(config.TENANT).to.equal('staging');
      // });
      const tenant = config.getTenant('staging-twig-api.buildit.tools');
      console.log(tenant);
      expect(tenant).to.equal('staging');
    });
  });

  describe.only('getTenantDatabase', () => {
    afterEach(() => {
      // config.TENANT = undefined;
      delete process.env.TWIG_API_TENANT;
    });

    it('defaults to dbName on empty tenant', () => {
      // arrange
      // config.TENANT = '';
      process.env.TWIG_API_TENANT = '';
      const req = {
        info: {
          host: 'local',
          protocol: 'http',
          address: '0.0.0.0'
        },
      };

      const contextualConfig = config.getContextualConfig(req);
      // act
      // assert
       expect(contextualConfig.getTenantDatabaseString('foo')).to.contain('/foo');
    });

    it('prefixes tenant to dbName on populated tenant', () => {
      // arrange
      // config.TENANT = 'bar';
      process.env.TWIG_API_TENANT = 'bar';
      const req = {
        info: {
          host: 'local',
          protocol: 'http',
          address: '0.0.0.0'
        },
      };

      const contextualConfig = config.getContextualConfig(req);
      // act
      // assert
      console.log('contextualConfig', contextualConfig.getTenantDatabaseString('foo'));
      expect(contextualConfig.getTenantDatabaseString('foo')).to.contain('/bar_foo');
      // expect(config.getTenantDatabaseString('foo')).to.contain('/bar_foo');
    });
  });
});
