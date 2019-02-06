#!/bin/bash

npm install -g add-cors-to-couchdb
add-cors-to-couchdb $TWIG_API_DB_URL

# Shell script must manually inject variables into node.js for usage
ENABLE_TEST_USER=$ENABLE_TEST_USER \
    node src/server.js
