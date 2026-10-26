# learning-

QA assessment for CORTO: automated UI checks for searching the [DemoQA Book Store](https://demoqa.com/books) and viewing book details.

Repository: [HimaVishnu/learning-](https://github.com/HimaVishnu/learning-). Reviewers need read access if the repository is private. This project installs independently; files from the parent `Automation_Playwright` project are not required.

## Current assessment status

Latest verified results supplied for this assessment:

| Suite | Verified status |
| --- | --- |
| Book Store search | **39 passed**: 13 scenarios across Chromium, Firefox, and WebKit. |




The configuration discovers 42 test instances: 13 search scenarios and one details test in each of three browsers. This is the configured test count, not a claim that all 42 pass. The details test checks every current book inside named steps, rather than creating a separate test result for each book.

## Tools and design

- **JavaScript and Playwright Test** provide browser automation, assertions, named test steps, and reporting. The lockfile currently records Playwright **1.64.1**.
- **Chromium, Firefox, and WebKit projects** run the same tests using desktop browser profiles. The WebKit project uses Playwright's engine and Desktop Safari profile; it is not a test of the installed Safari application.
- **Page Object Model:** `pages/BookStorePage.js` holds locators and reusable actions, including opening the catalogue, searching, paging through results, selecting books, and returning from details. Tests retain the assertions. Existing role/name locators are used where supported, with centralised CSS fallbacks for table elements and scoped selectors for details values.
- **Dynamic test data:** `test-data/bookSearchData.js` reads the current [Books API](https://demoqa.com/BookStore/v1/Books), validates the response, and generates inputs and expected matches before queries are entered. Expected results do not come from already-filtered UI results or fixed book fixtures.

```text
learning-/
  .github/workflows/playwright.yml
  pages/BookStorePage.js
  test-data/bookSearchData.js
  tests/book-search.spec.js
  tests/book-details.spec.js
  playwright.config.js
  package.json
  package-lock.json
  .gitignore
  README.md
```

## UI coverage

`tests/book-search.spec.js` contains 13 separate scenarios:

1. Full title search.
2. Partial title search.
3. Author search.
4. Publisher search.
5. Partial text across title, author, or publisher, ignoring case.
6. Generated unmatched text.
7. An unmatched input of exactly 300 characters.
8. ISBN is not searchable.
9. Subtitle is not searchable.
10. Total pages is not searchable.
11. Description is not searchable.
12. Website is not searchable.
13. Clearing search restores the original catalogue order and first page.

Title/author cases and no-match cases are data-driven, with a separate report result for each scenario. Unsupported-field inputs are selected only when their current values do not occur in any searchable field. Unmatched inputs are checked against the catalogue before use. Actual results are compared by ISBN, title, author, and publisher, including results on additional pages. Invalid, missing, or unsuitable catalogue data causes a prerequisite failure rather than a silent skip or fixed-data fallback.

`tests/book-details.spec.js` contains **one test per browser project**, looping through every current API book with named `test.step()` sections. It clicks the catalogue link, derives the ISBN query parameter from the actual link, checks the resulting URL, and compares ISBN, title, subtitle, author, publisher, pages, description, and displayed website text against the API. It clicks Back To Book Store and verifies the catalogue URL and complete list return. Soft field assertions allow further checks to run while still failing the test when a mismatch occurs.

Excluded features: login, registration, account/profile management, adding or removing books, sorting, other DemoQA applications, external website navigation, performance/load testing, and a dedicated accessibility audit. The website field is checked as displayed text because the current details page renders a label, not a hyperlink; hyperlink functionality is not covered. There is no separate completed API automation suite.

## Prerequisites and installation

Use **Node.js 22** with npm to match GitHub Actions. The installed Playwright dependency requires Node.js 20 or later. Internet access is needed for npm packages, browser downloads, DemoQA, and its Books API. No login, API key, or `.env` file is required for these read-only tests.

From a fresh checkout:

```sh
git clone https://github.com/HimaVishnu/learning-.git
cd learning-
npm ci
npx playwright install chromium firefox webkit
```

`npm ci` installs the exact dependencies in `package-lock.json`. Run all commands inside `learning-`, not its parent folder. Browser binaries are installed separately from npm dependencies.

If the repository is private, use a GitHub account with read access when cloning it. The setup requires this repository's package files, source files, and configuration; no parent-project files are needed.

On Linux or CI, install browser system dependencies as well:

```sh
npx playwright install --with-deps chromium firefox webkit
```

For a Chromium-only run, `npx playwright install chromium` is sufficient; all three browsers are needed to run all configured projects.

## Running tests

Run all files across all three browser projects:

```sh
npx playwright test
```

List the configured tests without executing them:

```sh
npx playwright test --list
```

Run an individual file across all configured browsers:

```sh
npx playwright test tests/book-search.spec.js
npx playwright test tests/book-details.spec.js
```

Run all files in one browser:

```sh
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

Combine a file and browser selection, or view the browser while running:

```sh
npx playwright test tests/book-details.spec.js --project=firefox
npx playwright test tests/book-search.spec.js --project=chromium --headed
```

The `test` script in `package.json` is still npm's initial placeholder. Use the direct commands above; `npm test` is not currently configured to run Playwright.

To use the same single-worker execution and failure-trace settings as CI:

```sh
npx playwright test --workers=1 --trace retain-on-failure
```

## Reports and failure investigation

The configuration generates an HTML report in `playwright-report/`. Open the latest report with:

```sh
npx playwright show-report
```

To capture a trace for the pending Firefox details failure:

```sh
npx playwright test tests/book-details.spec.js --project=firefox --trace on
```

Use the report's test steps and trace attachment to inspect the failing action, DOM state, and timing. The details suite's named book steps identify the affected ISBN. `test-results/` holds generated failure artifacts. Reports describe their own run and may replace the previous run's output.

A failed assertion or timeout causes a non-zero test-command exit status. Soft assertions still fail the test; they allow later checks to continue where navigation remains possible.

`node_modules/`, `test-results/`, `playwright-report/`, `blob-report/`, and `.env` are ignored by Git. Reviewers regenerate dependencies and reports locally.

## GitHub Actions

The workflow is defined in [`.github/workflows/playwright.yml`](.github/workflows/playwright.yml). It triggers on pushes and pull requests, with a manual `workflow_dispatch` trigger. GitHub exposes the manual Run workflow option once the workflow is on the default branch. It checks out this repository, uses Node.js 22 on Ubuntu, caches npm downloads, and installs dependencies and all three browsers. The job has a 30-minute timeout and repository contents read permission. No successful CI run is claimed here.

The workflow runs:

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
npx playwright test --workers=1 --trace retain-on-failure
```

The final command runs every configured browser project using one worker and retains traces for failures. Test failures, including the unresolved Firefox issue, fail the job. Unless the run is cancelled, the workflow uploads available `playwright-report/` and `test-results/` files as the `playwright-results` artifact even after test failures, with 30-day retention. Missing artifacts produce a warning. The HTML report does not automatically open on the CI runner.

To review a CI run:

1. Open the repository's **Actions** tab and select the **Playwright Tests** run.
2. Inspect the test job's logs and download the `playwright-results` artifact.
3. Extract the archive. From a local checkout with dependencies installed, open its extracted `playwright-report` folder with `npx playwright show-report "PATH_TO_EXTRACTED_REPORT"`, replacing the placeholder with that folder's path.

The workflow is present in the repository files; its execution on GitHub has not been verified. Repository access and GitHub Actions availability must be configured on GitHub before reviewers can use it.

## Known issues and limitations

- One Firefox book-details test currently fails. Investigation is pending. A previously supplied report showed the overall details-test timeout expiring during the Back To Book Store click's actionability checks; that report alone does not establish the root cause of the Firefox failure. Do not treat a larger timeout or forced click as a verified fix.
- DemoQA is an external live site. Network availability, third-party content, page changes, and changes between the API snapshot and browser load can affect results. No root cause is attributed to advertisements without trace evidence.
- The API is independent of the rendered UI but belongs to the same service. It validates UI consistency against the catalogue response, not the business correctness of the underlying catalogue itself.
- Dynamic inputs depend on suitable current data. If no usable non-matching unsupported-field value exists, setup fails explicitly rather than altering expectations to obtain a pass.
- Pagination is supported through the current Previous/Next controls. Future markup or navigation changes may require page-object updates.
- The details file is one test looping through the catalogue. It allows time proportional to catalogue size, but a hard navigation failure can prevent later books from being checked; soft field assertions do not prevent this.
- No fixed sleeps or configured retries are used. Actual failures remain visible.

## AI assistance and validation

OpenAI Codex assisted with tooling setup, drafting and refactoring the page object, catalogue-driven input generation, UI tests, failure analysis, and this documentation. AI assistance is disclosed; 

Review and validation included inspecting repository files, the live catalogue response, and actual DOM markup; checking Playwright's test discovery; running browser tests; and inspecting failures. Earlier runs exposed outdated table selectors and a website locator that assumed a hyperlink where the site rendered a label. Selectors were updated using observed markup, and the website check was explicitly revised to compare displayed text with the API value. A separate local synthetic-table check exercised collection across three pages and return to page one; it was not counted as a live assessment test result.

The verified assessment results remain the 39 passing search results and the unresolved Firefox details failure stated above. Generated assertions and helper logic remain reviewable in the source, and the open failure requires further investigation. This README update does not constitute a new browser run or a completed API assessment.
