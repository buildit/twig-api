# Twig API
---

### Description
---
This repo contains the API for the Twig Project.

The API will enable CRUD operations on the DB.

### Getting Started
---

Twig API requires a data store. At this time that is CouchDB. Please install and have it
running prior to using Twig.

To install with brew:
```Shell
brew install couchdb
```

Once CouchDB is installed, it should be running at [http://localhost:5984](http://localhost:5984). If you open
localhost:5984 you should see something along the lines of:
```Shell
{"couchdb": "Welcome",...}
```

After you have installed CouchDB, you can get Twig API started with:

```Shell
npm i
cp .env.example .env
npm start
```

To run tests (unit & e2e respectively)
```Shell
npm test
npm run test:e2e
```

### Releasing
To release a new version just bump the version with
- `npm version [<newversion> | major | minor | patch ]`

This will update package.json, commit the version update, git tag and push to master. The new tag will trigger the deployment build which will run the tests, static code analysis, build and deploy.

### Where is it deployed?
---
In the Buildit Riglet:

http://staging.twig-api.riglet

http://twig-api.riglet

### Coding Standards
---
At the moment, still following the guidelines as found on [confluence](https://digitalrig.atlassian.net/wiki/display/ENG/JavaScript).

### Versioning
---
The api is versioned via path http://example.com/v2/[route], etc

### How to contribute
---
Create a branch, do your stuff, raise a PR

### Team
---

Shahzain Badruddin

Paul Karsten

David Moss

Andy Ochsner

Andrew Urmston

Hap Pearman

Ben Hernandez

Lizzie Szoke

Mike Thomas

### License
---
