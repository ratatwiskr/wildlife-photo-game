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
      expect((win as any).__app).to.exist;
      expect((win as any).__app.scene).to.exist;
      expect((win as any).__app.renderer).to.exist;
    });

    // compute screen coordinates for the first objective object and click it
    cy.window().then((win) => {
      const app = (win as any).__app as any;
      const scene = app.scene as any;
      const renderer = app.renderer as any;
      const canvas = win.document.querySelector(
        '[data-test-id="game-canvas"]'
      ) as HTMLCanvasElement;
      // pick first object for objective
      const obj = scene.definition.objects[0];
      expect(obj).to.exist;

      // convert world coords -> client coords
      const viewport = renderer.viewport as any;
      const relX = (obj.x - viewport.x) / viewport.width;
      const relY = (obj.y - viewport.y) / viewport.height;
      const clientRect = canvas.getBoundingClientRect();
      const clickX = Math.round(clientRect.left + relX * clientRect.width);
      const clickY = Math.round(clientRect.top + relY * clientRect.height);

      // perform a pointer click at computed client coords
      cy.get('[data-test-id="game-canvas"]').click(
        clickX - clientRect.left,
        clickY - clientRect.top,
        { force: true }
      );
    });

    // after clicking, objective progress should show a checkmark for the found item
    cy.get("#objectiveProgress").should("contain.text", "✅");
  });
});
