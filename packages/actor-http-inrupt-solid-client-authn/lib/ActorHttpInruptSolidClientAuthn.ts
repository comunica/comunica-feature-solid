import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import type { IActorArgs, IActorTest, Mediator } from '@comunica/core';
import { failTest, passTestVoid, ActionContextKey } from '@comunica/core';
import type { TestResult } from '@comunica/core/lib/TestResult';
import type { Session } from '@rubensworks/solid-client-authn-isomorphic';

/**
 * A comunica Inrupt Solid Client Authn Http Actor.
 */
export class ActorHttpInruptSolidClientAuthn extends ActorHttp {
  public static readonly CONTEXT_KEY_SESSION =
    new ActionContextKey<Session>('@comunica/actor-http-inrupt-solid-client-authn:session');

  public readonly mediatorHttp: Mediator<ActorHttp, IActionHttp, IActorTest, IActorHttpOutput>;

  public constructor(args: IActorHttpInruptSolidClientAuthnArgs) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<TestResult<IActorTest>> {
    if (!action.context || !action.context.has(ActorHttpInruptSolidClientAuthn.CONTEXT_KEY_SESSION)) {
      return failTest(`Unable to find Solid authn session in context with key '${ActorHttpInruptSolidClientAuthn.CONTEXT_KEY_SESSION.name}'`);
    }
    if (action.context.has(KeysHttp.fetch)) {
      return failTest(`Unable to run when a custom fetch function has been configured`);
    }
    const session: Session = action.context.get(ActorHttpInruptSolidClientAuthn.CONTEXT_KEY_SESSION)!;
    if (!session.info.isLoggedIn) {
      return failTest(`The provided Solid authn session is not in a logged in state, make sure to call session.login() first`);
    }
    return passTestVoid();
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const session: Session = action.context.get(ActorHttpInruptSolidClientAuthn.CONTEXT_KEY_SESSION)!;
    // Log request
    this.logInfo(action.context, `Handling request to ${typeof action.input === 'string' ?
      action.input :
      action.input.url} as authenticated request for ${session.info.webId}`);

    // Override fetch function in context
    return this.mediatorHttp.mediate({
      ...action,
      context: action.context
        .delete(ActorHttpInruptSolidClientAuthn.CONTEXT_KEY_SESSION)
        .set(KeysHttp.fetch, session.fetch),
    });
  }
}

export interface IActorHttpInruptSolidClientAuthnArgs extends IActorArgs<IActionHttp, IActorTest, IActorHttpOutput> {
  mediatorHttp: Mediator<ActorHttp, IActionHttp, IActorTest, IActorHttpOutput>;
}
