FROM node:boron

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install --production
COPY scripts/ /usr/src/app/scripts
COPY handle-couch-cors.sh ./

# Bundle app source
COPY src/ /usr/src/app/src/

EXPOSE 3000
CMD ["./handle-couch-cors.sh"]
