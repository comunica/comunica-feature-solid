import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * A recorded HTTP request that was handled by the {@link LdpTestServer}.
 */
export interface IRecordedRequest {
  method: string;
  url: string;
  contentType?: string;
  body: string;
}

/**
 * A minimal in-memory LDP server that mimics the relevant HTTP behaviour of the Community Solid Server (v7).
 *
 * The response headers below were recorded from an actual Community Solid Server instance,
 * as they determine which destination type Comunica selects for updates:
 * * `Accept-Patch: application/sparql-update` enables SPARQL Update-based `PATCH` requests.
 * * `Allow: PUT` enables `PUT`-based replacement of a resource, which may only be used for new resources.
 */
export class LdpTestServer {
  public readonly requests: IRecordedRequest[] = [];
  private readonly documents: Map<string, string[]> = new Map();
  private server?: Server;
  private port?: number;

  public get baseUrl(): string {
    return `http://localhost:${this.port}/`;
  }

  public async start(): Promise<void> {
    this.server = createServer((request, response) => {
      this.handle(request, response)
        .catch((error: unknown) => {
          response.writeHead(500);
          response.end(String(error));
        });
    });
    await new Promise<void>((resolve, reject) => {
      this.server!.on('error', reject);
      this.server!.listen(0, 'localhost', resolve);
    });
    this.port = (<AddressInfo> this.server.address()).port;
  }

  public async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server!.close(error => error ? reject(error) : resolve());
    });
  }

  /**
   * The triples that are stored in the given document, as N-Triples lines.
   */
  public getDocument(url: string): string[] | undefined {
    return this.documents.get(url);
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = `http://localhost:${this.port}${request.url}`;
    const body = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      request.on('data', chunk => chunks.push(chunk));
      request.on('error', reject);
      request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    this.requests.push({
      method: request.method!,
      url,
      contentType: request.headers['content-type'],
      body,
    });

    const document = this.documents.get(url);
    switch (request.method) {
      case 'HEAD':
      case 'GET':
        if (document) {
          response.writeHead(200, {
            'content-type': 'application/n-triples',
            'accept-patch': 'text/n3, application/sparql-update',
            'accept-put': '*/*',
            allow: 'OPTIONS, HEAD, GET, PATCH, PUT, DELETE',
          });
          response.end(request.method === 'HEAD' ? undefined : `${document.join('\n')}\n`);
        } else {
          response.writeHead(404, {
            'content-type': 'application/n-triples',
            'accept-patch': 'text/n3, application/sparql-update',
            'accept-put': '*/*',
            allow: 'PATCH, PUT',
          });
          response.end();
        }
        break;
      case 'PUT':
        this.documents.set(url, parseTriples(body));
        response.writeHead(document ? 205 : 201);
        response.end();
        break;
      case 'PATCH':
        if (request.headers['content-type'] !== 'application/sparql-update') {
          response.writeHead(415);
          response.end();
          break;
        }
        this.documents.set(url, applySparqlUpdate(document ?? [], body));
        response.writeHead(205);
        response.end();
        break;
      default:
        response.writeHead(405);
        response.end();
    }
  }
}

/**
 * Split a string of N-Triples into its separate triples.
 */
function parseTriples(data: string): string[] {
  return data
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Apply the `INSERT DATA` and `DELETE DATA` operations of a SPARQL Update query to the given triples.
 * This only supports the simple queries that Comunica sends to LDP destinations.
 */
function applySparqlUpdate(triples: string[], query: string): string[] {
  let updated = [ ...triples ];
  const regex = /(INSERT|DELETE) DATA \{(?<data>[^}]*)\}/gu;
  let match = regex.exec(query);
  if (!match) {
    throw new Error(`Unable to apply SPARQL Update query: ${query}`);
  }
  while (match) {
    const data = parseTriples(match.groups!.data);
    updated = match[1] === 'INSERT' ?
        [ ...updated, ...data.filter(triple => !updated.includes(triple)) ] :
      updated.filter(triple => !data.includes(triple));
    match = regex.exec(query);
  }
  return updated;
}
