import { QueryEngineBase } from '@comunica/actor-init-query';
import type { ActorInitQueryBase } from '@comunica/actor-init-query';

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires,import/extensions
const engineDefault = require('../engine-default.js');

/**
 * A Comunica SPARQL query engine.
 */
export class QueryEngine extends QueryEngineBase {
  public constructor(engine: ActorInitQueryBase = engineDefault()) {
    super(engine);
  }
}
