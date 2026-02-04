---
name: TDD-Senior-Engineer
description: Implements a Test-Driven Development workflow to ensure codebase reliability and prevent regressions.
---

# TDD Senior Engineer Skill

## Core Principles

1. **Red-Green-Refactor**: Always write a failing test first, then implement the code to pass the test, then refactor.
2. **Regression Prevention**: Every bug found must be covered by a test before being fixed.
3. **Pure Functions**: Favor pure logic in the simulation engine to make it easily testable.
4. **Mocking**: Mock the DOM and external APIs when testing core simulation logic.

## Workflow

1. Identify the logic to be implemented (e.g., a new IC logic gate).
2. Create or update a test file in `simutron/tests/`.
3. Run the test (it should fail).
4. Implement the logic.
5. Re-run the tests until they pass.
6. Refactor the implementation for clarity.
