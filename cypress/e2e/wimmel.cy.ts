import installLogsCollector from "cypress-terminal-report/src/installLogsCollector";
import { appOf, requireApp } from "../support/appGlobals";

installLogsCollector();

describe("Wimmelbild flow", () => {
  beforeEach(() => {
    cy.visit("/?scene=wimmelbild_jungle_adventure");
  });

  it("loads wimmelbild UI and allows direct click-to-find", () => {
    cy.get('[data-test-id="game-canvas"]').should("be.visible");

    // shutter should be hidden in wimmelbild mode
    cy.get('[data-test-id="shutter-button"]').should("not.be.visible");

    // viewfinder should be hidden
    cy.get(".viewfinder").should("not.be.visible");

    // wait until app exposes runtime handles
    cy.window().should((win) => {
      const app = appOf(win);
      expect(app).to.exist;
      expect(app?.scene).to.exist;
      expect(app?.renderer).to.exist;
    });

    // compute screen coordinates for the first objective object and click it
    cy.window().then((win) => {
      const { scene, renderer } = requireApp(win);
      const canvas = win.document.querySelector(
        '[data-test-id="game-canvas"]',
      ) as HTMLCanvasElement;
      // pick first object for objective
      const obj = scene.definition.objects[0];
      expect(obj).to.exist;

      // Reposition viewport to center on the target
      const viewport = renderer.viewport;
      viewport.x = Math.max(0, Math.min(
        obj.x - viewport.width / 2,
        scene.image.width - viewport.width,
      ));
      viewport.y = Math.max(0, Math.min(
        obj.y - viewport.height / 2,
        scene.image.height - viewport.height,
      ));

      // convert world coords -> client coords
      const relX = (obj.x - viewport.x) / viewport.width;
      const relY = (obj.y - viewport.y) / viewport.height;
      const clientRect = canvas.getBoundingClientRect();
      const clickX = Math.round(clientRect.left + relX * clientRect.width);
      const clickY = Math.round(clientRect.top + relY * clientRect.height);

      // perform a pointer click at computed client coords
      cy.get('[data-test-id="game-canvas"]').click(
        clickX - clientRect.left,
        clickY - clientRect.top,
        { force: true },
      );
    });

    // after clicking, objective progress should show a checkmark for the found item
    cy.get("#objectiveProgress").should("contain.text", "✅");
  });
});
