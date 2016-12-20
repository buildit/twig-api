const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const url = process.env.URL || 'http://localhost:3000';

const authAgent = chai.request.agent(url);
const anonAgent = chai.request.agent(url);

module.exports = { authAgent, anonAgent, url };
