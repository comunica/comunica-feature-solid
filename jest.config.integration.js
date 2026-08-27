const config = require('./jest.config.js');

module.exports = {
  ...config,
  // Integration tests spawn HTTP servers, so they are not part of the regular test suite.
  testRegex: '/test/integration/.*-test.ts$',
  testPathIgnorePatterns: [ '/node_modules/' ],
  collectCoverage: false,
  coverageThreshold: undefined,
};
