const Hapi = require('hapi');
const cookieAuth = require('hapi-auth-cookie');
const logger = require('./utils/log')('SERVER');
const routes = require('./routes');

const server = new Hapi.Server();

server.connection({
  port: 3000,
  routes: {
    cors: {
      origin: [
        'http://localhost:*',
        'https://localhost:*',
        'http://twig.*',
        'https://twig.*',
      ],
      credentials: true,
    }
  }
});

server.register(cookieAuth, (err) => {
  if (err) {
    throw err;
  }

  server.auth.strategy('session', 'cookie', 'required', {
    password: 'V@qj65#r6t^wvdq,p{ejrZadGHyununZ',
    isSecure: false
  });
});

server.route(routes);

server.start(err => {
  if (err) {
    throw err;
  }
  logger.log('Server running at:', server.info.uri);
});
