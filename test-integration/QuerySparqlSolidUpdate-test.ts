import { QueryEngine } from '../engines/query-sparql-solid/lib/QueryEngine';
import { SolidServerMock } from './SolidServerMock';

/**
 * SPARQL Update tests against a Solid resource server.
 *
 * A Solid server exposes both `Accept-Patch: application/sparql-update` and `Allow: PUT` on its resources,
 * so Comunica has to pick the right one: patching an existing resource, and only using PUT to create a new one.
 * Picking PUT for an existing resource silently replaces all of its contents,
 * which is what https://github.com/comunica/comunica-feature-solid/issues/43 reported.
 */
describe('SPARQL Update against a Solid resource server', () => {
  let server: SolidServerMock;

  beforeAll(async() => {
    server = new SolidServerMock();
    await server.start();
  });

  afterAll(async() => {
    await server.stop();
  });

  it('creates a resource that does not exist yet', async() => {
    const url = `${server.baseUrl}create.ttl`;
    await new QueryEngine().queryVoid(`INSERT DATA { <ex:s> <ex:p1> <ex:o1> . }`, { sources: [ url ]});

    expect(server.getTriples(url)).toEqual([ '<ex:s> <ex:p1> <ex:o1> .' ]);
  });

  it('keeps existing data when inserting into an existing resource', async() => {
    const url = `${server.baseUrl}insert-twice.ttl`;
    // Deliberately reuse a single engine, as the second update reusing state cached by the first
    // is what made it replace the resource instead of patching it.
    const engine = new QueryEngine();
    await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p1> <ex:o1> . <ex:s> <ex:p2> <ex:o2> . }`, { sources: [ url ]});
    await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p3> <ex:o3> . }`, { sources: [ url ]});

    expect(server.getTriples(url)).toEqual([
      '<ex:s> <ex:p1> <ex:o1> .',
      '<ex:s> <ex:p2> <ex:o2> .',
      '<ex:s> <ex:p3> <ex:o3> .',
    ]);
  });

  it('deletes data from a resource that was just created', async() => {
    const url = `${server.baseUrl}insert-delete.ttl`;
    const engine = new QueryEngine();
    await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p1> <ex:o1> . <ex:s> <ex:p2> <ex:o2> . }`, { sources: [ url ]});
    await engine.queryVoid(`DELETE DATA { <ex:s> <ex:p1> <ex:o1> . }`, { sources: [ url ]});

    expect(server.getTriples(url)).toEqual([ '<ex:s> <ex:p2> <ex:o2> .' ]);
  });

  it('deletes data matching a pattern from an existing resource', async() => {
    const url = `${server.baseUrl}delete-where.ttl`;
    await new QueryEngine()
      .queryVoid(`INSERT DATA { <ex:s> <ex:p1> <ex:o1> . <ex:s> <ex:p2> <ex:o2> . }`, { sources: [ url ]});
    await new QueryEngine().queryVoid(`DELETE WHERE { <ex:s> <ex:p1> ?o }`, { sources: [ url ]});

    expect(server.getTriples(url)).toEqual([ '<ex:s> <ex:p2> <ex:o2> .' ]);
  });

  it('queries the data that was inserted before', async() => {
    const url = `${server.baseUrl}insert-query.ttl`;
    const engine = new QueryEngine();
    await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p1> <ex:o1> . }`, { sources: [ url ]});
    await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p2> <ex:o2> . }`, { sources: [ url ]});

    // A new engine is used, as engines cache the sources they dereferenced before
    const quads = await (await new QueryEngine()
      .queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, { sources: [ url ]})).toArray();

    expect(quads.map(quad => `${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`).sort())
      .toEqual([ 'ex:s ex:p1 ex:o1', 'ex:s ex:p2 ex:o2' ]);
  });
});
