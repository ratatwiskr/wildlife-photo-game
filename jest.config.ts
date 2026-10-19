import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  // The project tsconfig compiles with `module: "nodenext"` and package.json
  // sets `"type": "module"`, so TypeScript emits ESM (and appends `export {};`
  // to files without imports/exports). Jest 29 runs test files in CommonJS
  // mode, so override the module output for the transformer only.
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: { module: "CommonJS", moduleResolution: "Node" } },
    ],
  },
  // run before the test framework and before imports, so modules that read location at import time
  setupFiles: ["<rootDir>/tests/setupTests.ts"],
  // Source files use NodeNext-style `./x.js` specifiers. Now that the
  // transformer emits CommonJS, strip the extension so Jest resolves `./x.ts`.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  moduleFileExtensions: ["ts", "js", "json"],
  roots: ["<rootDir>/tests"],
  verbose: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/main.ts", // browser bootstrap, not unit-testable
    "!src/**/*.d.ts",
  ],
  coverageDirectory: "<rootDir>/coverage",
  // Floors sit just under the current suite so a regression fails CI without
  // making every small change brittle. Raise them as coverage grows.
  coverageThreshold: {
    global: {
      statements: 78,
      branches: 62,
      functions: 74,
      lines: 80,
    },
  },
};

export default config;
