const newEngine = require('../').newEngine;
const LoggerPretty = require('@comunica/logger-pretty').LoggerPretty;
const ActionContext = require('@comunica/core').ActionContext;
const Factory = require('sparqlalgebrajs').Factory;
const DF = new (require('rdf-data-factory').DataFactory)();
const ContentPolicy = require('@comunica/actor-rdf-metadata-extract-traverse-content-policies').ContentPolicy;
const myEngine = newEngine();
const factory = new Factory();

// QUERY: Retrieve names of all friends
const queryFriends = `SELECT DISTINCT ?name WHERE {
    <https://www.rubensworks.net/#me> <http://xmlns.com/foaf/0.1/knows> ?p.
    ?p <http://xmlns.com/foaf/0.1/name> ?name.
}
`;
// QUERY: Retrieve names of all common friends between Ruben V and Ruben T
const queryCommon = `SELECT DISTINCT * WHERE {
    <https://www.rubensworks.net/#me> <http://xmlns.com/foaf/0.1/knows> ?p.
    <https://ruben.verborgh.org/profile/#me> <http://xmlns.com/foaf/0.1/knows> ?p.
    ?p <http://xmlns.com/foaf/0.1/name> ?name.
}
`;

// TODO: Make an SLC parser
// Content Policy: Only follow links from Ruben T's friends
/*
  Equivalent to SLC:
    FOLLOW ?friend {
      <https://www.rubensworks.net/#me> foaf:knows ?friend.
    }
 */
const contentPolicyFollowFriends = new ContentPolicy(
    factory.createBgp([
        factory.createPattern(
            DF.namedNode('https://www.rubensworks.net/#me'),
            DF.namedNode('http://xmlns.com/foaf/0.1/knows'),
            DF.variable('friend'),
        ),
    ]),
    [{ name: 'friend', withPolicies: true }],
    factory.createConstruct(
        factory.createBgp([
            factory.createPattern(
                DF.variable('friend'),
                DF.namedNode('http://xmlns.com/foaf/0.1/name'),
                DF.variable('name'),
            ),
        ]),
        [
            factory.createPattern(
                DF.variable('friend'),
                DF.namedNode('http://xmlns.com/foaf/0.1/name'),
                DF.variable('name'),
            ),
        ]
    )
);
// Content Policy: Find additional contents in primary topic page
/*
  Equivalent to SLC:
    FOLLOW ?destination {
      <> foaf:primaryTopic ?destination.
    }
 */
const contentPolicyPrimaryTopic = new ContentPolicy(
    factory.createBgp([
        factory.createPattern(
            DF.variable('source'), // This currently has too many matches; we need to set doc's baseIRI in parser
            DF.namedNode('http://xmlns.com/foaf/0.1/primaryTopic'),
            DF.variable('destination'),
        ),
    ]),
    [{ name: 'destination', withPolicies: false }],
);

// Make a logger that only prints HTTP requests
const logger = new LoggerPretty({
    level: 'debug',
    actors: {
        'https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-init-sparql/^1.0.0/config/sets/http.json#myHttpFetcher': true,
    },
});
const logOld = logger.log;
let httpRequests = 0;
logger.log = (level, message, data) => {
    //logOld.call(logger, level, message, data);
    if (data.actor === 'https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-init-sparql/^1.0.0/config/sets/http.json#myHttpFetcher') {
        httpRequests++;
    }
}

// Invoke query execution
(async function() {
    console.time('EXECUTION TIME');
    const result = await myEngine.query(queryFriends, {
        sources: [
            {
                value: 'https://www.rubensworks.net/', // 'https://www.rubensworks.net/blog/'
                context: ActionContext({ contentPolicies: [ contentPolicyFollowFriends ] }),
            },
        ],
        lenient: true, // Ignore errors from invalid RDF documents
        log: logger,
    });
    result.bindingsStream.on('error', (error) => console.error(error));
    let results = 0;
    result.bindingsStream.on('data', (d) => {
        //console.log(d.get('?name').value);
        results++;
    });
    result.bindingsStream.on('end', () => {
        console.timeEnd('EXECUTION TIME');
        console.log('RESULTS: ' + results); // TODO
        console.log('HTTP REQUESTS: ' + httpRequests); // TODO
    });
})();
