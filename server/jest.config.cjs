/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest with ESM support (matches your NodeNext TypeScript setup)
  preset: 'ts-jest/presets/default-esm',

  testEnvironment: 'node',

  // Where tests live
  roots: ['<rootDir>/src'],
  testMatch: ['**/tests/**/*.test.ts'],

  // Treat .ts as ESM modules
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Allow TS source files that import with ".js" (NodeNext style) to work in Jest
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Compile TS on the fly in ESM mode
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.json' }],
  },

  // Optional: quieter output
  // verbose: false,
}
