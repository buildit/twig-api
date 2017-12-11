#!/bin/bash

set -e -x

npm install -g add-cors-to-couchdb
add-cors-to-couchdb $TWIG_API_DB_URL

# This is not setting the environmental variable correctly
node ./scripts/init-new-db.js

node src/server.js