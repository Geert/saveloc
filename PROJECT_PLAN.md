# Project Plan: Testing and Refactoring SaveLoc

This plan describes how to achieve full test coverage before refactoring the SaveLoc web app and how to integrate continuous testing using GitHub Actions.

## Goals
1. Ensure every user-facing feature is covered with automated tests.
2. Introduce CI to automatically run the tests on each push or pull request.
3. Proceed with a structured refactor once tests are in place.

## 1. Setting up the Test Infrastructure
- Use **Jest** as the test runner with a **jsdom** environment so we can simulate DOM APIs and `localStorage` in Node.
- Add a `package.json` with Jest and jsdom as dev dependencies and a `test` script (`npm test`).
- Create a minimal Jest configuration (`jest.config.js`).
- Add an initial sample test in `tests/index.test.js` to verify that `index.html` loads correctly.

## 2. Achieving Complete Test Coverage
To fully cover functionality, write test suites for the following features:
1. **Map initialization** – Ensure the map loads with the preferred layer from `localStorage`.
2. **Location management** – Tests for adding, editing, and deleting locations, verifying localStorage persistence and DOM updates.
3. **Import/Export** – Validate XML export format and correct parsing during import, including error handling for invalid XML.
4. **Edit mode and marker dragging** – Verify markers become draggable, updates persist after drag, and UI messages appear.
5. **Notification system** – Ensure notifications show and auto-dismiss as expected.
6. **Accessibility and UI elements** – Confirm key buttons and forms exist and that the drawer opens/closes appropriately.

Use `jsdom` to create a DOM for unit tests and simulate events (clicks, input changes). For complex interactions involving maps, consider abstracting Leaflet calls so they can be mocked.

For end-to-end testing in a browser, introduce **Cypress** or **Playwright**:
- Spin up a local server (`npx http-server`) during the test job.
- Run browser-based tests to cover full user workflows (adding a location, editing it, importing/exporting, toggling edit mode).

## 3. Continuous Integration (CI)
- GitHub Actions workflow (`.github/workflows/ci.yml`) installs Node dependencies and runs `npm test` on every push or pull request against `main`.
- Later, extend the workflow to run Cypress/Playwright tests (using the relevant setup actions) once they are added.

## 4. Refactoring Steps (after tests pass)
1. **Modularize code** – Split the large `script.js` into smaller modules (e.g., `storage.js`, `map.js`, `ui.js`) that export explicit functions. This makes unit testing easier.
2. **Improve state management** – Introduce a central state object or use a small framework if needed. Ensure functions are pure where possible to simplify tests.
3. **Remove unused code** – Identify functions, variables and markup that are no longer called and delete them to keep the codebase lean.
4. **Eliminate duplicate logic** – Look for repeated patterns and refactor them into shared helpers to make the code DRY.
5. **Accessibility & performance tweaks** – Clean up DOM manipulation, remove console logs, and adopt a consistent coding style.
6. **Documentation** – Update README with setup instructions (`npm install`, running tests, start server). Document any API changes from the refactor.
7. **Ongoing CI** – Keep tests green during refactoring. Expand tests as new modules are introduced.

Following this plan ensures the current functionality is locked down by tests, enabling a safe refactor while maintaining confidence through automated CI runs.
