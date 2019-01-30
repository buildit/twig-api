FROM node:boron
ENV TWIG_API_LOG_CONSOLE=true
ENV TWIG_API_LOG_FILE=true
ENV TWIG_API_LOG_LEVEL=info
ENV TWIG_API_TENANT=
ENV TWIG_API_DB_URL=http://couch.twig.internal:5984

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
COPY npm-shrinkwrap.json /usr/src/app/
RUN npm install --production

# Bundle app source
COPY src/ /usr/src/app/src/

EXPOSE 3000
CMD [ "node", "src/server.js" ]
