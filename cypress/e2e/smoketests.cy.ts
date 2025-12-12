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
});
