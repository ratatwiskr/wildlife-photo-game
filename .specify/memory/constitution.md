<!--
Sync Impact Report

- Version change: none (template) → 1.0.0
- Modified principles:
	- (new) Child-First UX & Accessibility
	- (new) TypeScript & Build Constraints
	- (new) Testing & Quality (Cypress primary; Jest off-limits for now)
	- (new) Asset Integrity & Mask Validation
	- (new) Simplicity, Observability & Versioning
- Added sections: Technical Constraints, Development Workflow
- Removed sections: none
- Templates requiring updates:
	- .specify/templates/plan-template.md: ⚠ pending (contains Constitution Check placeholder)
	- .specify/templates/spec-template.md: ⚠ pending (user-scenarios testing guidance aligned - no edits made)
	- .specify/templates/tasks-template.md: ⚠ pending (task/test language references unit tests; review recommended)
	- .specify/templates/commands/*.md: ⚠ missing (directory not found; verify commands templates)
- Follow-up TODOs:
	- Review and update templates above to reference this constitution explicitly (owners: maintainers)
	- Add `.specify/templates/commands/` if command docs are required

-- End Sync Impact Report
-->

# Wildlife Photo Game Constitution

## Core Principles

### 1. Child-First UX & Accessibility (NON-NEGOTIABLE)

Interactions, visuals, and feedback MUST prioritize clarity for ages 2–6. Controls
MUST be responsive to touch/stylus, tolerate imprecise input, and provide
immediate, unambiguous feedback (visual + audio optional). Accessibility
considerations (large touch targets, high-contrast overlays, screen-reader
friendly labels where applicable) are REQUIRED for any UI change.

Rationale: The player demographic has constrained motor and reading skills;
design and engineering decisions must reduce cognitive load and error.

### 2. TypeScript & Build Constraints

The codebase MUST target TypeScript 5.x and compile to ES2022 modules. All new
code MUST use ES module imports with `.js` extensions where applicable and
preserve the project's existing module layout. Avoid runtime polyfills unless
explicitly justified in the PR.

Rationale: Predictable output, consistent bundling, and compatibility with the
existing build pipeline are critical for maintainability and CI stability.

### 3. Testing & Quality (Cypress E2E as Source of Truth)

End-to-end tests using Cypress are the authoritative verification for user
journeys and release readiness. All features that touch the UI or scene assets
MUST include Cypress E2E coverage demonstrating the user journey. Unit tests
and fast-running checks are encouraged but NOT required for every change.

Operational constraint: The repository currently contains a broken Jest setup.
Do NOT attempt to fix or re-enable Jest as part of routine feature work. Work
iteratively using `cypress` as the primary guardrail and CI test runner until a
deliberate remediation effort is scheduled.

Rationale: Prioritize reliability of user journeys and reduce developer
overhead by focusing on a single stable test runner for the current iteration.

### 4. Asset Integrity & Mask Validation

All scene assets (JPG, mask PNG, JSON) MUST match by base name and pass the
`npm run validate:scenes` validator prior to merging. Mask colors in JSON MUST
match the PNG color keys exactly (`#RRGGBB`, uppercase recommended). Asset
validation is a gating check in CI for all scene-related changes.

Rationale: The gameplay relies on color-keyed mask detection; invalid assets
break the core user experience and must be caught early.

### 5. Simplicity, Observability & Versioning

Prefer the simplest implementation that satisfies user scenarios. All runtime
errors and state-changing actions SHOULD emit structured logs (dev-friendly)
when observable in CI or local dev servers. Follow semantic versioning for
breaking changes to public contracts and scene definitions (see Governance).

Rationale: Simple code is easier to maintain and review; observability speeds
debugging on devices (tablets) and CI.

## Technical Constraints

- Language: TypeScript 5.x → compile target ES2022
- Module system: ES modules (use `.js` file extensions in imports)
- Primary test runner: Cypress (E2E). Jest is intentionally excluded from the
  current iteration due to known breakage.
- Asset layout: `assets/scenes/` with exact base-name matching for `*.jpg`,
  `*_mask.png`, and `.json` scene definitions.
- Mask color format: `#RRGGBB` (hex); color keys in JSON MUST match mask PNG
  values. Colors should be uppercase for consistency.

## Development Workflow

- Branching: feature branches prefixed `feat/` or `fix/` and reference issue or
  PR number when available.
- Pull requests MUST include:
  - A short description of the user scenario addressed
  - Cypress E2E tests or a description of why none were added
  - Evidence that `npm run validate:scenes` passes when relevant
- CI gates:
  - `npm ci` / `npm run build` success
  - `npm run validate:scenes` (if scene assets changed)
  - `npm run cy:run` (Cypress headless tests for affected user journeys)
- Releases: Use tagged commits and update `package.json` where applicable.

Notes on testing: Write Cypress tests that are deterministic and avoid flakiness
by mocking external timing where possible and keeping scene assets stable in
fixtures. If a PR cannot include Cypress coverage due to test infra limits,
add a clear remediation plan in the PR and obtain reviewer sign-off.

## Governance

Amendments and versioning follow semantic rules and a lightweight approval
process:

- Amendment procedure:

  1.  Propose changes in a spec or PR that references this constitution.
  2.  Include a migration or compliance plan if the change affects existing
      scenes or public behavior.
  3.  Obtain approval from two maintainers (or one maintainer + one reviewer
      if the change is non-controversial).

- Versioning policy (Constitution metadata):

  - MAJOR: Backwards-incompatible governance changes or principle removals.
  - MINOR: Addition of a new principle or material expansion to an existing
    principle.
  - PATCH: Wording clarifications, typos, or non-normative refinements.

- Compliance review:
  - PRs that touch foundational policies (testing, asset validation,
    release/versioning) MUST include a short compliance checklist referencing
    this constitution.

**Version**: 1.0.0 | **Ratified**: 2025-12-12 | **Last Amended**: 2025-12-12

**_ End of Constitution _**
