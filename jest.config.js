module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000,
  verbose: true,
  testMatch: ['**/tests/**/*.test.js'],
  // Run tests sequentially (Selenium can't run parallel sessions easily)
  maxWorkers: 1,
};
