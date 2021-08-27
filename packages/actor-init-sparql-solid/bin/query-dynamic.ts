#!/usr/bin/env node
import { ActionContext } from '@comunica/core';
import { runArgsInProcess } from '@comunica/runner-cli';
import { CliArgsHandlerSolidAuth } from '../lib/CliArgsHandlerSolidAuth';
const cliArgsHandlerSolidAuth = new CliArgsHandlerSolidAuth();
runArgsInProcess(`${__dirname}/../`, `${__dirname}/../config/config-default.json`, {
  context: ActionContext({
    '@comunica/actor-init-sparql:cliArgsHandlers': [ cliArgsHandlerSolidAuth ],
  }),
  onDone() {
    if (cliArgsHandlerSolidAuth.session) {
      cliArgsHandlerSolidAuth.session.logout()
        // eslint-disable-next-line no-console
        .catch(error => console.log(error));
    }
  },
});
