# Assessment 2 - Restful Booker API tests

This assessment uses a Postman Collection v2.1 export and **Newman 6.2.3** to test the public [Restful Booker API](https://restful-booker.herokuapp.com/apidoc/index.html). It covers a booking lifecycle, name searches, authentication failures, and rejected partial updates using two JSON-data iterations. It is separate from Assessment 1's Playwright files, which were not changed by this repair.

## Files

| File | Purpose |
| --- | --- |
| `restful-booker.postman_collection.json` | Main repaired collection: 17 ordered requests per iteration. |
| `booking-data.json` | Two iterations with distinct names, numeric prices, boolean deposits, dates, and additional needs. |
| `restful-booker-date-filters.investigation.postman_collection.json` | Original date-filter requests and inherited assertions, with their own setup and cleanup. Known failures remain enabled. |
| `validate-collection.cjs` | Offline checks for JSON, script syntax, ordering, authentication, empty exported runtime values, and verification GETs. |
| `results-summary.json` | Shareable summary of the actual validation and live runs; contains no runtime tokens or booking IDs. |
| `AI_ASSISTANCE.md` | AI contribution, review, validation, and remaining limitations. |
| `.backups/` | Ignored, local-only original export and repair-validation scratch files. |
| `reports/` | Ignored raw CLI logs from the repaired runs. |
| `run-results.json` | Original failed Newman output, preserved and ignored. This is not evidence of a repaired run. |

## Run the main collection

Use Node.js with npm/npx available; Node.js 22 is a suitable project baseline. Newman is pinned in the command, so no global installation or changes to Assessment 1's package dependencies are required. Internet access to npm and Restful Booker is needed. Newman 6.2.3 and its dependencies can emit deprecation warnings on newer Node.js versions; these warnings are separate from assertion failures.

From the **`learning-` repository root**:

```sh
node assessment_2/validate-collection.cjs
npx --yes newman@6.2.3 run assessment_2/restful-booker.postman_collection.json -d assessment_2/booking-data.json
```

The data array supplies two iterations automatically. Use the exact lowercase `assessment_2` paths when running on case-sensitive systems. No environment file or previously saved token/booking ID is needed.

To run in Postman, import the main collection, open its Collection Runner, select `booking-data.json`, and run both data rows through the **whole collection in order**. Running an update folder alone intentionally fails its ownership prerequisite.

Do not use `--bail` for these lifecycle collections: ordinary assertion failures should remain visible while later cleanup still runs. Newman returns a non-zero exit code when assertions fail. A successful cleanup does not convert earlier failures to passes.

## Request flow and expected data

The numbered folders execute in this order:

1. Health: `GET /ping`, expecting HTTP 201 and a response time below 500ms.
2. Authentication: valid login, then invalid credentials with no issued token.
3. Create a booking from the current data row, then retrieve it.
4. List all booking IDs with **no query parameter**, then filter by the submitted first and last names.
5. PUT a complete replacement, then GET it and compare persisted data.
6. PATCH selected fields, then GET and compare the complete persisted booking.
7. PATCH with invalid Basic authentication and with an invalid cookie token, each followed by GET verification that data is unchanged.
8. DELETE the owned booking, expecting HTTP **201**, then GET the deleted ID, expecting **404**.

The data file is read using `pm.iterationData`. Create serialises a JavaScript object as JSON, keeping `totalprice` a number and `depositpaid` a boolean, including the second row's `false`. Input types and dates are validated before the POST is sent.

`submittedBooking` is saved from the input **before creation**. The new booking ID is captured only from that creation response. `expectedBooking` is independently calculated from the submitted POST, PUT, and PATCH payloads. PUT adds 25 to the price and changes the first name, deposit flag, and needs; PATCH adds another 15 and changes additional needs. The expected booking is never copied from the server's echo.

Verification GETs have no bodies, do not parse a request body, and only compare the response against the saved expectation. They do not rewrite the expectation. The final deletion check clears runtime state only after a 404. Shared list status, shape, unique-ID, and owned-ID-inclusion assertions run once per search at folder level, without duplicate request-level tests.

## Authentication and protection of existing bookings

Positive PUT, PATCH, and DELETE requests use Postman's **Basic Auth helper**, with the API's documented public demo credentials `admin` / `password123`. There are no conflicting manually supplied Cookie or Authorization headers on those requests. See the [official API reference source](https://github.com/mwinteringham/restful-booker/blob/master/routes/index.js) for the documented authentication alternatives.

The valid authentication response token is tested and retained only during the run. It is not required by positive Basic Auth writes. Negative coverage includes:

- Invalid login: HTTP 200 with `Bad credentials` and no token.
- PATCH with invalid Basic credentials: HTTP 403.
- PATCH with an invalid token: HTTP 403, sent deliberately as `Cookie: token=invalid-assessment-token` with Basic Auth disabled.
- GET after each rejected PATCH: the complete booking must still equal `expectedBooking`.

Cookie handling is disabled on collection requests to prevent a previously stored cookie from accidentally authorising the negative case.

Every booking-ID request checks that the ID came from Create in the current iteration, with matching run/iteration ownership markers. A local variable overrides any stale ID supplied through environment or iteration data. No ID from list/search results is adopted as a mutation target.

Before **every** PUT, PATCH, or DELETE, an additional read-only safety GET confirms that the owned record still matches the saved state. If ownership or state cannot be verified, a failing prerequisite is recorded and the unsafe request is not sent. This is a fail-closed safety guard, not a mechanism for suppressing failing business assertions. The next iteration also refuses to create another booking if the preceding owned booking was not cleaned up.

Restful Booker is shared and can reset or change concurrently. The safety read and mutation are not an atomic server operation, so no client collection can eliminate every race. An interrupted process or unavailable service can prevent cleanup; inspect the ignored local log and verify ownership before any manual action. Never substitute a random existing booking ID or delete bookings found by a broad list search.

## Date-filter investigation - unresolved

Run separately from the main collection:

```sh
npx --yes newman@6.2.3 run assessment_2/restful-booker-date-filters.investigation.postman_collection.json -d assessment_2/booking-data.json
```

The investigation authenticates, creates a new booking for each data row, verifies it, runs both **original** date-filter requests and their original folder assertions, and then deletes and verifies deletion of only its own booking. Both original query definitions are retained, including the fixed `checkin=2027-02-01` query in the request named `Filter booking IDs by dates Copy`. The original date assertions are preserved verbatim, not disabled or changed to accept empty results.

In the live run, the combined `checkin`/`checkout` query using the created booking's exact dates returned HTTP 200 with `[]` in **both iterations**, failing the requirement that the newly created booking be included. The original earlier-check-in-only query included it and passed. Both bookings were still cleaned up, with DELETE 201 followed by GET 404.

The [published API definitions and route implementation](https://github.com/mwinteringham/restful-booker/blob/master/routes/index.js) disagree on date boundaries: the comments describe inclusive lower bounds, while the source uses a strict greater-than check-in comparison and a strict less-than checkout comparison. This supports investigating a boundary/contract discrepancy; it does not prove which behaviour the assessment should adopt or that the deployed service exactly matches that source revision. **The issue remains unresolved pending contract clarification.** Separating the investigation does not make date filtering pass or remove it from the assessment record.

## Actual validation results - 27 October 2026

| Run | Iterations | Requests | Assertions passed | Assertions failed | Exit code |
| --- | ---: | ---: | ---: | ---: | ---: |
| Main collection, exact requested Newman command | 2 | 44 | **85** | **1** | 1 |
| Original date-filter investigation | 2 | 18 | **39** | **3** | 1 |

Newman's request counts include the safety GETs made by pre-request scripts: the main run has 34 listed requests plus 10 safety GETs; the investigation has 16 listed requests plus 2 safety GETs. Neither live run had transport/request failures or script failures.

- **Main run:** duration 16.7s. Its only failed assertion was the first health response: **2358ms**, above 500ms. The second health response was 238ms. All CRUD, list/name, authentication, rejected-PATCH, and persistence assertions passed. Both created bookings were deleted and returned 404 afterward.
- **Investigation:** duration 6.2s. Failures were the first health response (**814ms**) and the two exact-date inclusion assertions. The second health response was 235ms. Both investigation bookings were deleted and returned 404 afterward.
- **The strict `<500ms` health budget is a chosen assessment threshold, not a documented service SLA.** It is still enabled. Connection setup and network latency are included in the observed response time; these results do not establish a server-only performance cause. No warm-up request, widened threshold, retry, or disabled assertion was used to make the run pass.
- Offline validation passed for both JSON collections, **45 JavaScript scripts**, typed data rows, request order, empty runtime exports, authentication, and verification GETs. When the local original backup exists, the validator also checks that its original date requests and assertions were preserved.
- A separate **local mock**, not a live API result, completed both iterations with **86/86 assertions passing**. It verified cleanup, typed payloads, and preservation of an unrelated seeded record even when stale IDs were supplied in data/environment scopes.

The raw logs are local, ignored files: `reports/main-newman.log` and `reports/date-investigation-newman.log`. `results-summary.json` records these actual counts without exposing runtime state. A fresh run may produce different timings or failures; neither collection is claimed to be fully passing.

## Original backup and shareable exports

The original collection is backed up byte-for-byte at `.backups/restful-booker.original.postman_collection.json`, ignored by Git. Original SHA-256:

```text
f27ec26e0484996b1e9fd2f04dafd4be1b49d92fd270ac42c79a54a79a69df90
```

`run-results.json` from the original broken export is preserved without overwriting it and is also ignored. The new raw logs, backups, and any future files under `reports/` must remain local because they can contain runtime tokens, IDs, and request details.

Both shareable collections have the correct default base URL and **empty token, booking-ID, ownership, and expected-state variables**. Running Newman does not rewrite the input collection file. If re-exporting from Postman after a run, clear runtime values first and rerun `node assessment_2/validate-collection.cjs` before sharing. The saved username/password are the documented public demo credentials, not captured runtime secrets.

AI assistance and review are described in [AI_ASSISTANCE.md](AI_ASSISTANCE.md). No Assessment 1 test, helper, package file, workflow, or root README was edited by this repair. No commit or push was performed.
