# TargetJEE Engine — final local audit and deployment blockers

Date: **16 November 2026**. This is an evidence record, not a claim of public deployment or complete production acceptance.

**Publication follow-up:** after this local audit, the user explicitly authorized committing and publishing the implementation to `soham-laha/Practice-project`. That instruction replaces the earlier new-repository-only requirement for this repository. Publication uses only `arena/051ee326-practice-project`, with a pull request for `main`; the older TargetJEE repository/deployment remains out of scope. The local results below remain valid, while post-publication CI status must be read from GitHub Actions.

## Result

**The implemented application passes the local gates below. Overall requested acceptance remains incomplete: `ALL_GATES_PASS = false`.** The original new-repository creation attempt was denied; the latest instruction authorizes the existing Practice-project repository instead. Public hosting, remote CI, Python 3.12 execution and live Gemini requests were not verified by this local audit. Local backend execution used Python 3.11.2; a Python 3.12 Dockerfile and CI configuration are supplied, not represented as executed evidence.

The current production-mode build is running in Arena's **TargetJEE Engine** preview on port 3000 with **TargetJEE API** on port 8000. These workspace previews are **not the requested public production deployments**.

## Final local gate results

| Gate                                                                | Result                      | Evidence                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reproducible JavaScript install                                     | PASS                        | `npm ci` succeeded without peer warnings after updating the test/lint stack; `npm ls --all` reports no invalid dependencies.                                                                                                                                               |
| ESLint / TypeScript / production build                              | PASS                        | `npm run lint` (zero warnings), `npm run typecheck`, `NEXT_TELEMETRY_DISABLED=1 npm run build`; Next.js 16.4.6 compiled and prerendered all six learner routes.                                                                                                            |
| Python lint / formatting / frontend formatting                      | PASS                        | Ruff check and format check on `backend`; `npx prettier --check .`. No lint-rule suppressions were added to hide findings.                                                                                                                                                 |
| Backend equations, symbolic guardrails, HTTP and provider contracts | **57 passed**               | `.venv/bin/python -m pytest backend/tests -q -W error`; warnings are errors. Every reference item is checked, equivalent options are rejected, canonical display strings are checked, both model transports are mocked and provider errors are sanitized.                  |
| Frontend equations, contracts, rendering, storage and transport     | **44 passed**               | `npm test`, six Vitest files; exact equation cases, pacing, recovery distinction, malformed imports, DB failover/migration, origin checks, fixed HTTPS upload discovery, CSP and safe KaTeX rendering.                                                                     |
| Research / palette / typography / semantic contrast                 | PASS                        | `npm run audit:design`; exactly three palettes, 11 text/surface pairs each; Light/Dark meet AA and High Contrast meets AAA text ratios. Required research/defaults, breakpoints, motion preferences and source-secret patterns checked.                                    |
| Real-browser matrix and local workflows                             | **13 passed (2.4 minutes)** | `npm run test:e2e`; 375 / 768 / 1440px × Light / Dark / High Contrast, six routes per matrix case, active simulator and populated Deep analysis. No document overflow or uncaught page errors.                                                                             |
| Enhanced High Contrast text audit                                   | PASS in tested states       | Explicit axe `color-contrast-enhanced` rule on all six routes at all three widths, in addition to WCAG-tagged checks. This is **not a certification of full WCAG AAA conformance**, every possible generated message, or all assistive technologies.                       |
| Main and Advanced reference workflows                               | PASS                        | Main NTA completes all six answers and survives export → confirmed reset → import → reload. Advanced Diagnostic Practice verifies locked order/reload, flags, certainty, submission, wrong-pivot review, timed recovery, flashcard and an isolated second browser context. |
| BYOK privacy and removal                                            | PASS in local/mocked tests  | Exact localStorage namespace, header-only transport, no key in URL/body/export/log evidence, provider error sanitization, Escape-capable native dialog, immediate removal. No real key was requested or spent.                                                             |
| Grace behavior                                                      | PASS                        | Browser expiry flow appends an event and preserves answer selection. Contracts require unique event IDs, valid timestamps and totals matching each attempt; caps are enforced.                                                                                             |
| CORS / MIME / size / decode guardrails                              | PASS locally                | Backend tests allow only the configured origin and reject other origins, unsupported/mismatched files, malformed PDF/image data and oversized/empty uploads. Request body cap, memory spooling and worker limits are implemented.                                          |
| Dependency checks                                                   | PASS                        | Full `npm audit --audit-level=low` reports **0 vulnerabilities**, including development dependencies. `pip check` reports no broken requirements; it is a dependency-consistency check, **not a Python CVE audit**.                                                        |
| Local HTTP smoke                                                    | PASS                        | `npm run smoke`: six frontend routes, backend `/health`, six items in each exam mode, both model names requiring a request key (expected 401). Additional HTTP assertions verify upload discovery, local self-only CSP and cross-origin proxy rejection.                   |
| Source hygiene / branch safety                                      | PASS                        | `git diff --check`; generated output, environments, secrets and screenshots ignored. Work remains on `arena/051ee326-practice-project`. No branch switch, force push or history replacement. Subsequent publication to this repository is explicitly user-authorized.      |

Screenshots from the final browser run are in ignored `artifacts/overview-{width}-{theme}.png`; Playwright reports/traces are also ignored. They are reproducible test output, not large committed assets.

### Commands used after the final application corrections

```bash
npm run lint
npm run typecheck
.venv/bin/ruff check backend
.venv/bin/ruff format --check backend
npx prettier --check .
NEXT_TELEMETRY_DISABLED=1 npm run build
.venv/bin/python -m pytest backend/tests -q -W error
npm test
npm run audit:design
npm audit --audit-level=low
.venv/bin/pip check
# Services restarted on the rebuilt code before browser/HTTP verification:
npm run test:e2e
npm run smoke
git diff --check
```

## External and environment gates — not passed

| Gate                                   | Actual result / blocker                                                                                                                                                                                                                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand-new GitHub repository            | `gh repo create soham-laha/TargetJEE-Studio --public ...` was denied: `GraphQL: Resource not accessible by integration (createRepository)`. No new repository was created. The latest user instruction instead authorizes publication to `soham-laha/Practice-project`; the unrelated older `TargetJEE` product remains untouched. |
| Public frontend                        | A **new, isolated** Vercel project `targetjee-studio` (`prj_KFXNcBKpCvyPcT5VJFU6f7gH07I2`) was created. **No deployment or live production URL** was produced. The older `targetjee-engine` project was untouched.                                                                                                                 |
| Public backend / health URL            | No authorized Render/Railway deployment path was available. Deployment manifests and a non-root Python 3.12 Dockerfile are provided, but were not deployed or container-built here.                                                                                                                                                |
| Remote CI / clean new remote           | At the local audit snapshot, the workflow had not run remotely. Publication is now authorized; consult GitHub Actions for current remote results rather than treating local tests as CI evidence. The fixed Arena branch cannot be renamed or switched to `main`.                                                                  |
| Python 3.12 execution                  | Sandbox Python is 3.11.2. Standalone 3.12 download attempts via uv and GitHub release download failed with TLS/EOF at the release-asset download host. The passing backend results above must not be relabeled as 3.12 results.                                                                                                    |
| Live Gemini extraction / coach         | Provider connectivity and a user-authorized real key were unavailable. Both runtime model names, request-scoped headers, structured response/error handling and symbolic post-validation are covered with mocked transport only.                                                                                                   |
| Public 20 MB upload / CORS integration | A fixed direct-to-HTTPS-API upload path and upload-aware CSP are implemented and unit-tested to avoid frontend-function body caps. A real cross-origin upload through production hosting remains unverified.                                                                                                                       |
| Production smoke                       | No actual new frontend/backend production URLs exist. Local 200s and mocked provider calls do not satisfy this gate.                                                                                                                                                                                                               |

## Environment and reproducibility

- Node **22.22.3**, npm 10.9.8; lockfile resolves Next.js 16.4.6, Vitest 5.1.0, ESLint 10.15.0 and KaTeX 0.19.1.
- Python **3.11.2** locally, **3.12 target** in Docker/CI. FastAPI/Pydantic/SymPy and dev requirements are pinned.
- The supported ESLint 10 core, TypeScript, Next and hooks plugins are configured directly. The older aggregate preset pulled plugins with incompatible peer ranges; it was not retained with ignored peer warnings.
- A targeted transitive minimatch override resolves the audited advisory. The full dependency graph and npm audit both pass.
- Backend tests use `httpx2` for the Starlette test client; provider requests use a separate request-scoped `httpx.AsyncClient`.
- Linux Chromium and its libraries come from the npm-packaged distribution. The browser helper does not disable web security to make tests pass.
- `.gitignore` and `.dockerignore` exclude environments, credentials, caches and generated artifacts from source/container context as appropriate.

## Self-correction record

The audit was restarted from static checks/build after application fixes, followed by equations/contracts, design checks and fresh production-mode browser/HTTP runs.

1. Corrected real ESLint findings, the Newsreader italic stylesheet import and middleware request-body replay; did not suppress the findings.
2. Tightened all seed calculation certificates and one collision distractor's special-case trace. Tests verify every reference item.
3. Fixed mobile accessible names, low-contrast decorative/hero labels and keyboard access to overflowing equations. Broadened browser cases to active and populated states rather than checking only setup screens.
4. Fixed direct-start query consumption and timer/submission races so reloading does not restart or reshuffle a drill and saving does not resurrect its active record.
5. Upgraded vulnerable KaTeX and test/lint dependencies; confirmed the full dependency audit is clear, not merely the production subset.
6. Added safe rendering for link/image/HTML/custom-colour commands; parse-error text inherits theme contrast. Canonical option LaTeX comes from checked algebra, not an unchecked model display string.
7. Separated completed recovery evidence (`recoveryAt`) from self-rated flashcard recall. Corrected card/recovery/progress counts; self-rating cannot claim a verified recovery.
8. Hardened timestamp, switch-ID, unique-session and grace-ledger import checks. Non-diagnostic confidence is rejected and never included in calibration. Grace is append-only in app logic and bounded to 100 events per drill.
9. Prevented multipart temporary-file spooling inside the bounded request and stripped inherited secrets from the symbolic worker's environment.
10. Corrected IndexedDB failover so the latest fallback is not silently replaced by an older DB snapshot; successful saves migrate it back and remove the fallback.
11. Rejected malformed provider JSON roots, duplicate IDs and mismatched exams. Sanitized all provider transport errors, including protocol failures, and verified both runtime model names with header-only mocked transport.
12. Safely rejected malformed/foreign proxy origins. Added fixed HTTPS file-upload discovery, omitted cookies/redirects and matched CSP to only that configured upload origin. Tests caught and corrected omitted transport options before the final rebuild.
13. Added actual Main NTA export/reset/import/reload coverage alongside the Advanced diagnostic/repair flow. The final extended browser suite passes all 13 cases.

## Specification and verification limits

- The four literal custom design fields were unfilled placeholders. `DESIGN_RESEARCH.md` documents intentional defaults rather than claiming exact compliance with absent designs.
- All six PDF pages were read and mapped in `SYSTEM_ARCHITECTURE.md`. Behavioral confidence inference and rank-like claims were intentionally replaced by explicit self-reports and provisional estimates.
- SymPy checks supplied expression/certificate consistency, declared domains and unit vectors. It does **not** prove arbitrary OCR, diagram interpretation or natural-language physical correctness. Model/seed parameters are not population-calibrated. No rank, causal score gain or certified mastery is promised.
- Reference and generated drills implement single-correct +4/−1 or +4/−2 items, not every variable Advanced multi-correct/partial-credit section.
- Keys in localStorage are not encrypted. App-level log avoidance does not control an infrastructure owner's APM/proxy capture. Production edge quotas, trusted TLS termination and host memory limits are still operator responsibilities.
- Native dialog keyboard behavior and automated axe checks are useful evidence, not a substitute for a complete manual assistive-technology audit or learner study.

## Requirements for completing deployment

1. Publish to the user-authorized `soham-laha/Practice-project` repository using only the fixed session branch and a pull request for `main`. A separate new-repository request would still require creation authorization. Never request/paste credentials into chat, force-push history or overwrite the older TargetJEE product.
2. Authorize a new backend service, build `backend/Dockerfile` from the root, configure exact HTTPS frontend CORS origins, require HTTPS behind the trusted proxy and verify public `/health`.
3. Set `TARGETJEE_API_BASE_URL` on the **new** Vercel project **before build/deploy**, so CSP and upload discovery agree. Complete its authorized first-deployment flow; the connected tool's first-deploy settings limitations must not be bypassed with invented source/settings values.
4. Execute the supplied CI under Python 3.12. Run the real-host smoke using `SMOKE_FRONTEND_URL` and `SMOKE_BACKEND_URL`; verify both exam flows, persistence and an actual production upload.
5. Live-test Gemini only with an authorized key through the BYOK UI, never a hardcoded/server-wide key. Record real URLs and remote test results here. Until those gates pass, **overall completion remains blocked**.
