#!/bin/bash

npm install -g add-cors-to-couchdb
add-cors-to-couchdb $TWIG_API_DB_URL
node ./scripts/init-new-db.js

node src/server.js