const config = require('../../src/utils/config');

before(() => {
  config.DB_URL = 'foo';
  config.TENANT = '';
});

after(() => {
  config.DB_URL = undefined;
  config.TENANT = undefined;
});
