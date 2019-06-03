'use strict';

/* eslint no-unused-expressions: 0 */
const { expect } = require('chai');
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
    });

    it('returns db_url if it is set', () => {
      config.DB_URL = 'foo';

      expect(config.DB_URL).to.equal('foo');
    });
  });

  describe('tenant', () => {
    afterEach(() => {
      delete process.env.TWIG_API_TENANT;
    });

    it('returns tenant if it is set', () => {
      process.env.TWIG_API_TENANT = 'foo';

      const req = {
        info: {
          host: 'local',
          protocol: 'http',
          address: '0.0.0.0',
        },
      };
      const contextualConfig = config.getContextualConfig(req);
      expect(contextualConfig.TENANT).to.equal('foo');
    });

    it('returns empty string if set to empty string', () => {
      process.env.TWIG_API_TENANT = '';

      const req = {
        info: {
          host: 'local',
          protocol: 'http',
          address: '0.0.0.0',
        },
      };
      const contextualConfig = config.getContextualConfig(req);
      expect(contextualConfig.TENANT).to.equal('');
    });

    it('returns empty string if hostname is localhost', () => {
      const req = {
        info: {
          host: 'localhost',
          protocol: 'http',
          address: '0.0.0.0',
        },
      };
      const contextualConfig = config.getContextualConfig(req);
      expect(contextualConfig.TENANT).to.equal('');
    });

    it('returns empty string if hostname does not contain twig', () => {
      const req = {
        info: {
          host: 'foo',
          protocol: 'http',
          address: '0.0.0.0',
        },
      };
      const contextualConfig = config.getContextualConfig(req);
      expect(contextualConfig.TENANT).to.equal('');
    });

    it('returns empty string if hostname is twig-api.riglet', () => {
      const req = {
        info: {
          host: 'twig-api.riglet',
          protocol: 'http',
          address: '0.0.0.0',
        },
      };
      const contextualConfig = config.getContextualConfig(req);
      expect(contextualConfig.TENANT).to.equal('');
    });

    it('returns empty string if hostname is twig-api.buildit.tools', () => {
      const req = {
        info: {
          host: 'twig-api.buildit.tools',
          protocol: 'http',
          address: '0.0.0.0',
        },
      };
      const contextualConfig = config.getContextualConfig(req);
      expect(contextualConfig.TENANT).to.equal('');
    });

    it('returns empty string if hostname is twig-api', () => {
      const req = {
        info: {
          host: 'twig-api',
          protocol: 'http',
          address: '0.0.0.0',
        },
      };
      const contextualConfig = config.getContextualConfig(req);
      expect(contextualConfig.TENANT).to.equal('');
    });

    it('returns staging if hostname is staging.twig-api.riglet', () => {
      const req = {
        info: {
          host: 'staging.twig-api.riglet',
          protocol: 'http',
          address: '0.0.0.0',
        },
      };
      const contextualConfig = config.getContextualConfig(req);
      expect(contextualConfig.TENANT).to.equal('staging');
    });

    it('returns staging if hostname is staging-twig-api.buildit.tools', () => {
      const req = {
        info: {
          host: 'staging-twig-api.buildit.tools',
          protocol: 'http',
          address: '0.0.0.0',
        },
      };
      const contextualConfig = config.getContextualConfig(req);
      expect(contextualConfig.TENANT).to.equal('staging');
    });
  });

  describe('getTenantDatabase', () => {
    afterEach(() => {
      delete process.env.TWIG_API_TENANT;
    });

    it('defaults to dbName on empty tenant', () => {
      process.env.TWIG_API_TENANT = '';

      const req = {
        info: {
          host: 'local',
          protocol: 'http',
          address: '0.0.0.0',
        },
      };
      const contextualConfig = config.getContextualConfig(req);
      expect(contextualConfig.getTenantDatabaseString('foo')).to.contain('/foo');
    });

    it('prefixes tenant to dbName on populated tenant', () => {
      process.env.TWIG_API_TENANT = 'bar';

      const req = {
        info: {
          host: 'local',
          protocol: 'http',
          address: '0.0.0.0',
        },
      };
      const contextualConfig = config.getContextualConfig(req);
      expect(contextualConfig.getTenantDatabaseString('foo')).to.contain('/bar_foo');
    });
  });
});
