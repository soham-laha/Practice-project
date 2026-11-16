# TargetJEE Engine — verification evidence and deployment status

Date: **16 November 2026**. Source quality, local services, real-host transport and successful live AI generation are separate gates.

## Current result

**Website: https://targetjee-studio.vercel.app**

**New API: https://targetjee-studio-api.onrender.com**

The owner merged PR #4 and manually deployed the corrected backend as `main` merge **`0a8022f3190c4f69cbe11bbd8c80cd9b1fb9b7ff`**. **Provider-free deployed gates now PASS:** both complete six-item symbolic-validation batches, all **16** real-host browser/integration cases and two-service public HTTP smoke. The dedicated Vercel frontend remains connected with coherent CSP/upload discovery. GitHub **About → Website** is correct, intentionally not duplicated in README. **No further hosting action is needed for this correction.**

**`ALL_GATES_PASS = false` remains the full-product result solely because successful live Gemini extraction/coach acceptance is untested.** No authorized real key or provider spend was used. The old deployed validation timeout is now cleared by real public tests, but keyless/malformed-key checks and mocked coach UI responses must not be presented as successful AI generation.

### Release identities

| Resource                      | Verified identity / state                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository / default branch   | `soham-laha/Practice-project` / `main`; PRs #1–#4 merged, latest merge `0a8022f3190c4f69cbe11bbd8c80cd9b1fb9b7ff`                                                                         |
| Active follow-through branch  | `arena/87a6e186-practice-project`, based on merged `0a8022f`; post-deployment evidence and verification-only maintenance                                                                  |
| Dedicated Vercel project      | `targetjee-studio` / `prj_KFXNcBKpCvyPcT5VJFU6f7gH07I2`; not the older product                                                                                                            |
| Connected production frontend | **READY / PROMOTED**, `dpl_5StVSw6YN4zin3oY83XxWpXvpS89`, application commit `6a0f4ce`, Node 26                                                                                           |
| Frontend API configuration    | Production-only server-side `TARGETJEE_API_BASE_URL=https://targetjee-studio-api.onrender.com`; configured **before** rebuilding, so CSP and runtime discovery agree                      |
| New Render service            | Owner screenshot: existing `targetjee-studio-api`, Free/Docker, manual `main` merge `0a8022f`, Live; health and all 12 reference certificates independently verified over HTTPS           |
| Corrected backend source      | `416ddaa62a260e18126af60b96ff1237fa4f833d`, merged via [PR #4](https://github.com/soham-laha/Practice-project/pull/4) as `0a8022f` and now deployed; no additional Render deploy required |

The frontend deployment was created at merged commit `6a0f4ce` from the then-active Arena branch. It remains on that revision because PR #4 changed backend execution, tests and documentation, not the frontend application. The backend is now on merged `0a8022f`. Later verification/documentation commits do not imply a new host revision; Render's Blueprint deliberately disables source-push automatic deployment. No provider key was added to either host.

The older TargetJEE repository, older `targetjee-engine` Vercel project and older Railway backend were not reused, substituted or changed. No history rewrite, force push, branch deletion or license change was performed.

## Actual public-host results

Verified full public run: **[43821911026](https://github.com/soham-laha/Practice-project/actions/runs/43821911026): SUCCESS**, 07:10–07:12 UTC. Workflow/test source and deployed backend: `0a8022f`; connected frontend: `6a0f4ce`. Both real public origins were explicitly supplied.

| Gate                                       | Actual result and limits                                                                                                                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public frontend HTTP / notices             | **PASS:** all six learner pages returned real app HTML, expected security headers and byte-identical original Manrope/Newsreader OFL notices, without a Vercel login page                                                                                                       |
| Backend health                             | **PASS:** HTTP 200 and exact `status: ok`, `service: targetjee-engine`, `schema: targetjee.item.v2`, `persistence: none`; `Cache-Control: no-store`                                                                                                                             |
| Main / Advanced public references          | **PASS:** six items per exam from the new Render API; exam identity checked by the real-host smoke                                                                                                                                                                              |
| Both model names / both proxy routes       | **PASS:** `gemini-flash-latest` and `gemini-flash-lite-latest`, extraction and coach, returned the expected 401 without a key; no provider request was spent                                                                                                                    |
| Write origin rejection                     | **PASS:** foreign, `null` and malformed frontend write origins rejected with 403                                                                                                                                                                                                |
| Exact multipart preflight                  | **PASS:** allowed public frontend receives its exact origin, POST and `X-Gemini-Api-Key` support, with no credential allowance; foreign preflight receives 400 and no allowed-origin header                                                                                     |
| CSP / upload discovery                     | **PASS:** `/api/engine/upload-target` returns the fixed new API upload URL; the forge page permits only self plus that API in `connect-src`                                                                                                                                     |
| Real 20 MiB browser transport              | **PASS, transport only:** browser sent a synthetic 20 × 1024 × 1024-byte multipart file through actual CSP, preflight and hosting/body parsing, receiving the expected malformed-key 401. This is **not** valid-image/PDF decoding, OCR or successful Gemini extraction         |
| Hosted reference workflows / accessibility | **PASS:** all 13 existing cases, including 375/768/1440px × three themes, both exam workflows, reload/order locking, local backup/reset/import, recovery/flashcard/redemption, learner isolation, key removal and grace. AI coach transport in the UI case is explicitly mocked |
| Live six-item symbolic batches             | **PASS:** HTTP 200 for Main and Advanced, six results each, all **12** certificates valid. Complete batches were retained; the assertions were not weakened or split into smaller requests                                                                                      |
| Two-service public HTTP smoke              | **PASS:** six frontend routes, new backend health, both six-item reference endpoints and both extraction-model keyless guards. Executed with both actual origins; smoke itself does not validate algebra or call Gemini                                                         |
| Overall hosted job                         | **PASS:** all **16** browser/integration cases, no skips, about 1.7 minutes for the browser step; full job 2m7s, including the independent public HTTP smoke                                                                                                                    |
| Successful real Gemini extraction / coach  | **UNTESTED:** no user-authorized real key or provider spend; current model/account availability and successful text/image/PDF generation remain unverified                                                                                                                      |

The previous [43819106011](https://github.com/soham-laha/Practice-project/actions/runs/43819106011) really failed Advanced validation on old backend `6a0f4ce`, while [43818327991](https://github.com/soham-laha/Practice-project/actions/runs/43818327991) observed Main timeout. Those failures remain historical evidence; only the new run against corrected backend `0a8022f` clears that gate.

The public browser keeps web security enabled, uses cookie-free requests and rejects redirects. The intentionally malformed upload key is rejected before document decoding or any provider call. Its synthetic file is not advertised as an accepted textbook source.

The first integration attempt [43817537589](https://github.com/soham-laha/Practice-project/actions/runs/43817537589) also failed. Signed log downloads were inaccessible (EOF on a host outside the sandbox's outbound allowlist); Playwright's GitHub reporter was added so subsequent **actual assertion details** are readable through Checks. [43817921664](https://github.com/soham-laha/Practice-project/actions/runs/43817921664) and the later detailed runs exposed the real validation response. This report does not pretend the unavailable log archives were read.

## The screenshot's red check is now green

Main push run **[43821189854](https://github.com/soham-laha/Practice-project/actions/runs/43821189854)** first ran at 07:04:25–07:05:07 UTC and failed its public-page/backend-availability step; the browser/API/smoke steps were skipped. The owner's Render screenshot shows deployment completion at about 07:05:24 UTC, after that first attempt ended. Accessible metadata does not establish the precise first-attempt error text, so a specific error is not invented.

**Attempt 2 now PASSES without changing application source**, 07:10:25–07:12:40 UTC. It has no backend input: 13 reference-browser cases passed, 3 public-only cases and full smoke explicitly skipped. Main's Node 22/26 + Python 3.12 source-quality checks also pass. The separate **16-case run with both origins** above—not the reference-only rerun—is the API/validation/20 MiB acceptance evidence.

The original audit used a 20-second request budget for both static pages and keyless API probes, shorter than Render Free's documented 50s+ cold-start warning. Current verification-only maintenance keeps page probes at 20 seconds but allows **120 seconds for keyless auth probes**, outlasting the proxy's bounded 110-second upstream wait. Six new unit cases verify both model budgets, zero provider credentials, explicit unconfigured-vs-unavailable handling, no retry/status weakening, target rejection before network and timeout propagation. This makes the audit cold-start-aware; it does not change application deadlines, mask failed checks or establish that a particular cold start was the cause of the earlier failure.

## Deployed correction and remaining provider acceptance

Source `416ddaa`, now deployed within merge `0a8022f`, retains the disposable fail-closed SymPy worker and every expression/domain/equivalence check. It changes **only the wall allowance from 8 to 30 seconds**, retaining **6 CPU seconds, 512 MiB address space**, a minimal secret-free environment and two-slot admission. This accommodates bounded scheduler delay, not extra CPU or looser algebra; requests and environment variables cannot raise the constants. Both complete real-host reference batches now pass.

Provider calls have a **75-second total async deadline**, reserving verification time within the frontend's 110-second upstream deadline on a running service. Six backend regressions cover fixed budgets, actual worker resource-limit installation, minimal environment, fail-closed timeout/resource failures and cancellation of a mocked slow provider without key leakage. Host cold starts/contention may still cause safe failures; a free-tier or provider latency guarantee is not claimed.

**Hosting follow-through is complete.** PR #4 is merged, the existing Render service is manually deployed and independently verified, and another frontend rebuild was unnecessary because its application code/origin/API contract did not change. The already-provided URL is correct. Current maintenance is limited to audit scripts/tests and documents; merging it requires no hosting deployment.

The remaining full-product gate is an owner-authorized browser BYOK check: small non-sensitive text extraction and coaching, each supported model and supported file type, and removal of the local key afterward. Provider usage may incur charges. Never send the key in chat or put it in a workflow, deployment variable, URL, body, log or artifact. Do not claim successful OCR or a 20 MiB generated result from a synthetic malformed-key upload.

[DEPLOYMENT.md](DEPLOYMENT.md) records the completed live inventory, future update process, cold-start limits and separate live-provider checklist. No duplicate service, paid upgrade or repeat Blueprint setup is needed.

## Post-merge source quality evidence

Merged `0a8022f` passed the complete Node **22/26** + Python **3.12** matrix in main run **[43821189916](https://github.com/soham-laha/Practice-project/actions/runs/43821189916)** and active-branch run **[43821911595](https://github.com/soham-laha/Practice-project/actions/runs/43821911595)**, with **66 backend / 62 frontend tests** at that commit. The six additional audit-only unit cases bring the maintenance frontend total to **68**; application/backend files are unchanged by that maintenance.

Earlier corrected-source evidence: **[43819106235](https://github.com/soham-laha/Practice-project/actions/runs/43819106235): SUCCESS**, source `416ddaa`, Node **22 and 26** with Python **3.12**. Both jobs passed static/build, **66 backend / 62 frontend tests**, dependency/design audits, production-mode local services, **13 browser cases with 3 public-only cases explicitly skipped**, and local HTTP smoke. The Node 22 job additionally passed the root-context Python 3.12 Docker enforcement gate:

- Non-root user and root MIT notice present in the image.
- Read-only filesystem, 512 MiB container memory limit and bounded process count.
- Production HTTPS enforcement, private credential-free GET-health exception and API cleartext rejection.
- Both six-item reference sets and all **12 symbolic validations** through trusted-proxy requests.

This source/container evidence is now complemented by the passing public run against the deployed correction. Verification-script/documentation commits are tracked in [Quality & privacy gates](https://github.com/soham-laha/Practice-project/actions/workflows/quality.yml); a maintenance commit is not passed off as a new frontend/backend deployment.

### Current maintenance and previous local application gates

Current local runtime: Node **22.22.3**, npm **10.9.8**. This post-deployment maintenance actually reruns `npm ci`, zero-warning ESLint, TypeScript, **68 frontend tests in 10 files**, Prettier, the design/source-secret audit and `git diff --check`. Its new transport fixtures never use a real provider key, never contact a public host and cannot append simulated results to the real CI summary.

The prior full local application run on corrected source `416ddaa` passed **66 backend tests with warnings as errors**, a fresh Next 16.4.6 webpack production build, Ruff lint/format, **13 production-mode browser cases / 3 public-only skips**, local two-service smoke, npm audit **0 vulnerabilities** and `pip check`. Those are historical local results, not relabelled as new runs in this maintenance or as public evidence. Its local Python was **3.11.2**, while the actual remote matrix/container exercises **3.12**. `pip check` verifies dependency consistency, not Python CVEs.

The design audit checks 11 semantic contrast pairs per theme (Light/Dark AA, High Contrast AAA), palette/font restrictions, breakpoints, reduced motion and source secrets. High Contrast is covered with axe's explicit `color-contrast-enhanced` rule in the browser states above, not certified for every AAA criterion or generated message. Original upstream notice bytes and root MIT/history are unchanged; README contains no literal public frontend URL.

Screenshots and Playwright reports/traces are ignored generated artifacts; CI retains browser evidence and service/container logs for seven days, not in Git. Successful local/source checks, actual public tests and live-provider acceptance remain separately labelled.

## Historical CI investigation and evidence

The earlier main run [43806474705](https://github.com/soham-laha/Practice-project/actions/runs/43806474705) passed install/static/build/equations/design, then failed readiness. The old `wait-on http://…/health` probe sent HEAD to FastAPI's GET-only route: **GET 200 / HEAD 405** was reproduced locally. Browser/smoke steps were skipped, not passed. The correction uses explicit `http-get://`, an actual installed-CLI regression, preserved logs, SHA-pinned Node 24-runtime actions, Ubuntu 24.04 and Node 22/26 + Python 3.12.

- Source `4a88bd4`: push [43809999805](https://github.com/soham-laha/Practice-project/actions/runs/43809999805) and PR [43810056859](https://github.com/soham-laha/Practice-project/actions/runs/43810056859) **SUCCESS** in both runtimes; then **57 backend / 48 frontend tests**, 13 local browser cases and two-service local smoke.
- Source `27ba630`: [43811077096](https://github.com/soham-laha/Practice-project/actions/runs/43811077096) and [43811082165](https://github.com/soham-laha/Practice-project/actions/runs/43811082165) **SUCCESS**, then **57 backend / 62 frontend tests**, plus the non-root/read-only 512 MiB container gate.
- Historical public frontend [43811077150](https://github.com/soham-laha/Practice-project/actions/runs/43811077150) **SUCCESS** against deployed `4a88bd4`: six pages, security/font bytes and 13 browser cases. No backend input was supplied, so its two-service smoke was **skipped**, not passed.
- Source `2731d89`: [43811946178](https://github.com/soham-laha/Practice-project/actions/runs/43811946178) and [43811939030](https://github.com/soham-laha/Practice-project/actions/runs/43811939030) **SUCCESS**, then **60 backend / 62 frontend tests**; only non-sensitive GET `/health` exempted from production TLS for internal hosting probes. Main merge `db279b7` runs [43812859678](https://github.com/soham-laha/Practice-project/actions/runs/43812859678) and [43812859663](https://github.com/soham-laha/Practice-project/actions/runs/43812859663) also succeeded.
- Follow-through source `9bdd2dc`: [43818328981](https://github.com/soham-laha/Practice-project/actions/runs/43818328981) **SUCCESS**, both runtime jobs, before the wall-budget correction. Public-host verification still exposed the separate old-backend timeout; local/source success did not conceal it.

## Reproducibility and product limits

- Vercel's documented [4.5 MB function request-body limit](https://vercel.com/docs/functions/limitations#request-body-size) also applies to container functions. Large files therefore use the fixed HTTPS Render endpoint, not an unchanged backend silently moved into a capped function or an unapproved central upload bucket.
- Linux Chromium/libraries come from npm, without disabling web security. Learner history remains only in the browser; no login or central learner database is required. Profiles/origins are independent; localStorage BYOK is not encrypted.
- Both supported models have mocked provider-contract/error coverage. No test here proves real account access, live model availability, arbitrary OCR/diagram interpretation or successful generation at the maximum file size.
- SymPy verifies bounded expression/certificate/domain/unit consistency, **not** general physics/prose correctness or a source diagram's meaning. Item parameters and SATO/tier thresholds are illustrative heuristics, not population calibration, causal learning gain, a rank predictor or a mastery certificate.
- Main marking is +4/−1. Advanced reference uses single-correct +4/−2; generated items may use +4/−1 or +4/−2. Every variable multi-correct/partial-credit paper format is not implemented.
- All six source PDF pages are mapped in `SYSTEM_ARCHITECTURE.md`. Four literal design-template fields were unspecified; research-backed defaults are documented, not misrepresented as supplied artwork.
- Application log avoidance cannot control a host's APM/proxy capture. Trusted TLS termination, forwarded headers, edge quotas and host process/memory limits remain operator responsibilities. No paid upgrade was enabled.
- Root MIT is unchanged. `THIRD_PARTY_NOTICES.md` and preserved upstream notices are a technical inventory, **not** legal clearance or a claim that all dependencies are MIT. Attribution is not ownership or repository access.
