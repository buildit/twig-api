'use strict';

const config = require('../../src/config');

before(() => {
  config.config.DB_URL = 'foo';
  config.config.TENANT = '';
});

after(() => {
  config.DB_URL = undefined;
  config.TENANT = undefined;
});
