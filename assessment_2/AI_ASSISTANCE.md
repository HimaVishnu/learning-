# AI assistance - Assessment 2

OpenAI Codex assisted with repairing the exported Postman collection, writing validation scripts, separating the date-filter investigation, running Newman, and preparing these notes. The assessment requirements and the original collection/data came from the user. These notes describe performed checks; they do not claim an independent human review has taken place.

## Changes assisted by AI

- Inspected the original collection and failed Newman output before editing.
- Saved an exact original export in an ignored backup and retained the old output without overwriting it.
- Corrected base URL, lifecycle order, request authentication, query parameters, and expected status codes.
- Replaced copied GET mutation scripts with read-only comparisons against independently saved expected data.
- Used typed iteration JSON for creation, captured the newly created ID, and added run/iteration ownership checks and pre-mutation safety GETs.
- Added invalid login, invalid Basic PATCH, invalid-token PATCH, and unchanged-data verification.
- Preserved original date-filter requests and inherited assertions in a separate setup/cleanup collection.
- Added an offline validator, assessment README, and a runtime-state-free result summary.

## Review and validation actually performed

1. Read the official Restful Booker API definitions/source for authentication, response codes, and date filters, and checked the installed Newman runtime's support for fail-closed request guards.
2. Parsed both collection JSON files and compiled every embedded pre-request/test script with Node's JavaScript parser. Initial validation found an apostrophe escaping error in generated test names; it was corrected before any live requests ran.
3. Checked request order, two typed iteration rows, Basic Auth configuration, folder-level list assertions, body-free verification GETs, and empty shareable runtime values. Compared original date-request definitions and inherited assertions directly with the backup.
4. Ran Newman against a separate local mock for two iterations. It recorded **86 passing assertions, zero failures**, deleted both newly created mock bookings, preserved the unrelated seeded booking, and rejected stale-ID scope precedence as a mutation source. These are mock checks, not claims about the public API.
5. Ran the user's exact main Newman command against the public service. Actual result: **85 assertions passed, 1 failed**, 44 requests, two iterations, exit code 1. The sole failure was the chosen 500ms health budget; the observed first response was 2358ms. Cleanup succeeded for both created bookings.
6. Ran the preserved date investigation separately. Actual result: **39 assertions passed, 3 failed**, 18 requests, two iterations, exit code 1. Failures were the first health response at 814ms and both exact-date inclusion assertions. Cleanup succeeded for both investigation bookings.
7. Checked hashes of the tracked Assessment 1 files against a pre-edit baseline and checked Git ignore rules and whitespace. Assessment 1 was not rerun because its source/configuration was not changed.

## What remains open

The 500ms budget was retained as requested and is not an API SLA. The date-filter boundary/contract discrepancy remains unresolved; its original assertions continue to fail visibly in the investigation collection. No thresholds were widened, expected results replaced with actual responses, assertions disabled, or live failures relabelled as passes. There is no claim of a fully passing API assessment or of GitHub Actions executing these collections. The public service's shared state and interrupted-run cleanup remain limitations to review.

The AI-produced collection scripts and documents should still be reviewed by the assessment author before submission. Runtime logs and original backups remain ignored, shareable runtime variables remain empty, and nothing was committed or pushed by Codex.
