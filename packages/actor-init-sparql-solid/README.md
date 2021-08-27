# Comunica SPARQL Solid Init Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-sparql-solid.svg)](https://www.npmjs.com/package/@comunica/actor-init-sparql-solid)
[![Docker Pulls](https://img.shields.io/docker/pulls/comunica/actor-init-sparql-solid.svg)](https://hub.docker.com/r/comunica/actor-init-sparql-solid/)

Comunica SPARQL Solid is a SPARQL query engine for JavaScript that can query over [Solid](https://solidproject.org/) data pods.

**Warning: this project is still under development**

This module is part of the [Comunica framework](https://comunica.dev/).
[Click here to learn more about Comunica and Solid](https://comunica.dev/docs/query/advanced/solid/).

## Install

```bash
$ yarn add @comunica/actor-init-sparql-solid
```

or

```bash
$ npm install -g @comunica/actor-init-sparql-solid
```

## Usage

Show 100 triples from a private resource
by authenticating through the https://solidcommunity.net/ identity provider:

```bash
$ comunica-sparql-solid --idp https://solidcommunity.net/ \
  http://example.org/private-resource.ttl \
  "SELECT * WHERE {
       ?s ?p ?o
   } LIMIT 100" --lenient
```

This command will connect with the given identity provider,
and open your browser to log in with your WebID.
After logging in, the query engine will be able to access all the documents you have access to.

Show the help with all options:

```bash
$ comunica-sparql-solid --help
```

Just like [Comunica SPARQL](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql),
a [dynamic variant](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql#usage-from-the-command-line) (`comunica-dynamic-sparql-solid`) also exists.

_[**Read more** about querying from the command line](https://comunica.dev/docs/query/getting_started/query_cli/)._

### Usage within application

This engine can be used in JavaScript/TypeScript applications as follows:

```javascript
const newEngine = require('@comunica/actor-init-sparql-solid').newEngine;
const { interactiveLogin } = require('solid-node-interactive-auth');

const session = await interactiveLogin({ oidcIssuer: 'https://solidcommunity.net/' });
const myEngine = newEngine();

const result = await myEngine.query(`
  SELECT * WHERE {
      ?s ?p ?o
  } LIMIT 100`, {
  sources: [session.info.webId],
  '@comunica/actor-http-inrupt-solid-client-authn:session': session,
});

// Consume results as a stream (best performance)
result.bindingsStream.on('data', (binding) => {
    console.log(binding.get('?s').value);
    console.log(binding.get('?s').termType);

    console.log(binding.get('?p').value);

    console.log(binding.get('?o').value);
});

// Consume results as an array (easier)
const bindings = await result.bindings();
console.log(bindings[0].get('?s').value);
console.log(bindings[0].get('?s').termType);
```

_[**Read more** about querying an application](https://comunica.dev/docs/query/getting_started/query_app/)._

### Usage as a SPARQL endpoint

Start a webservice exposing a private resource via the SPARQL protocol, i.e., a _SPARQL endpoint_,
by authenticating through the https://solidcommunity.net/ identity provider.

```bash
$ comunica-sparql-solid-http --idp https://solidcommunity.net/ \
  http://example.org/private-resource.ttl \
  --lenient
```

Show the help with all options:

```bash
$ comunica-sparql-solid-http --help
```

The SPARQL endpoint can only be started dynamically.
An alternative config file can be passed via the `COMUNICA_CONFIG` environment variable.

Use `bin/http.js` when running in the Comunica monorepo development environment.

_[**Read more** about setting up a SPARQL endpoint](https://comunica.dev/docs/query/getting_started/setup_endpoint/)._
