# Twig API

Twig API is the API behind [Twig](https://github.com/buildit/twig), a browser-based single-page application using
[D3](https://d3js.org/) to render graph visualisations.

## Table of Contents

* [Getting Started](#getting-started)
    - [CouchDB](#couchdb)
    - [Quick Start](#quick-start)
    - [Documentation](#documentation)
* [Description](#description)
    - [What is Twig?](#what-is-twig)
    - [What is Twig API?](#what-is-twig-api)
* [Where is Twig API Deployed?](#where-is-it-deployed)
* [Development](#development)
    - [Testing](#testing)
    - [Coding Standards](#coding-standards)
    - [CI/CD](#cicd)
    - [How To Contribute](#how-to-contribute)
    - [Releasing](#releasing)
* [Versioning](#versioning)
* [Team](#team)
* [License](#license)

### Getting Started
---
#### CouchDB

Twig API requires a data store. At this time that is [CouchDB](http://couchdb.apache.org/). Please install and have it
running prior to using Twig and Twig API.

To install with brew:
```Shell
brew install couchdb
```

To install/run with Docker:
```bash
docker pull couchdb:1

# expose it to the world on port 5984
docker run -d -p 5984:5984 --name couchdb couchdb:1
```

Once CouchDB is installed, it should be running at [http://localhost:5984](http://localhost:5984). If you open
localhost:5984 you should see something along the lines of:
```Shell
{"couchdb": "Welcome",...}
```

You also need to update the cross origin settings to allow local access.

```Shell
npm install -g add-cors-to-couchdb
add-cors-to-couchdb
```

Then execute the data migration scripts to get started with some organisation models

```Shell
npm install
MODE=local node ./scripts/init-new-db.js
```

#### Quick Start

After you have installed CouchDB, you are ready to get Twig API started. Clone this repository, then run

```Shell
cp .env.example .env
npm start
```

Twig API will run locally at localhost:3000.

To see a list of twiglets, navigate to http://localhost:3000/v2/twiglets.

To see a list of models, navigate to http://localhost:3000/v2/models.

#### Documentation

Twig API is documented using [Swagger](http://swagger.io/). If running Twig API locally, navigate to http://localhost:3000/documentation to view the documentation.

### Description
---
#### What is Twig?

[Twig](https://github.com/buildit/twig) is a network diagramming tool that allows users to create twiglets (force graphs)
that model relationships between nodes and links and create a visual way to explore these relationships.

For a more detailed look at Twig, check out Twig's [GitHub page](https://github.com/buildit/twig) and the very awesome
Twig [demo video](https://youtu.be/q4LWoQUeRjc).

#### What is Twig API?

The API will enable CRUD operations on the Twig database. Users can create, edit, and delete twiglets, models, views on
twiglets, events and event sequences on twiglets, and edit a twiglet's model.

In order to use Twig locally, an instance of Twig API must be up and running.

### Where is it deployed?
---
In the Buildit Riglet:

**Staging Environment**: https://staging-twig-api.buildit.tools - must be connected to Buildit Tools VPN/VPC

**Production Environment**: http://twig-api.buildit.tools

### Development
---
#### Testing

Twig API uses [Mocha](https://mochajs.org/), [Chai](http://chaijs.com/), and [Sinon](http://sinonjs.org/) for testing. Want to make a change? Write a test. Write code until it passes. Make sure you didn't break any other tests.

To run tests (unit & e2e respectively)
```Shell
npm test
npm run test:e2e
```

#### Coding Standards

Twig API uses linting rules as defined in .eslintrc. By default all .js files are linted. These linting rules follow
the guidelines outlined in [Airbnb's JavaScript style guide](https://github.com/airbnb/javascript).

#### CI/CD

Twig API CI/CD assumes the use of [Jenkins](https://jenkins.io/) Pipeline features (as described by the staging and production groovy scripts in the pipelines directory).

##### Opening an issue

If you find a bug, please open an issue [here](https://github.com/buildit/twig-api/issues). Please include the expected
behavior, actual behavior, and detailed steps to reproduce the bug.

#### Releasing

To release a new version just bump the version with
- `npm version [<newversion> | major | minor | patch ]`

This will update package.json, commit the version update, git tag and push to master. The new tag will trigger the deployment build which will run the tests, static code analysis, build and deploy.

### Versioning
---
Twig API is versioned via path http://example.com/v2/[route], etc.

### Team
---
Shahzain Badruddin

Paul Karsten

David Moss

Andy Ochsner ([@aochsner](https://github.com/aochsner))

Andrew Urmston

Hap Pearman ([@spotted-dog](https://github.com/spotted-dog))

Ben Hernandez ([@BenAychh](https://github.com/BenAychh))

Lizzie Szoke ([@lizziesz](https://github.com/lizziesz))

Mike Thomas ([@mathomas](https://github.com/mathomas))

### License
---
See the [LICENSE](LICENSE.md) file for license rights and limitations (Apache 2.0).
