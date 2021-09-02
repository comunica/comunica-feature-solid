import { KeysCore } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { LoggerVoid } from '@comunica/logger-void';
import type { Session } from '@rubensworks/solid-client-authn-isomorphic';
import { ActorHttpInruptSolidClientAuthn } from '../lib/ActorHttpInruptSolidClientAuthn';
import 'cross-fetch/polyfill';

describe('ActorHttpInruptSolidClientAuthn', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorHttpInruptSolidClientAuthn instance', () => {
    let sessionNotLoggedIn: Session;
    let sessionLoggedIn: Session;
    let actor: ActorHttpInruptSolidClientAuthn;

    beforeEach(() => {
      actor = new ActorHttpInruptSolidClientAuthn({ name: 'actor', bus });
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

    it('should test with logged in session', async() => {
      await expect(actor.test({ input: 'DUMMY',
        context: ActionContext({
          '@comunica/actor-http-inrupt-solid-client-authn:session': sessionLoggedIn,
        }) })).resolves.toBeTruthy();
    });

    it('should run', async() => {
      const response = await actor.run({
        input: 'DUMMY',
        context: ActionContext({
          '@comunica/actor-http-inrupt-solid-client-authn:session': sessionLoggedIn,
        }),
      });
      expect(sessionLoggedIn.fetch).toHaveBeenCalledWith('DUMMY', undefined);
      expect(response).toEqual('RESPONSE');
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
      expect(spy).toHaveBeenCalledWith('Requesting https://www.google.com/', {
        actor: 'actor',
        headers: { a: 'b', 'user-agent': (<any> actor).userAgent },
        method: 'GET',
        webId: 'WEBID',
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
      expect(spy).toHaveBeenCalledWith('Requesting https://www.google.com/', {
        actor: 'actor',
        headers: undefined,
        method: 'GET',
        webId: 'WEBID',
      });
    });

    it('should run with a response body without cancel', async() => {
      const body = {
        destroy: jest.fn(),
      };
      sessionLoggedIn.fetch = <any> jest.fn(async() => ({
        body,
      }));
      const response = await actor.run({
        input: 'DUMMY',
        context: ActionContext({
          '@comunica/actor-http-inrupt-solid-client-authn:session': sessionLoggedIn,
        }),
      });
      expect(sessionLoggedIn.fetch).toHaveBeenCalledWith('DUMMY', undefined);
      expect(response.body!.cancel).toBeInstanceOf(Function);

      const error = new Error('fetch client body cancel error');
      await response.body!.cancel(error);
      expect(body.destroy).toHaveBeenCalledWith(error);
    });

    it('should run with a response body with cancel', async() => {
      sessionLoggedIn.fetch = <any> jest.fn(async() => ({
        body: {
          cancel: 'CANCEL',
        },
      }));
      const response = await actor.run({
        input: 'DUMMY',
        context: ActionContext({
          '@comunica/actor-http-inrupt-solid-client-authn:session': sessionLoggedIn,
        }),
      });
      expect(sessionLoggedIn.fetch).toHaveBeenCalledWith('DUMMY', undefined);
      expect(response.body!.cancel).toEqual('CANCEL');
    });
  });
});
