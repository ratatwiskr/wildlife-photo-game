const { defineConfig } = require("cypress");
const installLogsPrinter = require("cypress-terminal-report/src/installLogsPrinter");

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8090",
    setupNodeEvents(on, config): void {
      // implement node event listeners here
      installLogsPrinter(on, {
        printLogsToConsole: "always",
        outputRoot: "cypress/results/logs",
        outputTarget: { "cypress-logs.json": "json" },
      });
    },
  },
});
