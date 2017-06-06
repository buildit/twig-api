'use strict';
const auth = require('./auth');
const changelog = require('./changelog');
const navSettings = require('./navsettings');
const node = require('./node');
const ping = require('./ping');

module.exports = {
  auth,
  changelog,
  navSettings,
  node,
  ping,
};
