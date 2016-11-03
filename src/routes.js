const Joi = require('joi');
const Auth = require('./auth');
const Ping = require('./ping');
const Changelog = require('./changelog');

module.exports = [
  {
    method: ['GET'], path: '/ping', handler: Ping.ping
  },
  {
    method: ['POST'],
    path: '/twiglets/{id}/changelog',
    handler: Changelog.add,
    config: {
      validate: {
        payload: {
          commitMessage: Joi.string().required(),
        }
      }
    }
  },
  {
    method: ['GET'],
    path: '/twiglets/{id}/changelog',
    handler: Changelog.get,
  },
  {
    method: ['POST'],
    path: '/login',
    handler: Auth.login,
    config: {
      auth: {
        mode: 'try',
        strategy: 'session'
      },
      validate: {
        payload: {
          email: Joi.string().email().required(),
          password: Joi.string().required()
        }
      },
    }
  },
  {
    method: 'POST',
    path: '/logout',
    handler: Auth.logout,
    config: {
      auth: false,
    }
  }
];
