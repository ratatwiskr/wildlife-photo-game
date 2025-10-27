---
name: Plan Feature/Bugfix
description: Create a detailed plan to add a new feature or address a bug.
invokable: true
---

# Feature Addition Plan: [Feature Name]

## Objective

- Describe the objective of the new feature.
- Explain why this feature is important and how it aligns with project goals.

## Milestones

- **Milestone 1**: Initial Evaluation and Setup
- **Milestone 2**: Design and Architecture
- **Milestone 3**: Implementation (TDD Approach)
- **Milestone 4**: Testing and Validation
- **Milestone 5**: Review and Optimization
- **Milestone 6**: Documentation

## Tasks

### Milestone 1: Initial Evaluation and Setup

- [ ] Evaluate the current codebase for relevant areas.
- [ ] Read existing documentation related to the feature.
- [ ] Check for existing tests covering affected components.
  - [ ] Identify test files that need updates or new tests required.
- [ ] Set up a local development environment for the feature.

### Milestone 2: Design and Architecture

- [ ] Define the scope of the new feature.
- [ ] Create wireframes or mockups (if applicable).
- [ ] Plan how to separate concerns effectively within the new feature.
- [ ] Decide on language-specific best practices that will be followed.
- [ ] Outline initial API endpoints, functions, classes, and methods.

### Milestone 3: Implementation (TDD Approach)

For each small feature or bug fix:

1. **Red Phase: Write a Failing Test**

   - [ ] Identify the next smallest piece of functionality to implement.
   - [ ] Write a unit test that describes this behavior.
     - Ensure it fails before implementation begins.

2. **Green Phase: Implement Minimal Solution**

   - [ ] Implement just enough code to make this one test pass.
     - Avoid over-engineering; focus on meeting the requirements of the failing test only.

3. **Refactor Phase: Refine Code if Needed**
   - [ ] Review and refactor your implementation to improve readability, maintainability, or performance while ensuring all tests still pass.
   - [ ] Repeat this Red-Green-Refactor cycle until a Minimum Viable Product (MVP) is achieved.

### Milestone 4: Testing and Validation

- [ ] Write additional unit tests covering any new code paths not already covered by TDD.
  - [ ] Test edge cases and failure scenarios.
- [ ] Conduct integration testing with existing components.
- [ ] Validate the feature against initial requirements.

### Milestone 5: Review and Optimization

- [ ] Perform a comprehensive code review for readability, maintainability, and adherence to best practices.
- [ ] Refactor code if necessary to improve performance or design.
- [ ] Ensure all unit tests pass.

### Milestone 6: Documentation

- [ ] Update user documentation during each increment.
- [ ] Update API documentation (if applicable) as the feature evolves.
- [ ] Add inline comments within code where necessary for clarity.

## Summary of Improvements Planned

- List any additional improvements or refactoring tasks to be addressed in subsequent iterations.

---

This plan will ensure a working increment is delivered first, followed by iterative improvements that adhere to clean coding principles and best practices using TDD.
