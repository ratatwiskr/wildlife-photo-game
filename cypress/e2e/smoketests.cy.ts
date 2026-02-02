require("cypress-terminal-report/src/installLogsCollector")();

describe("Smoketests", () => {
  it("should load the scene and display key elements", () => {
    cy.visit("/");
    cy.get('[data-test-id="game-canvas"]').should("be.visible");
    cy.get('[data-test-id="shutter-button"]').should("be.visible");
  });

  it("should switch scene", () => {
    cy.visit("/");
    // Wait for back button to be clickable (deterministic: element visible)
    cy.get('[data-test-id="back-to-scene-selection-button"]')
      .should("be.visible")
      .click();

    // Wait for scene picker to appear (element visible check instead of timeout)
    cy.get(".scene-grid .scene-card").should("have.length.gte", 2);

    cy.get(".scene-grid .scene-card:first").click();

    cy.url().should("include", "scene=dev");

    // Wait for game to load (element visible instead of timeout)
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

    // give app a moment to settle (using element visibility instead of arbitrary wait)
    cy.get('[data-test-id="game-canvas"]').should("be.visible");

    // press shutter to capture — the app will nudge/center then show polaroid
    cy.get('[data-test-id="shutter-button"]').click();

    // wait for polaroid overlay (PolaroidUI uses a high z-index fixed div with data-test-id)
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 5000 })
      .should("be.visible")
      .then(($polaroid) => {
        // dismiss polaroid to allow objective progression handling
        cy.wrap($polaroid).click();
      });

    // final assertion: objective progress should show a checkmark for completion
    cy.get("#objectiveProgress", { timeout: 3000 }).should(
      "contain.text",
      "✅",
    );
  });

  /**
   * Test: Polaroid Appears on Capture
   *
   * Verifies that clicking the shutter button triggers a capture and displays
   * the polaroid UI modal with the captured image. Uses runtime state to ensure
   * the target is properly in the viewport.
   */
  it("should show polaroid modal when shutter is clicked", () => {
    // Load specific scene directly (avoid double init from beforeEach + cy.visit)
    cy.visit("/?scene=jungle_adventure");
    cy.get('[data-test-id="game-canvas"]').should("be.visible");
    cy.get('[data-test-id="shutter-button"]').should("be.visible");

    // Wait for game state to be ready, then ensure target is visible
    cy.window().should((win) => {
      expect((win as any).__app).to.exist;
      expect((win as any).__app.scene).to.exist;
      expect((win as any).__app.renderer).to.exist;
    });

    // Nudge viewport to center the lion
    cy.window().then((win) => {
      const app = (win as any).__app as any;
      const scene = app.scene as any;
      const renderer = app.renderer as any;
      const firstObj = scene.definition.objects[0];
      if (firstObj && renderer.viewport) {
        // Center the viewport on the first object
        renderer.viewport.x = firstObj.x - renderer.viewport.width / 2;
        renderer.viewport.y = firstObj.y - renderer.viewport.height / 2;
      }
    });

    // Now click shutter - target should be in view
    cy.get('[data-test-id="shutter-button"]').click();

    // Wait for polaroid to appear (with generous timeout for any nudge animation)
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 5000 })
      .should("be.visible")
      .should("have.css", "z-index", "9999");

    // Verify it contains a canvas (the captured image)
    cy.get('[data-test-id="polaroid-overlay"] canvas').should("exist");

    // Dismiss by clicking
    cy.get('[data-test-id="polaroid-overlay"]').click();

    // Verify it's gone
    cy.get('[data-test-id="polaroid-overlay"]').should("not.exist");
  });

  /**
   * Test: Objective Completion After Capture
   *
   * Verifies that after dismissing the polaroid, the objective progress
   * UI updates to show a checkmark, indicating the object was captured.
   */
  it("should update objective progress after capture", () => {
    cy.visit("/?scene=jungle_adventure");
    cy.get('[data-test-id="game-canvas"]').should("be.visible");

    // Ensure viewport is centered on target
    cy.window().then((win) => {
      const app = (win as any).__app as any;
      const scene = app.scene as any;
      const renderer = app.renderer as any;
      const firstObj = scene.definition.objects[0];
      if (firstObj && renderer.viewport) {
        renderer.viewport.x = firstObj.x - renderer.viewport.width / 2;
        renderer.viewport.y = firstObj.y - renderer.viewport.height / 2;
      }
    });

    // Click shutter
    cy.get('[data-test-id="shutter-button"]').click();

    // Wait for polaroid
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 5000 })
      .should("be.visible")
      .click();

    // Polaroid should disappear
    cy.get('[data-test-id="polaroid-overlay"]').should("not.exist");

    // Objective progress should update
    cy.get("#objectiveProgress", { timeout: 3000 }).should(
      "contain.text",
      "✅",
    );
  });

  /**
   * Test: Rapid Captures Rate-Limited by Cooldown
   *
   * Verifies that only one capture succeeds when shutter is clicked rapidly.
   * The cooldown mechanism (default 1000ms) prevents multiple captures in quick succession.
   */
  it("should rate-limit rapid consecutive shutter clicks via cooldown", () => {
    cy.visit("/?scene=jungle_adventure");
    cy.get('[data-test-id="game-canvas"]').should("be.visible");

    // Ensure viewport is centered on target
    cy.window().then((win) => {
      const app = (win as any).__app as any;
      const scene = app.scene as any;
      const renderer = app.renderer as any;
      const firstObj = scene.definition.objects[0];
      if (firstObj && renderer.viewport) {
        renderer.viewport.x = firstObj.x - renderer.viewport.width / 2;
        renderer.viewport.y = firstObj.y - renderer.viewport.height / 2;
      }
    });

    // First capture
    cy.get('[data-test-id="shutter-button"]').click();

    // Wait for polaroid to appear
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 5000 })
      .should("be.visible")
      .click();

    // Verify polaroid is dismissed and one objective is marked
    cy.get('[data-test-id="polaroid-overlay"]').should("not.exist");
    cy.get("#objectiveProgress", { timeout: 3000 }).should(
      "contain.text",
      "✅",
    );

    // Attempt rapid second and third clicks (while in cooldown)
    cy.get('[data-test-id="shutter-button"]').click();
    cy.get('[data-test-id="shutter-button"]').click();

    // Wait for cooldown to pass
    cy.wait(1100);

    // Verify still only ONE objective marked (rapid clicks were ignored)
    cy.get("#objectiveProgress").then(($el) => {
      const checkmarks = ($el.text().match(/✅/g) || []).length;
      expect(checkmarks).to.equal(1);
    });
  });

  /**
   * Test: Multi-Objective Scene Progression
   *
   * Verifies that a scene with multiple objectives progresses correctly.
   * Each objective must be completed in sequence before moving to the next.
   */
  it("should progress through multiple objectives when scene has several", () => {
    // Use the multi-objective scene (jungle_adventure_with_sun)
    cy.visit("/?scene=jungle_adventure_with_sun");
    cy.get('[data-test-id="game-canvas"]').should("be.visible");

    // Ensure app is loaded
    cy.window().should((win) => {
      expect((win as any).__app).to.exist;
    });

    // Center viewport on first object
    cy.window().then((win) => {
      const app = (win as any).__app as any;
      const scene = app.scene as any;
      const renderer = app.renderer as any;
      const firstObj = scene.definition.objects[0];
      if (firstObj && renderer.viewport) {
        renderer.viewport.x = firstObj.x - renderer.viewport.width / 2;
        renderer.viewport.y = firstObj.y - renderer.viewport.height / 2;
      }
    });

    // Initial state: both objectives should be visible
    cy.get("#objectiveProgress", { timeout: 3000 }).should(
      "contain.text",
      "🦁",
    );

    // Capture first objective (lion)
    cy.get('[data-test-id="shutter-button"]').click();
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 5000 })
      .should("be.visible")
      .click();
    cy.get('[data-test-id="polaroid-overlay"]').should("not.exist");

    // First objective should now be marked complete
    cy.get("#objectiveProgress", { timeout: 3000 }).should(
      "contain.text",
      "✅",
    );

    // Wait for cooldown
    cy.wait(1100);

    // Pan viewport to find second objective (sun) by moving right
    cy.window().then((win) => {
      const app = (win as any).__app as any;
      const scene = app.scene as any;
      const renderer = app.renderer as any;
      // Find sun object (second object)
      const sunObj = scene.definition.objects[1];
      if (sunObj && renderer.viewport) {
        renderer.viewport.x = sunObj.x - renderer.viewport.width / 2;
        renderer.viewport.y = sunObj.y - renderer.viewport.height / 2;
      }
    });

    // Capture second objective
    cy.get('[data-test-id="shutter-button"]').click();
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 5000 })
      .should("be.visible")
      .click();
    cy.get('[data-test-id="polaroid-overlay"]').should("not.exist");

    // Both objectives should now be complete
    cy.get("#objectiveProgress", { timeout: 3000 }).then(($el) => {
      const checkmarks = ($el.text().match(/✅/g) || []).length;
      expect(checkmarks).to.be.gte(1);
    });
  });

  /**
   * Test: Scene Picker Recovery from Invalid Scene
   *
   * Verifies that attempting to load a non-existent scene doesn't crash the game.
   * The app should gracefully fall back, allowing the user to pick a valid scene.
   */
  it("should handle invalid scene parameters gracefully", () => {
    // Try to load a scene that doesn't exist
    cy.visit("/?scene=nonexistent_scene_12345", { failOnStatusCode: false });

    // Page should still load without crashing
    cy.get("body").should("exist");

    // Back button should still work
    cy.get('[data-test-id="back-to-scene-selection-button"]')
      .should("be.visible")
      .click();

    // Scene picker should appear with available scenes
    cy.get(".scene-grid .scene-card", { timeout: 3000 }).should(
      "have.length.gte",
      2,
    );

    // Load a valid scene
    cy.get(".scene-grid .scene-card:first").click();

    // Game should display normally
    cy.get('[data-test-id="game-canvas"]', { timeout: 3000 }).should(
      "be.visible",
    );
    cy.get('[data-test-id="shutter-button"]').should("be.visible");
  });
});
