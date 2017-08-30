FROM node:boron

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
