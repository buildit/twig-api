'use strict';
const config = require('../../src/config');

before(() => {
  config.DB_URL = 'foo';
  config.TENANT = '';
});

after(() => {
  config.DB_URL = undefined;
  config.TENANT = undefined;
});
