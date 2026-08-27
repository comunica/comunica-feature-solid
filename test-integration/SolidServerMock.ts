import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';

/**
 * The headers that a Solid server exposes on RDF resources.
 * These are the values that the Community Solid Server (7.2.0) sends,
 * and they are what Comunica uses to decide how a resource must be updated:
 * `Accept-Patch` enables SPARQL Update patching, while `Allow: PUT` only enables full replacement.
 */
const ACCEPT_PATCH = 'text/n3, application/sparql-update';
const ACCEPT_PUT = '*/*';

/**
 * Extract the contents of the `INSERT DATA`/`DELETE DATA` block of the given type from a SPARQL Update string.
 */
function extractDataBlock(query: string, type: 'INSERT' | 'DELETE'): string | undefined {
  const start = query.indexOf(`${type} DATA {`);
  if (start < 0) {
    return;
  }
  const open = query.indexOf('{', start);
  const close = query.indexOf('}', open);
  return query.slice(open + 1, close);
}

/**
 * Split an N-Triples document into its triples, as normalized strings.
 */
function parseTriples(data: string): string[] {
  return data
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
}

/**
 * A minimal read-write Solid resource server, only intended for testing SPARQL Update against Solid pods.
 *
 * It handles resources as flat sets of N-Triples strings, which is sufficient here,
 * because Comunica sends N-Triples-based payloads in both its PUT and PATCH requests.
 */
export class SolidServerMock {
  private readonly resources = new Map<string, string[]>();
  private server?: Server;
  private port = 0;

  public get baseUrl(): string {
    return `http://localhost:${this.port}/`;
  }

  /**
   * The triples of the given resource, or undefined if the resource does not exist.
   */
  public getTriples(url: string): string[] | undefined {
    return this.resources.get(new URL(url).pathname)?.slice().sort();
  }

  public async start(): Promise<void> {
    this.server = createServer((request, response) => {
      this.handle(request, response).catch(() => {
        response.writeHead(500).end();
      });
    });
    await new Promise<void>((resolve) => {
      this.server!.listen(0, 'localhost', resolve);
    });
    this.port = (<{ port: number }> this.server.address()).port;
  }

  public async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server!.close(error => error ? reject(error) : resolve());
    });
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const path = new URL(request.url!, 'http://localhost').pathname;
    const triples = this.resources.get(path);
    const headers: Record<string, string> = {
      'accept-patch': ACCEPT_PATCH,
      'accept-put': ACCEPT_PUT,
      allow: triples ? 'OPTIONS, HEAD, GET, PATCH, PUT, DELETE' : 'PATCH, PUT',
    };

    switch (request.method) {
      case 'HEAD':
      case 'GET':
        if (!triples) {
          response.writeHead(404, { ...headers, 'content-type': 'text/turtle' }).end();
          return;
        }
        response.writeHead(200, { ...headers, 'content-type': 'application/n-triples' })
          .end(`${triples.join('\n')}\n`);
        return;
      case 'PUT':
        this.resources.set(path, parseTriples(await SolidServerMock.readBody(request)));
        response.writeHead(triples ? 205 : 201, headers).end();
        return;
      case 'PATCH': {
        if (request.headers['content-type'] !== 'application/sparql-update') {
          response.writeHead(415, headers).end();
          return;
        }
        const query = await SolidServerMock.readBody(request);
        const deleted = extractDataBlock(query, 'DELETE');
        const inserted = extractDataBlock(query, 'INSERT');
        const updated = new Set(triples ?? []);
        for (const triple of deleted ? parseTriples(deleted) : []) {
          updated.delete(triple);
        }
        for (const triple of inserted ? parseTriples(inserted) : []) {
          updated.add(triple);
        }
        this.resources.set(path, [ ...updated ]);
        response.writeHead(205, headers).end();
        return;
      }
      case 'DELETE':
        this.resources.delete(path);
        response.writeHead(205, headers).end();
        return;
      default:
        response.writeHead(405, headers).end();
    }
  }

  private static async readBody(request: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(<Buffer> chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
}
