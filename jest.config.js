const path = require('path');
const ts = require('typescript');
const { pathsToModuleNameMapper } = require('ts-jest');

const tsconfigPath = path.join(__dirname, 'tsconfig.json');
const { config } = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

// Align Jest resolution with tsconfig paths (Jest resolves before ts-jest transform).
// Exclude `react` → @types/react — tests must resolve the real `react` package.
const tsPaths = { ...(config.compilerOptions?.paths || {}) };
delete tsPaths.react;
const fromTsconfigPaths = pathsToModuleNameMapper(tsPaths, {
  prefix: '<rootDir>/',
});

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  setupFiles: ['dotenv/config'],
  preset: 'ts-jest',
  // Something in the suite leaves a handle open. With one worker, as on a 2-core machine, Jest would
  // otherwise finish every test and then wait forever.
  forceExit: true,
  testEnvironment: 'jsdom', //initial was testEnvironment: 'node', using jsdom
  rootDir: '.',
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    // sanitize-html's parser only ships as ES modules.
    'sanitize-html/node_modules/.+\\.js$': [
      'babel-jest',
      { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] },
    ],
  },
  transformIgnorePatterns: [
    '^(?!.*/node_modules/sanitize-html/node_modules/).*/node_modules/',
  ],
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    ...fromTsconfigPaths,
    '^axios$': 'axios/dist/node/axios.cjs',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  modulePaths: ['<rootDir>'],
  collectCoverageFrom: ['<rootDir>/**/*.{ts, tsx}'],
  collectCoverage: false,
  modulePathIgnorePatterns: [
    '<rootDir>/src/__tests__/utils-for-testing/',
    '<rootDir>/vendor/',
    'mocks',
    'othercases',
  ],
  //until here
  //working configuration until here E2E/utils/actions tests.

  //added new config for background section
  setupFilesAfterEnv: ['./jest.setup.js'], //only for jest-chrome
  //end added
};
