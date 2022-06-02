import type { ICliArgsHandler } from '@comunica/types';
import type { Session } from '@rubensworks/solid-client-authn-isomorphic';
import type { Argv } from 'yargs';
const { interactiveLogin } = require('solid-node-interactive-auth');

/**
 * Adds and handles CLI options for Solid authentication.
 */
export class CliArgsHandlerSolidAuth implements ICliArgsHandler {
  public session: Session | undefined;

  public populateYargs(argumentsBuilder: Argv<any>): Argv<any> {
    return argumentsBuilder
      .options({
        identityProvider: {
          alias: 'idp',
          type: 'string',
          describe: 'Solid identity provider to authenticate with (set to \'void\' to disable auth)',
          default: 'https://solidcommunity.net/',
          group: 'Recommended options:',
        },
      });
  }

  public async handleArgs(args: Record<string, any>, context: Record<string, any>): Promise<void> {
    if (args.identityProvider !== 'void') {
      this.session = await interactiveLogin({
        oidcIssuer: args.identityProvider,
      });
      context['@comunica/actor-http-inrupt-solid-client-authn:session'] = this.session;
    }
  }
}
