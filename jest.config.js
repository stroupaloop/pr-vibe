export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: [
    '**/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    'lib/**/*.js',
    'bin/**/*.js'
  ]
};