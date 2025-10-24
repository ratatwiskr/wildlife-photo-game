import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  // run before the test framework and before imports, so modules that read location at import time
  setupFiles: ["<rootDir>/tests/setupTests.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  roots: ["<rootDir>/tests"],
  verbose: true,
};

export default config;
