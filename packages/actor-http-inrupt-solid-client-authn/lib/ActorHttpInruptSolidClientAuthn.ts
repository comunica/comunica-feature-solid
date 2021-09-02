import type { Readable } from 'stream';
import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IActorArgs, IActorTest } from '@comunica/core';
import type { Session } from '@rubensworks/solid-client-authn-isomorphic';

/**
 * A comunica Inrupt Solid Client Authn Http Actor.
 */
export class ActorHttpInruptSolidClientAuthn extends ActorHttp {
  public static readonly CONTEXT_KEY_SESSION = '@comunica/actor-http-inrupt-solid-client-authn:session';

  public constructor(args: IActorArgs<IActionHttp, IActorTest, IActorHttpOutput>) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IActorTest> {
    if (!action.context || !action.context.has(ActorHttpInruptSolidClientAuthn.CONTEXT_KEY_SESSION)) {
      throw new Error(`Unable to find Solid authn session in context with key '${ActorHttpInruptSolidClientAuthn.CONTEXT_KEY_SESSION}'`);
    }
    const session: Session = action.context.get(ActorHttpInruptSolidClientAuthn.CONTEXT_KEY_SESSION);
    if (!session.info.isLoggedIn) {
      throw new Error(`The provided Solid authn session is not in a logged in state, make sure to call session.login() first`);
    }
    return true;
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const session: Session = action.context!.get(ActorHttpInruptSolidClientAuthn.CONTEXT_KEY_SESSION);

    // Log request
    this.logInfo(action.context, `Requesting ${typeof action.input === 'string' ?
      action.input :
      action.input.url}`, () => ({
      headers: action.init ? ActorHttp.headersToHash(new Headers(action.init.headers)) : undefined,
      method: action.init?.method || 'GET',
      webId: session.info.webId,
    }));

    const response = await session.fetch(action.input, action.init);

    // Node-fetch does not support body.cancel, while it is mandatory according to the fetch and readablestream api.
    // If it doesn't exist, we monkey-patch it.
    if (response.body && !response.body.cancel) {
      response.body.cancel = async(error?: Error) => (<Readable> <any> response.body).destroy(error);
    }

    return response;
  }
}
