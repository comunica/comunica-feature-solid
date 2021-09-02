import { KeysCore, KeysHttp } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { LoggerVoid } from '@comunica/logger-void';
import type { Session } from '@rubensworks/solid-client-authn-isomorphic';
import { ActorHttpInruptSolidClientAuthn } from '../lib/ActorHttpInruptSolidClientAuthn';
import 'cross-fetch/polyfill';

describe('ActorHttpInruptSolidClientAuthn', () => {
  let bus: any;
  let mediatorHttp: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = {
      mediate: jest.fn(args => {
        return { output: 'ABC', headers: new Headers({}) };
      }),
    };
  });

  describe('An ActorHttpInruptSolidClientAuthn instance', () => {
    let sessionNotLoggedIn: Session;
    let sessionLoggedIn: Session;
    let actor: ActorHttpInruptSolidClientAuthn;

    beforeEach(() => {
      actor = new ActorHttpInruptSolidClientAuthn({ name: 'actor', bus, mediatorHttp });
      sessionNotLoggedIn = <any> {
        info: {
          isLoggedIn: false,
        },
      };
      sessionLoggedIn = <any> {
        info: {
          isLoggedIn: true,
          webId: 'WEBID',
        },
        fetch: jest.fn(async() => 'RESPONSE'),
      };
    });

    it('should not test without context', async() => {
      await expect(actor.test({ input: 'DUMMY' })).rejects
        .toThrowError(`Unable to find Solid authn session in context with key '@comunica/actor-http-inrupt-solid-client-authn:session'`);
    });

    it('should not test with empty context', async() => {
      await expect(actor.test({ input: 'DUMMY', context: ActionContext({}) })).rejects
        .toThrowError(`Unable to find Solid authn session in context with key '@comunica/actor-http-inrupt-solid-client-authn:session'`);
    });

    it('should not test with non-logged in session', async() => {
      await expect(actor.test({ input: 'DUMMY',
        context: ActionContext({
          '@comunica/actor-http-inrupt-solid-client-authn:session': sessionNotLoggedIn,
        }) })).rejects
        .toThrowError(`The provided Solid authn session is not in a logged in state, make sure to call session.login() first`);
    });

    it('should not test with a fetch method', async() => {
      await expect(actor.test({ input: 'DUMMY',
        context: ActionContext({
          '@comunica/actor-http-inrupt-solid-client-authn:session': sessionNotLoggedIn,
          [KeysHttp.fetch]: true,
        }) })).rejects
        .toThrowError(`Unable to run when a custom fetch function has been configured`);
    });

    it('should test with logged in session', async() => {
      await expect(actor.test({ input: 'DUMMY',
        context: ActionContext({
          '@comunica/actor-http-inrupt-solid-client-authn:session': sessionLoggedIn,
        }) })).resolves.toBeTruthy();
    });

    it('should run', async() => {
      await actor.run({
        input: 'DUMMY',
        context: ActionContext({
          '@comunica/actor-http-inrupt-solid-client-authn:session': sessionLoggedIn,
        }),
      });
      expect(mediatorHttp.mediate).toHaveBeenCalledWith(
        {
          input: 'DUMMY',
          context: ActionContext({
            [KeysHttp.fetch]: sessionLoggedIn.fetch,
          }),
        },
      );
    });

    it('should run with a logger', async() => {
      const logger = new LoggerVoid();
      const spy = jest.spyOn(logger, 'info');

      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        init: { headers: new Headers({ a: 'b' }) },
        context: ActionContext({
          [KeysCore.log]: logger,
          '@comunica/actor-http-inrupt-solid-client-authn:session': sessionLoggedIn,
        }),
      });
      expect(mediatorHttp.mediate).toHaveBeenCalledWith(
        {
          input: <Request> { url: 'https://www.google.com/' },
          init: { headers: new Headers({ a: 'b' }) },
          context: ActionContext({
            [KeysCore.log]: logger,
            [KeysHttp.fetch]: sessionLoggedIn.fetch,
          }),
        },
      );

      expect(spy).toHaveBeenCalledWith(`Handling request to https://www.google.com/ as authenticated request for WEBID`, {
        actor: 'actor',
      });
    });

    it('should run with a logger without init', async() => {
      const logger = new LoggerVoid();
      const spy = jest.spyOn(logger, 'info');

      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: ActionContext({
          [KeysCore.log]: logger,
          '@comunica/actor-http-inrupt-solid-client-authn:session': sessionLoggedIn,
        }),
      });
      expect(mediatorHttp.mediate).toHaveBeenCalledWith(
        {
          input: <Request> { url: 'https://www.google.com/' },
          context: ActionContext({
            [KeysCore.log]: logger,
            [KeysHttp.fetch]: sessionLoggedIn.fetch,
          }),
        },
      );

      expect(spy).toHaveBeenCalledWith(`Handling request to https://www.google.com/ as authenticated request for WEBID`, {
        actor: 'actor',
      });
    });
  });
});
