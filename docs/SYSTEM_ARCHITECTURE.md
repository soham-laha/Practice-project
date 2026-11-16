# TargetJEE Engine architecture

## Components and trust boundaries

```
Browser (no account) ── same-origin /api/engine/* ── Next.js server proxy
    │                                                  │
    ├─ localStorage: Gemini key + theme/model/exam       │ fixed backend origin
    ├─ IndexedDB: learner history/repair/scheduling      ▼
    └─ local reference items                    Stateless FastAPI (Python 3.12 target)
                                                  ├─ two-slot in-memory admission queue
                                                  ├─ request-scoped Gemini call
                                                  └─ bounded disposable SymPy process
```

Frontend: Next.js App Router, strict TypeScript, React, local Fontsource Manrope/Newsreader, deterministic KaTeX, Lucide, and a decorative lazy-loaded Three.js scene. The production build prerenders every learner-facing route. The Node proxy is the only dynamic Next route. `TARGETJEE_API_BASE_URL` is server-only configuration, never a NEXT_PUBLIC variable. Text/coach requests and local uploads use relative paths, so preview hosting never calls the learner’s localhost. For a configured external HTTPS backend, `GET /api/engine/upload-target` discloses only its fixed public upload URL; production files go directly there with strict origin CORS, no cookies and no redirects. This avoids frontend-function body limits without proxying arbitrary URLs or exposing a secret.

Backend: FastAPI + Pydantic v2 + SymPy, Python **3.12** in Docker and CI. The sandbox may run a different Python minor; the audit report records the tested interpreter. No ORM, account system, central user database, credentials file or analytics service.

## Routes

| Surface                       | Purpose                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                           | Exam selector, bounded 5-second trap, honest progress path, reference/forge entry, BYOK entry, three themes                                            |
| `/simulator`                  | Setup, NTA or opt-in diagnostic mode, locked options, per-question clock, palette, grace, telemetry, save/submit                                       |
| `/dashboard`                  | Actual vs. potential marks, provisional estimates, activity, subjects, selected session, three-depth review, four-step repair, AI coach, data controls |
| `/flashcards`                 | Automatically derived misconception cards, reveal/recall, explicit local 1/3/7/14/30-day scheduling                                                    |
| `/forge`                      | Text/PNG/JPEG/PDF ingestion, mode/model selection, checked prompt preview, drill handoff                                                               |
| `/science`                    | All five equations, assumptions, evidence and limitations                                                                                              |
| `GET /health` (FastAPI)       | Non-sensitive liveness and schema identifier                                                                                                           |
| `GET /v1/reference`           | Six authored seed items per `exam=main` or `exam=advanced`, with request-shuffled option arrays                                                        |
| `POST /v1/extractions`        | JSON text, exam, model; request-scoped key header                                                                                                      |
| `POST /v1/extractions/upload` | Multipart upload; exact MIME + signature + safe decode checks                                                                                          |
| `POST /v1/items/validate`     | Keyless, bounded, fail-closed algebraic certificate validation                                                                                         |
| `POST /v1/coach`              | Context-aware suggestions/follow-ups with the same browser key                                                                                         |

Main uses +4/−1 with benchmark 90–180 seconds. Advanced uses single-correct +4/−2 (reference) or +4/−1 (allowed generated contract), 180–300 seconds. This is **not a full reproduction of every JEE Advanced paper format** (multi-correct/numerical/partial-credit schemes vary). The selected mode sets the generator contract, validation, marking and timing. Option arrays are shuffled once when a session starts, stored, and never reordered during navigation/reload. The key is an immutable option ID, not its displayed position. Offline reference sessions use Web Crypto Fisher–Yates; the backend also shuffles returned arrays. The client locks its own final order so reference drills do not need a running server.

## Data contracts and mathematical safety

`targetjee.item.v2` is enforced in both Pydantic and Zod. Four unique A–D IDs, one key without a trap, three complete misconception traces, one verified recovery per trace, M/L/T unit vectors, declared domain assumptions, diagram anchors, timing and IRT/NRM parameters are required. The backend supplies its Pydantic JSON Schema to Gemini. An invalid/mismatched mode or duplicate item ID must not become a drill.

SymPy never receives arbitrary `sympify` strings. A custom Python AST visitor permits bounded numeric constants, declared symbols, `+ - * / **` with small numeric powers, and a small mathematical function allowlist. Attribute access, subscripts, imports, lambdas, arbitrary calls, unknown symbols and non-real/undefined values are rejected. Expression length, AST count and depth are bounded. Each batch executes in a disposable subprocess with a **30-second wall deadline, unchanged 6-second CPU / 512 MiB address-space limits on Linux**, and a minimal environment (no inherited deployment secrets). Fixed constants live in `backend/app/limits.py`; neither a request nor an environment variable can increase them. The former 8-second wall deadline caused a real reference-batch timeout on Render Free even though the same certificates passed locally and in CI. Extra wall time accommodates scheduling delay, not extra CPU or looser algebra. The owner deployed this correction in `main` merge `0a8022f`; both six-item batches now pass against the real Render host, as recorded in the audit. Checked algebraic expressions generate canonical option LaTeX, so an incorrect model display string cannot override a valid certificate. Public validation has separate two-slot admission. Gemini requests share a two-slot queue; saturated requests return 429, not an unbounded backlog. Provider calls now have a **75-second total async wall deadline**, not just a per-read timeout, reserving time for verification within the frontend's 110-second upstream deadline on a running service. Provider/host cold starts and overload can still produce safe timeouts. Request-scoped keys are never placed in a durable queue, cache or job database.

The verifier checks:

1. Numeric/symbolic distinctness (including `1/sqrt(2)` vs `sqrt(2)/2`). A difference of uncertain identity is rejected, not treated as distinct.
2. The keyed expression against an independently supplied solution certificate.
3. Each option against its derivation certificate.
4. Each recovery answer against its target-expression certificate.
5. Declared assumptions, realness and matching supplied dimensional powers.

**Limits:** certificates still originate with an author or model. Agreement of two generated expressions cannot prove that the textbook was interpreted correctly. Unit vectors are consistency-checked, not automatically inferred from natural-language mechanics. Domain assumptions are enforced symbolically, not exhaustively recovered from prose. The source diagram’s meaning and the exact physical validity of a proposed invalid pivot are not mechanically proven. The UI therefore asks learners to check extracted prompts before starting and never advertises arbitrary uploaded questions as independently solved physical truth. Reference items have authored worked solutions and nontrivial calculation certificates. Model refusal, unreadable scans, invalid JSON, quota errors and failed verification have explicit safe failures; no fallback fabricates success.

## Psychometrics

`lib/psychometrics.ts` and `backend/app/psychometrics.py` mirror:

- Birnbaum 3PL (`D=1.702`), bounded θ∈[−3,3] finite-difference Newton–Raphson MLE with a global coarse search, concavity check, line search and expected-information SE. All-right/all-wrong patterns converge to the corresponding boundary. Empty sets return θ=0 with no SE.
- Bock four-option NRM with max-subtracted softmax.
- Van der Linden log-time speed, **β_log = ln(β_seconds)**, precision α² and conditional SE `1/sqrt(sum α²)`.
- Exact supplied SATO heuristic with λ=.15, δ=.22, nonnegative haste and logarithmic grace penalties. Adjusted θ is not silently clipped.
- Brier and exactly five equal-width ECE bins, including p=1 in the last bin. Only explicit diagnostic self-reports enter calibration. Untagged, unanswered and zero-time observations are omitted as appropriate.

All parameters are marked illustrative (seed) or model-proposed (AI). No sample here establishes population calibration, AIR or percentile. A short/low-information estimate is “Early estimate”; even enough information only produces “Provisional,” never certified accuracy. Actual exam marks stay separate from adjusted estimates and recovery practice.

## Local persistence and pace

- `localStorage['targetjee.byok.gemini.v1']`: **only** the browser key. Never copied to backups, IndexedDB, URLs, prompts, cookies or public variables.
- Other namespaced localStorage keys: theme, selected model, exam, summary index and active session. Keys have explicit version suffixes.
- IndexedDB `targetjee.local.v1`, store `state`, key `learner`: up to 200 completed sessions, repairs, card boxes/due dates and learner confirmations. A localStorage fallback is attempted if IndexedDB is unavailable. That latest fallback takes precedence over an older DB snapshot and is removed after successful migration back to IndexedDB. A save failure is shown rather than claiming a durable submission. Completed recovery checks have a separate `recoveryAt`; card self-ratings never manufacture recovery completion.
- sessionStorage handoff `targetjee.forged.v1`: newly forged item batch, no key or raw binary source. Unfinished drills are locally resumable; starting a new drill replaces the current unfinished drill.
- JSON import is size-bounded (10 MB) and deeply Zod-validated, rejects unknown fields/keys, validates timestamps, unique session IDs, item/attempt references and grace-ledger totals, rejects confidence in non-diagnostic sessions, and replaces history only on an explicit file selection. Export excludes all preferences/secrets. Reset is explicitly confirmed in a keyboard-operable dialog and clears history, fallback, current drill, key and preferences.
- Browser profiles/origins are independent. People sharing one browser profile share that local workspace; there is deliberately no claim of multi-account isolation on the same profile. Clearing browser data loses progress unless exported. Local storage is not encryption.
- Tier multipliers: 1.60, 1.30, 1.00, .80. Three consecutive completed drills must have all answers within each tier’s allowed time, no grace events and ≥70% of available marks. A nonqualifying drill resets the streak, not the tier. Promotions cap at tier 3.
- Grace adds 60 or 120 seconds, capped at 60 minutes per question and 100 events per session. Each event is a new ID + UTC timestamp + item ID + seconds, appended and retained. “Immutable” means append-only in application logic, **not tamper-proof against a device owner**.
- Elapsed time includes away-tab/wall time, not inferred concentration. Option selections, switches, dwell times and flag changes are locally recorded. Timing labels have disclosed thresholds and optional learner confirmation. They are not claims of motivation or cognitive state.

## Privacy, security and operations

Keys travel from browser → same-origin Next proxy (or fixed HTTPS upload endpoint) → FastAPI → Google as a request header (`X-Gemini-Api-Key`, upstream `x-goog-api-key`), never as a query parameter. Production transport is HTTPS. Provider terms apply; a free tier is not a guarantee of perpetual free usage or unlimited quota. Stored keys are readable by any script with same-origin access, so no third-party scripts/trackers are loaded. KaTeX disables trusted commands; link/HTML/image/custom-colour commands are escaped, and parse-error text inherits the theme contrast. CSP connections are restricted to self plus the configured HTTPS upload origin; Next inline hydration and KaTeX inline styles require inline allowances, and a future nonce-based CSP would harden it further. Configure the backend URL before building/redeploying so the generated CSP and runtime upload discovery agree. The app must not be used on an untrusted shared device with a saved key.

FastAPI CORS accepts only explicit configured frontend origins. Never use `*`. The Node proxy rejects cross-origin writes, exposes only an endpoint allowlist, rejects non-HTTPS external production upstreams, blocks redirects and forwards no arbitrary caller URL. When HTTPS enforcement is enabled, only the non-sensitive **GET `/health`** liveness endpoint may receive an internal plain-HTTP host probe; API routes and all POSTs still require native HTTPS or the trusted TLS proxy's HTTPS indication. Validation responses omit raw Pydantic `input`, so malformed payloads do not echo secrets. No request bodies/headers/provider error bodies are logged; Uvicorn access logging is disabled in the supplied entrypoint. Infrastructure owners still need to disable body/header capture in their own APM/proxies.

Request streams are bounded (21 MB including multipart overhead); actual files are nonempty PNG/JPEG/PDF ≤20 MB. MIME is checked against magic bytes and actual safe decode. Images ≤25 MP; PDFs unencrypted and ≤30 pages. Multipart spooling stays in memory within the bounded request size. Source bytes remain request-scoped memory, not disk storage. Provider calls time out; symbolic failures are contained. These checks limit but do not eliminate denial-of-service risk: production hosting should apply per-IP edge quotas and process/memory limits. No paid external rate-limit store is required for the reference workflow.

## Deployment

- `backend/Dockerfile`: Python 3.12, non-root runtime, port from host, no access logs. Build from repository root so `data/` is included.
- `render.yaml` and `backend/railway.toml`: deployment manifests. Set exact HTTPS frontend origin and require HTTPS at a trusted terminating proxy. Railway is usage-metered; Render availability/cold starts depend on the current plan. Neither is promised unconditionally zero-cost.
- Vercel: framework Next.js; `npm ci` / `npm run build`; Node 22.12 or newer; server-only `TARGETJEE_API_BASE_URL=https://<your-new-api-host>`.
- The latest user instruction authorizes publishing to `soham-laha/Practice-project` on the current Arena session branch, with a pull request for `main`. Never reuse the older `TargetJEE` repository or `targetjee-engine` Vercel project for this build. The active Arena branch is fixed; this session cannot replace history or push directly to `main`.
- Actual remote creation/deployment results and missing permissions belong in `docs/AUDIT_REPORT.md`, not fabricated live links.

## Verification and PDF traceability

The supplied 6-page _TargetJEE Engine Architecture and Psychometric Overview_ was read in full. Pages 1–2 map to forge, schema/diagram anchors, bounded queue, simulator, adaptive pace, grace, three review depths, four-step replay, flashes and BYOK. Pages 3–4 are comparative product positioning, not additional integrations or benchmarks, and do not justify copying competitor claims. Pages 5–6 map to both equation modules and tests. The summary’s procedural Three.js visual is implemented as a tiny decorative orbit, lazy-loaded, accessible without WebGL and hidden under reduced motion. Proposed behavioral confidence inference and rank-like descriptions in the PDF are intentionally replaced with explicit self-reports and honest provisional labels.

`quality.yml` runs zero-warning ESLint, TypeScript, Ruff, format checks, production build, backend pytest, frontend Vitest, npm dependency audit, design/secret scans and headless Playwright/axe at 375/768/1440px in all themes (explicit enhanced-contrast rule for High Contrast), full local Main/Advanced drill/repair/BYOK/export/reset/import/isolation flows and HTTP smoke. The corrected workflow has passed remotely with Node 22/26 and Python 3.12, including all browser/HTTP gates. It also builds and exercises the root-context, non-root backend container on Node 22; the production-mode container check enables HTTPS enforcement while accepting only the internal GET liveness probe without TLS. `hosted.yml` separately checks the deployed public reference frontend and labels mocked AI transport/incomplete backend acceptance explicitly. Consult the audit's exact run links and current PR checks. Full two-service production smoke is separate because passing local tests or hosted reference-only tests cannot prove a deployed backend. Real Gemini end-to-end verification requires provider connectivity and a user-authorized valid key; mocks check the request/response contract without spending a learner’s quota.
