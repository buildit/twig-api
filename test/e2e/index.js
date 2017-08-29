'use strict';

/* eslint func-names: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const url = process.env.URL || 'http://localhost:3000';
const authAgent = chai.request.agent(url);
const anonAgent = chai.request(url);

before(function* () {
  yield authAgent.post('/login')
    .send({
      email: 'twigtest@corp.riglet.io',
      password: '978f9YYX2n&b',
    });
});

module.exports = { authAgent, anonAgent, url };
