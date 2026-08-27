const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  testRegex: '/test-integration/.*-test.ts$',
  // Integration tests boot a full Solid server, so they are slow and irrelevant for coverage
  collectCoverage: false,
  coverageThreshold: undefined,
  testTimeout: 120000,
};
