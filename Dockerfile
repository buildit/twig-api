FROM node:dubnium
ENV TWIG_API_LOG_CONSOLE=true
ENV TWIG_API_LOG_FILE=true
ENV TWIG_API_LOG_LEVEL=info
ENV TWIG_API_TENANT=
ENV TWIG_API_DB_URL=http://couch.twig.internal:5984

RUN apt-get update -y && apt-get -y upgrade && \
  apt-get add openssl ca-certificates

RUN wget https://github.com/Droplr/aws-env/raw/b215a696d96a5d651cf21a59c27132282d463473/bin/aws-env-linux-amd64 -O /bin/aws-env && \
  chmod +x /bin/aws-env

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
COPY npm-shrinkwrap.json /usr/src/app/
RUN npm install --production

# Bundle app source
COPY src/ /usr/src/app/src/

EXPOSE 3000
CMD eval $(aws-env) && node src/server.js
