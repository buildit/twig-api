'use strict';
function makeUriSafe (str) {
  return str.split(' ').join('%20');
}

function buildUrl (request) {
  return (path) => makeUriSafe(`${request.headers['x-forwarded-proto'] || request.connection.info.protocol}://` +
      `${request.headers['x-forwarded-host'] || request.info.host}${path}`);
}

module.exports = {
  buildUrl
};
