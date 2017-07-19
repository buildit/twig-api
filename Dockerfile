FROM node:6

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY node_modules/ /usr/src/app/node_modules/

# Bundle app source
COPY src/ /usr/src/app/src/

EXPOSE 3000
CMD [ "node", "src/server.js" ]
