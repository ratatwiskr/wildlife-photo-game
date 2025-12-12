describe("Smoketests", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should load the scene and display key elements", () => {
    cy.get('[data-test-id="game-canvas"]').should("be.visible");
    cy.get('[data-test-id="shutter-button"]').should("be.visible");
  });

  it("should switch scene", () => {
    cy.wait(500);
    cy.get('[data-test-id="back-to-scene-selection-button"]').click();

    cy.wait(500);
    cy.get('[data-test-id="game-canvas"]').should("not.be.visible");
    cy.get('[data-test-id="shutter-button"]').should("not.be.visible");

    cy.get(".scene-grid .scene-card").should("have.length.gte", 2);

    cy.get(".scene-grid .scene-card:first").click();

    cy.url().should("include", "scene=dev");

    cy.wait(500);
    cy.get('[data-test-id="game-canvas"]').should("be.visible");
    cy.get('[data-test-id="shutter-button"]').should("be.visible");
  });

  it("full photo flow: navigate, capture and win (jungle_adventure)", () => {
    // load the specific scene directly via query param
    cy.visit("/?scene=jungle_adventure");
    cy.get('[data-test-id="game-canvas"]').should("be.visible");
    cy.get('[data-test-id="shutter-button"]').should("be.visible");

    // perform several stylus-like drags to pan across the scene
    const canvas = cy.get('[data-test-id="game-canvas"]');
    // perform multiple drags to move viewport around (deterministic enough)
    canvas.then(($el) => {
      const rect = $el[0].getBoundingClientRect();
      const startX = rect.left + rect.width * 0.7;
      const startY = rect.top + rect.height * 0.5;
      const moves = [
        { x: startX - 180, y: startY },
        { x: startX - 360, y: startY - 40 },
        { x: startX - 520, y: startY + 20 },
      ];

      for (const m of moves) {
        cy.wrap($el)
          .trigger("pointerdown", {
            clientX: startX,
            clientY: startY,
            pointerId: 1,
          })
          .trigger("pointermove", { clientX: m.x, clientY: m.y, pointerId: 1 })
          .wait(120)
          .trigger("pointerup", { pointerId: 1 });
      }
    });

    // give app a moment to settle
    cy.wait(500);

    // press shutter to capture — the app will nudge/center then show polaroid
    cy.get('[data-test-id="shutter-button"]').click();

    // wait for polaroid overlay (PolaroidUI uses a high z-index fixed div)
    cy.get("div")
      .filter('[style*="z-index: 9999"]')
      .should("be.visible")
      .then(($els) => {
        // There may be multiple high-z-index divs (confetti + polaroid).
        // Find the one that contains a <canvas> (PolaroidUI renders a canvas)
        const el = Array.from($els).find((e) => !!e.querySelector("canvas"));
        expect(el).to.exist;
        // dismiss polaroid to allow objective progression handling
        cy.wrap(el as HTMLElement).click();
      });

    // final assertion: objective progress should show a checkmark for completion
    cy.get("#objectiveProgress").should("contain.text", "✅");
  });
});
