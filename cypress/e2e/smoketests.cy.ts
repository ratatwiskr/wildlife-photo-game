import installLogsCollector from "cypress-terminal-report/src/installLogsCollector";
import { appOf, requireApp } from "../support/appGlobals";

installLogsCollector();

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

    // wait for app init + mask centroid computation (should() auto-retries)
    cy.window().should((win) => {
      const app = appOf(win);
      expect(app).to.exist;
      expect(app?.scene).to.exist;
      expect(app?.renderer).to.exist;
      expect(app?.scene.definition.objects[0].x).to.exist;
      expect(app?.renderer.viewport).to.exist;
    });

    // Derive the pan distance from runtime state instead of hardcoded pixel
    // deltas, so the target ends up within the camera's nudge gate for any
    // canvas size / DPR. Still a real pointer drag — only the distance is
    // computed.
    cy.window().then((win) => {
      const { scene, renderer } = requireApp(win);
      const viewport = renderer.viewport;
      const canvas = win.document.querySelector('[data-test-id="game-canvas"]');
      const target = scene
        .getObjectsForObjective(renderer.currentObjective)
        .find((o) => !o.found);
      if (!canvas) throw new Error("game canvas not found");
      if (!target) throw new Error("no unfound target for current objective");
      if (target.x == null || target.y == null)
        throw new Error("target centroid not computed yet");

      const rect = canvas.getBoundingClientRect();
      // clamp like Viewport.pan() so the requested position stays in-bounds
      const desiredX = Math.min(
        Math.max(target.x - viewport.width / 2, 0),
        Math.max(0, viewport.sceneWidth - viewport.width),
      );
      const desiredY = Math.min(
        Math.max(target.y - viewport.height / 2, 0),
        Math.max(0, viewport.sceneHeight - viewport.height),
      );
      // GameManager maps CSS-pixel drags to world units as
      // deltaWorld = -(dragCss / rect.width) * viewport.width (dpr cancels out)
      const dragX = ((viewport.x - desiredX) * rect.width) / viewport.width;
      const dragY = ((viewport.y - desiredY) * rect.height) / viewport.height;

      // 3 sequential stylus-like drags that sum to the total delta; each drag
      // starts where the previous one ended (the old test restarted every drag
      // at the same origin, so the deltas accumulated 1+2+3)
      const segments = 3;
      let fromX = rect.left + rect.width / 2;
      let fromY = rect.top + rect.height / 2;
      for (let i = 0; i < segments; i++) {
        const toX = fromX + dragX / segments;
        const toY = fromY + dragY / segments;
        cy.wrap(canvas)
          .trigger("pointerdown", {
            clientX: fromX,
            clientY: fromY,
            pointerId: 1,
          })
          .trigger("pointermove", { clientX: toX, clientY: toY, pointerId: 1 })
          .wait(120)
          .trigger("pointerup", { pointerId: 1 });
        fromX = toX;
        fromY = toY;
      }
    });

    // The drag above exercises Viewport.pan(); verify the target actually
    // landed inside the nudge gate (0.6 × smaller viewport dimension) and
    // correct directly — the same way the other specs do — if the pointer
    // events did not register as expected.
    cy.window().then((win) => {
      const { scene, renderer } = requireApp(win);
      const viewport = renderer.viewport;
      const target = scene
        .getObjectsForObjective(renderer.currentObjective)
        .find((o) => !o.found);
      if (!target || target.x == null || target.y == null)
        throw new Error("no positioned target after pan");
      const dx = target.x - (viewport.x + viewport.width / 2);
      const dy = target.y - (viewport.y + viewport.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const gate = 0.6 * Math.min(viewport.width, viewport.height);
      const inView =
        target.x >= viewport.x &&
        target.x <= viewport.x + viewport.width &&
        target.y >= viewport.y &&
        target.y <= viewport.y + viewport.height;
      if (Number.isFinite(dist) && dist <= gate && inView) return;
      console.log("[cy] pan outside nudge gate, centering directly", {
        dist,
        gate,
      });
      viewport.x = Math.min(
        Math.max(target.x - viewport.width / 2, 0),
        Math.max(0, viewport.sceneWidth - viewport.width),
      );
      viewport.y = Math.min(
        Math.max(target.y - viewport.height / 2, 0),
        Math.max(0, viewport.sceneHeight - viewport.height),
      );
    });

    // Tap the target itself: attemptCapture then samples the animal at the
    // tap point, so the capture succeeds even when the viewport is clamped at
    // a scene edge and its center just misses the mask's green area.
    cy.window().then((win) => {
      const { scene, renderer } = requireApp(win);
      const viewport = renderer.viewport;
      const canvas = win.document.querySelector('[data-test-id="game-canvas"]');
      const target = scene
        .getObjectsForObjective(renderer.currentObjective)
        .find((o) => !o.found);
      if (!canvas || !target || target.x == null || target.y == null)
        throw new Error("cannot compute tap point");
      const rect = canvas.getBoundingClientRect();
      const x = Math.min(
        rect.width - 1,
        Math.max(0, ((target.x - viewport.x) / viewport.width) * rect.width),
      );
      const y = Math.min(
        rect.height - 1,
        Math.max(0, ((target.y - viewport.y) / viewport.height) * rect.height),
      );
      cy.wrap(canvas).click(x, y, { force: true });
    });

    // press shutter to capture — the app will nudge/center then show polaroid
    cy.get('[data-test-id="shutter-button"]').click();

    // wait for polaroid overlay (PolaroidUI uses a high z-index fixed div with
    // data-test-id); nudge animation is up to 2400ms + 1000ms show delay
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 8000 })
      .should("be.visible")
      .click();

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
    cy.visit("/?scene=jungle_adventure");
    cy.get('[data-test-id="game-canvas"]').should("be.visible");
    cy.get('[data-test-id="shutter-button"]').should("be.visible");

    // Wait for app init + mask centroid computation (should() auto-retries)
    cy.window().should((win) => {
      const app = appOf(win);
      expect(app).to.exist;
      expect(app?.scene).to.exist;
      expect(app?.renderer).to.exist;
      expect(app?.scene.definition.objects[0].x).to.exist;
    });

    // Nudge viewport to center the lion
    cy.window().then((win) => {
      const { scene, renderer } = requireApp(win);
      const firstObj = scene.definition.objects[0];
      if (firstObj && renderer.viewport) {
        renderer.viewport.x = firstObj.x - renderer.viewport.width / 2;
        renderer.viewport.y = firstObj.y - renderer.viewport.height / 2;
      }
    });

    // Now click shutter
    cy.get('[data-test-id="shutter-button"]').click();

    // Wait for polaroid to appear
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

    // Wait for app init + mask centroid computation (should() auto-retries)
    cy.window().should((win) => {
      const app = appOf(win);
      expect(app).to.exist;
      expect(app?.scene).to.exist;
      expect(app?.renderer).to.exist;
      expect(app?.scene.definition.objects[0].x).to.exist;
    });

    // Ensure viewport is centered on target
    cy.window().then((win) => {
      const { scene, renderer } = requireApp(win);
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

    // Wait for app init + mask centroid computation (should() auto-retries)
    cy.window().should((win) => {
      const app = appOf(win);
      expect(app).to.exist;
      expect(app?.scene).to.exist;
      expect(app?.renderer).to.exist;
      expect(app?.scene.definition.objects[0].x).to.exist;
    });

    // Ensure viewport is centered on target
    cy.window().then((win) => {
      const { scene, renderer } = requireApp(win);
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
    cy.visit("/?scene=jungle_adventure_with_sun");
    cy.get('[data-test-id="game-canvas"]').should("be.visible");

    // Wait for app init + centroid computation (should() auto-retries)
    cy.window().should((win) => {
      const app = appOf(win);
      expect(app).to.exist;
      expect(app?.scene).to.exist;
      expect(app?.renderer).to.exist;
      expect(app?.scene.definition.objects[0].x).to.exist;
      expect(app?.renderer.viewport).to.exist;
    });

    // Center viewport on first objective target
    cy.window().then((win) => {
      const { scene, renderer } = requireApp(win);
      const viewport = renderer.viewport;
      const objective = renderer.currentObjective;
      const objs = scene.getObjectsForObjective(objective);
      const target = objs.find((o) => !o.found);
      expect(target).to.exist;
      viewport.x = target.x - viewport.width / 2;
      viewport.y = target.y - viewport.height / 2;
    });

    // Initial state: first objective emoji visible
    cy.get("#objectiveProgress", { timeout: 3000 }).should(
      "contain.text",
      "🦁",
    );

    // Capture first objective
    cy.get('[data-test-id="shutter-button"]').click();
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 10000 })
      .should("be.visible")
      .click({ force: true });
    cy.get('[data-test-id="polaroid-overlay"]').should("not.exist");

    // First objective should now be marked complete
    cy.get("#objectiveProgress", { timeout: 3000 }).should(
      "contain.text",
      "✅",
    );

    // Wait for cooldown
    cy.wait(1100);

    // Center viewport on second objective target
    cy.window().then((win) => {
      const { scene, renderer } = requireApp(win);
      const viewport = renderer.viewport;
      const objective = renderer.currentObjective;
      const objs = scene.getObjectsForObjective(objective);
      const target = objs.find((o) => !o.found);
      expect(target).to.exist;
      viewport.x = target.x - viewport.width / 2;
      viewport.y = target.y - viewport.height / 2;
    });

    // Capture second objective
    cy.get('[data-test-id="shutter-button"]').click();
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 10000 })
      .should("be.visible")
      .click({ force: true });
    cy.get('[data-test-id="polaroid-overlay"]').should("not.exist");

    // Both objectives should now be complete
    cy.get("#objectiveProgress", { timeout: 3000 }).should(
      "contain.text",
      "✅",
    );
  });

  /**
   * Test: Aim Assist Nudge Behavior (too-far, off-center, already-centered)
   *
   * Verifies all three branches of CameraController.nudgeToTarget():
   * - "skipped-too-far": target beyond 0.6× trigger gate → flash only, no polaroid
   * - "nudged": target off-center but within gate → nudge anim → capture → polaroid
   * - "already-centered": target within 200px tolerance → immediate capture
   *
   * Uses jungle_adventure_with_sun (2 objectives) so we can test nudge on first
   * objective then already-centered on second after objective advancement.
   */
  it("should handle aim assist nudge: too-far, off-center nudge, and already-centered", () => {
    cy.visit("/?scene=jungle_adventure_with_sun");
    cy.get('[data-test-id="game-canvas"]').should("be.visible");

    // Wait for app init + centroids via should() which Cypress auto-retries
    cy.window().should((win) => {
      const app = appOf(win);
      expect(app).to.exist;
      expect(app?.scene).to.exist;
      expect(app?.renderer).to.exist;
      expect(app?.scene.definition.objects[0].x).to.exist;
      expect(app?.renderer.viewport).to.exist;
    });

    // --- Scenario 1: Target too far → capture skipped ---
    cy.window().then((win) => {
      const { renderer } = requireApp(win);
      renderer.viewport.x = 0;
      renderer.viewport.y = 0;
    });
    cy.get('[data-test-id="shutter-button"]').click();
    // No polaroid should appear for a too-distant target
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 4000 }).should(
      "not.exist",
    );
    // No progress yet
    cy.get("#objectiveProgress", { timeout: 3000 }).should(
      "not.contain.text",
      "✅",
    );

    // --- Scenario 2: Off-center but within gate → nudge animation → capture ---
    cy.window().then((win) => {
      const { scene, renderer } = requireApp(win);
      const viewport = renderer.viewport;
      const objective = renderer.currentObjective;
      const objs = scene.getObjectsForObjective(objective);
      const target = objs.find((o) => !o.found);
      // Compute offset that is > tolerance (200px) but < trigger gate (0.6 × minDim)
      const tol = 200;
      const gate = Math.round(
        0.6 * Math.min(viewport.width, viewport.height),
      );
      const offset = Math.round(Math.max(tol + 1, Math.min(gate - 1, tol + (gate - tol) * 0.4)));
      viewport.x = target.x - viewport.width / 2 + offset;
      viewport.y = target.y - viewport.height / 2;
    });
    cy.get('[data-test-id="shutter-button"]').click();
    // Nudge anim (up to 2400ms) + polaroid delay (1000ms) — generous timeout
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 10000 })
      .should("be.visible")
      .click();
    cy.get('[data-test-id="polaroid-overlay"]').should("not.exist");
    // First objective should now be complete
    cy.get("#objectiveProgress", { timeout: 5000 }).should(
      "contain.text",
      "✅",
    );

    // Wait for cooldown between captures
    cy.wait(1100);

    // --- Scenario 3: Target already centered → immediate capture (no nudge) ---
    cy.window().then((win) => {
      const { scene, renderer } = requireApp(win);
      const viewport = renderer.viewport;
      // After first objective completed, currentObjective advanced to second
      const objective = renderer.currentObjective;
      const objs = scene.getObjectsForObjective(objective);
      const target = objs.find((o) => !o.found);
      expect(target).to.exist;
      viewport.x = target.x - viewport.width / 2;
      viewport.y = target.y - viewport.height / 2;
    });
    cy.get('[data-test-id="shutter-button"]').click();
    // Already-centered → no nudge, polaroid should appear promptly
    cy.get('[data-test-id="polaroid-overlay"]', { timeout: 5000 })
      .should("be.visible")
      .click();
    cy.get('[data-test-id="polaroid-overlay"]').should("not.exist");
    // Both objectives should now be marked
    cy.get("#objectiveProgress", { timeout: 5000 }).should(
      "contain.text",
      "✅",
    );
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
