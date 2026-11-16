# TargetJEE Engine — verification evidence and deployment status

Date: **16 November 2026**. Source quality, local services, real-host transport and successful live AI generation are separate gates.

## Current result

**Website: https://targetjee-studio.vercel.app**

**New API: https://targetjee-studio-api.onrender.com**

The owner has provisioned the new Render service. The dedicated Vercel frontend is rebuilt and connected to it; GitHub **About → Website** also has the correct public address, intentionally not repeated in README. Public health, both reference endpoints, proxy key gates, exact CORS/CSP, the 13 existing hosted browser workflows, 20 MiB browser transport and the two-service HTTP smoke have passed within the scopes below.

**`ALL_GATES_PASS = false`.** Live reference-batch validation exposed the backend's old 8-second wall deadline on Render Free. Corrected source is tested but **not yet deployed to Render**. No authorized real Gemini extraction/coach request has been made. Neither a green source CI run nor a malformed-key upload rejection is full production AI acceptance.

### Release identities

| Resource                      | Verified identity / state                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository / default branch   | `soham-laha/Practice-project` / `main`; PRs #1–#3 merged, latest merge `6a0f4ce4201e4075567e82845a0a3b4f1d04a355`                                                    |
| Active follow-through branch  | `arena/5908bb7a-practice-project`; [PR #4](https://github.com/soham-laha/Practice-project/pull/4)                                                                    |
| Dedicated Vercel project      | `targetjee-studio` / `prj_KFXNcBKpCvyPcT5VJFU6f7gH07I2`; not the older product                                                                                       |
| Connected production frontend | **READY / PROMOTED**, `dpl_5StVSw6YN4zin3oY83XxWpXvpS89`, application commit `6a0f4ce`, Node 26                                                                      |
| Frontend API configuration    | Production-only server-side `TARGETJEE_API_BASE_URL=https://targetjee-studio-api.onrender.com`; configured **before** rebuilding, so CSP and runtime discovery agree |
| New Render service            | Owner screenshot: `targetjee-studio-api`, Free/Docker, `main` commit `6a0f4ce`, Live; public health independently verified                                           |
| Corrected backend source      | `416ddaa62a260e18126af60b96ff1237fa4f833d`; pending merge and **manual deployment of the existing Render service**                                                   |

The frontend deployment was requested from the fixed active Arena branch at the exact merged `main` commit above. No application edits were included in that deployment. Test/documentation commits after it do not imply that either host changed revision. Render's Blueprint deliberately disables source-push automatic deployment. No provider key was added to either host.

The older TargetJEE repository, older `targetjee-engine` Vercel project and older Railway backend were not reused, substituted or changed. No history rewrite, force push, branch deletion or license change was performed.

## Actual public-host results

Latest detailed run: **[43819106011](https://github.com/soham-laha/Practice-project/actions/runs/43819106011)**, workflow/test source `416ddaa`, application on both hosts still `6a0f4ce`.

| Gate                                       | Actual result and limits                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public frontend HTTP / notices             | **PASS:** all six learner pages returned real app HTML, expected security headers and byte-identical original Manrope/Newsreader OFL notices, without a Vercel login page                                                                                                                                                           |
| Backend health                             | **PASS:** HTTP 200 and exact `status: ok`, `service: targetjee-engine`, `schema: targetjee.item.v2`, `persistence: none`; `Cache-Control: no-store`                                                                                                                                                                                 |
| Main / Advanced public references          | **PASS:** six items per exam from the new Render API; exam identity checked by the real-host smoke                                                                                                                                                                                                                                  |
| Both model names / both proxy routes       | **PASS:** `gemini-flash-latest` and `gemini-flash-lite-latest`, extraction and coach, returned the expected 401 without a key; no provider request was spent                                                                                                                                                                        |
| Write origin rejection                     | **PASS:** foreign, `null` and malformed frontend write origins rejected with 403                                                                                                                                                                                                                                                    |
| Exact multipart preflight                  | **PASS:** allowed public frontend receives its exact origin, POST and `X-Gemini-Api-Key` support, with no credential allowance; foreign preflight receives 400 and no allowed-origin header                                                                                                                                         |
| CSP / upload discovery                     | **PASS:** `/api/engine/upload-target` returns the fixed new API upload URL; the forge page permits only self plus that API in `connect-src`                                                                                                                                                                                         |
| Real 20 MiB browser transport              | **PASS, transport only:** browser sent a synthetic 20 × 1024 × 1024-byte multipart file through actual CSP, preflight and hosting/body parsing, receiving the expected malformed-key 401. This is **not** valid-image/PDF decoding, OCR or successful Gemini extraction                                                             |
| Hosted reference workflows / accessibility | **PASS:** all 13 existing cases, including 375/768/1440px × three themes, both exam workflows, reload/order locking, local backup/reset/import, recovery/flashcard/redemption, learner isolation, key removal and grace. AI coach transport in the UI case is explicitly mocked                                                     |
| Live six-item symbolic batches             | **FAIL:** latest run passed Main validation but Advanced returned 422, `Symbolic verification timed out; simplify the problem`. Earlier [43818327991](https://github.com/soham-laha/Practice-project/actions/runs/43818327991), source `9bdd2dc`, observed the same failure for Main. Intermittent success does not clear this gate |
| Two-service public HTTP smoke              | **PASS:** independent step executed despite the browser validation failure; six frontend routes, new backend health, both six-item reference endpoints and both extraction-model keyless guards. This smoke does not validate algebra or call Gemini                                                                                |
| Overall hosted job                         | **FAIL:** 15 browser/integration cases passed, 1 failed, about 2.3 minutes. The failure is retained, not relabelled as success or hidden by validating smaller batches                                                                                                                                                              |
| Successful real Gemini extraction / coach  | **UNTESTED:** no user-authorized real key or provider spend; current model/account availability and successful text/image/PDF generation remain unverified                                                                                                                                                                          |

The public browser keeps web security enabled, uses cookie-free requests and rejects redirects. The intentionally malformed upload key is rejected before document decoding or any provider call. Its synthetic file is not advertised as an accepted textbook source.

The first integration attempt [43817537589](https://github.com/soham-laha/Practice-project/actions/runs/43817537589) also failed. Signed log downloads were inaccessible (EOF on a host outside the sandbox's outbound allowlist); Playwright's GitHub reporter was added so subsequent **actual assertion details** are readable through Checks. [43817921664](https://github.com/soham-laha/Practice-project/actions/runs/43817921664) and the later detailed runs exposed the real validation response. This report does not pretend the unavailable log archives were read.

## Correction and the remaining existing-service step

Source `416ddaa` retains the disposable, fail-closed SymPy worker and all expression/domain/equivalence checks. It changes **only the wall allowance from 8 to 30 seconds**, while retaining **6 CPU seconds, 512 MiB address space**, a minimal secret-free child environment and two-slot admission. This permits bounded scheduler delay on a slow host, not extra CPU or looser algebra. Constants cannot be raised by a request or environment variable. A fresh local worker validates Main/Advanced in about 0.65/0.76 seconds here; those timings are **not** asserted to predict Render performance.

The provider now has a **75-second total async deadline**, rather than relying only on a per-read HTTP timeout. This reserves 30 seconds for verification within the frontend's 110-second upstream deadline on a running service. Six new regressions cover the fixed budgets, actual worker resource-limit installation, minimal environment, timeout/resource fail-closed behavior and cancellation of a slow mocked provider without key leakage. Host cold starts or contention can still cause safe timeouts.

**The correction is not yet proven on Render.** Source CI passes, but the public job still targets the old backend revision. Both facts are recorded separately.

1. Review and merge [PR #4](https://github.com/soham-laha/Practice-project/pull/4).
2. Open the **existing Render `targetjee-studio-api` service → Manual Deploy → Deploy latest commit** from `main`, then wait for **Live**. Do not create a duplicate service or enable a paid tier.
3. Dispatch **Hosted website verification** with the actual frontend and backend origins. Require both six-item validation batches to pass, not just health or reference retrieval.
4. Only then perform owner-authorized browser BYOK extraction/coach checks, including both models and the supported file types, before declaring comprehensive AI acceptance. Never send the key in chat or put it in a workflow, deployment variable, URL, body, log or artifact.

No new backend URL is needed, and this backend-only correction does not require another frontend environment change. [DEPLOYMENT.md](DEPLOYMENT.md) records the live inventory, exact update steps, cold-start limits and future isolated-installation instructions.

## Corrected-source quality evidence

**[43819106235](https://github.com/soham-laha/Practice-project/actions/runs/43819106235): SUCCESS**, source `416ddaa`, Node **22 and 26** with Python **3.12**. Both jobs passed static/build, **66 backend / 62 frontend tests**, dependency/design audits, production-mode local services, **13 browser cases with 3 public-only cases explicitly skipped**, and local HTTP smoke. The Node 22 job additionally passed the root-context Python 3.12 Docker enforcement gate:

- Non-root user and root MIT notice present in the image.
- Read-only filesystem, 512 MiB container memory limit and bounded process count.
- Production HTTPS enforcement, private credential-free GET-health exception and API cleartext rejection.
- Both six-item reference sets and all **12 symbolic validations** through trusted-proxy requests.

This verifies the corrected source/container on GitHub's runtime, not the still-old Render deployment. Documentation-only head changes are tracked by [PR checks](https://github.com/soham-laha/Practice-project/pull/4/checks), not passed off as a new public application deployment.

### Latest local gates

Local runtime: Node **22.22.3**, npm **10.9.8**, Python **3.11.2**. Python 3.12 is genuinely exercised by the remote matrix/container, not relabelled locally.

| Gate                                                                    | Actual local result                                                                                                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reproducible install                                                    | `npm ci`; fresh `.venv` installed from the directly pinned Python requirements                                                                                     |
| Static / build / formatting                                             | ESLint zero warnings, TypeScript, fresh Next 16.4.6 webpack production build of all six routes, Ruff lint/format and Prettier                                      |
| Backend equations / contracts / resource deadlines                      | **66 passed**, `pytest -q -W error`, including the six new deadline/environment/cancellation regressions                                                           |
| Frontend equations / local storage / transport / repository regressions | **62 passed**, 9 Vitest files                                                                                                                                      |
| Palette / research / fonts / contrast                                   | **PASS:** 11 semantic pairs per theme, Light/Dark AA, High Contrast AAA ratios; prohibited-palette, responsive breakpoint, reduced-motion and source-secret checks |
| Fresh local production browser run                                      | **13 passed, 3 public-only cases skipped**, about 3.0 minutes; no claim that the skipped cases tested a public backend                                             |
| Local two-service HTTP smoke                                            | **PASS**, source preview services; explicitly labelled local, not production                                                                                       |
| Dependency checks                                                       | Full npm audit: **0 vulnerabilities** including development dependencies; `pip check`: no broken requirements, **not** a Python CVE audit                          |
| Source hygiene / attribution                                            | `git diff --check`; original upstream notice bytes and root MIT/history retained; README contains no literal public frontend URL                                   |

High Contrast is covered with axe's explicit `color-contrast-enhanced` rule in the tested states, not certified for every WCAG AAA criterion or possible generated message. Screenshots and Playwright HTML reports/traces are ignored generated artifacts; CI retains browser evidence and service/container logs for seven days, not in Git.

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
