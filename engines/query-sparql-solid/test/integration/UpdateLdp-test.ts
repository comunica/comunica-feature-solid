import type * as RDF from '@rdfjs/types';
import { QueryEngine } from '../../lib/QueryEngine';
import { LdpTestServer } from './utils/LdpTestServer';

const EX = 'http://example.org/';

describe('SPARQL Update over an LDP server', () => {
  let server: LdpTestServer;
  let engine: QueryEngine;
  let resourceCounter = 0;
  let resource: string;

  beforeEach(async() => {
    server = new LdpTestServer();
    await server.start();
    engine = new QueryEngine();
    resource = `${server.baseUrl}test-${resourceCounter++}.ttl`;
  });

  afterEach(async() => {
    await server.stop();
  });

  function methods(): string[] {
    return server.requests.map(request => request.method);
  }

  async function readQuads(url: string): Promise<RDF.Quad[]> {
    return await (await engine.queryQuads(`CONSTRUCT WHERE { ?s ?p ?o }`, { sources: [ url ]})).toArray();
  }

  it('creates a non-existing resource with a PUT request', async() => {
    await engine.queryVoid(`INSERT DATA { <${EX}s1> <${EX}p> <${EX}o1> }`, { sources: [ resource ]});

    expect(methods()).toContain('PUT');
    expect(server.getDocument(resource)).toEqual([ `<${EX}s1> <${EX}p> <${EX}o1> .` ]);
  });

  // Regression test for https://github.com/comunica/comunica-feature-solid/issues/43
  // Inserting into an existing resource must happen via a SPARQL Update PATCH request,
  // as a PUT request would replace all data that is already present in the resource.
  it('inserts into an existing resource with a PATCH request, without removing existing data', async() => {
    await engine.queryVoid(`INSERT DATA { <${EX}s1> <${EX}p> <${EX}o1> }`, { sources: [ resource ]});
    server.requests.length = 0;
    await engine.queryVoid(`INSERT DATA { <${EX}s2> <${EX}p> <${EX}o2> }`, { sources: [ resource ]});

    expect(methods()).toContain('PATCH');
    expect(methods()).not.toContain('PUT');
    expect(server.getDocument(resource)).toEqual([
      `<${EX}s1> <${EX}p> <${EX}o1> .`,
      `<${EX}s2> <${EX}p> <${EX}o2> .`,
    ]);
  });

  // Regression test for https://github.com/comunica/comunica-feature-solid/issues/43#issuecomment-1261748232
  it('deletes from an existing resource with a PATCH request', async() => {
    await engine.queryVoid(
      `INSERT DATA { <${EX}s1> <${EX}p> <${EX}o1>. <${EX}s2> <${EX}p> <${EX}o2> }`,
      { sources: [ resource ]},
    );
    server.requests.length = 0;
    await engine.queryVoid(`DELETE DATA { <${EX}s1> <${EX}p> <${EX}o1> }`, { sources: [ resource ]});

    expect(methods()).toContain('PATCH');
    expect(server.getDocument(resource)).toEqual([ `<${EX}s2> <${EX}p> <${EX}o2> .` ]);
  });

  it('reads a resource that was created by another engine', async() => {
    await new QueryEngine().queryVoid(`INSERT DATA { <${EX}s1> <${EX}p> <${EX}o1> }`, { sources: [ resource ]});

    await expect(readQuads(resource)).resolves.toHaveLength(1);
  });

  it('reads data that was inserted into a pre-existing resource', async() => {
    await new QueryEngine().queryVoid(`INSERT DATA { <${EX}s1> <${EX}p> <${EX}o1> }`, { sources: [ resource ]});

    await expect(readQuads(resource)).resolves.toHaveLength(1);
    await engine.queryVoid(`INSERT DATA { <${EX}s2> <${EX}p> <${EX}o2> }`, { sources: [ resource ]});
    await expect(readQuads(resource)).resolves.toHaveLength(2);
  });

  it('reads a resource that this engine created, after invalidating the HTTP cache', async() => {
    await engine.queryVoid(`INSERT DATA { <${EX}s1> <${EX}p> <${EX}o1> }`, { sources: [ resource ]});
    await engine.invalidateHttpCache();

    await expect(readQuads(resource)).resolves.toHaveLength(1);
  });

  // Known bug: https://github.com/comunica/comunica-feature-solid/issues/43
  // While handling the update, the engine dereferences the destination before it exists.
  // The resulting 404 is stored in the source cache of the engine (QuerySourceHypermedia#sourcesState),
  // which is never invalidated, so the newly created resource stays unreadable within this engine.
  // Once this is fixed upstream, this test should become a regular test.
  it.failing('reads a resource that this engine created', async() => {
    await engine.queryVoid(`INSERT DATA { <${EX}s1> <${EX}p> <${EX}o1> }`, { sources: [ resource ]});

    await expect(readQuads(resource)).resolves.toHaveLength(1);
  });
});
