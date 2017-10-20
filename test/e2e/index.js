'use strict';

/* eslint func-names: 0 */
const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const url = process.env.ENDPOINT_URI || 'http://localhost:3000';
const authAgent = chai.request.agent(url);
const anonAgent = chai.request(url);

before(function* () {
  yield authAgent.post('/v2/login')
    .send({
      email: 'local@user',
      password: 'password',
    });
});

module.exports = { authAgent, anonAgent, url };
