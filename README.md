# TargetJEE Engine

**Thoughtful practice. Lasting progress.** A private-by-design JEE Main / JEE Advanced CBT practice engine and misconception-repair studio.

Turn a textbook problem into a timed, four-option drill. Understand why a wrong answer looked right, find the first invalid pivot, test a counterfactual, and close the loop with a 45-second recovery check. Or start with the complete built-in reference experience—no account, API key or running AI service needed.

> **Working-branch status:** the requested workbook redesign, safe staged Gemini diagnostics, provider-schema/server-browser generation-contract repairs and an optional on-device text assistant are implemented. [Current changes, verification and limits](docs/WORKBOOK_REDESIGN.md) are separate from the [earlier repository review](docs/FINAL_REVIEW.md) and historical deployed evidence. **This task has not deployed the changes, confirmed live Gemini success or run real model inference.** The rendered Hallmark audit still reports two KaTeX/MathML heuristic flags; it is not presented as an unconditional pass.
>
> **Deployed baseline:** the dedicated frontend and stateless API were connected at the last recorded check. Use **About → Website** for the public site; its URL is intentionally not duplicated here. PRs #1–#6 are merged, but production was still on older revisions at the start of this task. Historical public/keyless checks do not clear the reported generation failures or prove this branch is deployed. The older TargetJEE product remains untouched.

## What’s included

- Warm-paper / forest workbook with self-hosted **Manrope + Newsreader**, ruled task sections, readable annotations and a real problem interaction instead of a promotional feature-card grid. No prohibited blue-green palette families.
- Light / Dark / AAA-palette High Contrast themes, persisted locally, reduced-motion support and explicit mobile/tablet/laptop/desktop breakpoints.
- Interactive five-second trap preview and lazy procedural Three.js orbital illustration.
- **12 authored reference items**: six per exam mode across Physics, Chemistry and Mathematics, complete with distractor traces and symbolic calculation certificates.
- NTA-style simulator with session-locked options, touch palette, review flags, clear response, countdowns, optional diagnostic certainty tags and immutable local +1/+2-minute grace events.
- Four adaptive tiers: 1.60× → 1.30× → 1.00× → 0.80×. Three timely, accurate, grace-free drills promote the learner.
- Actual score vs. recoverable marks; activity/subject views; honest provisional estimate labels; three review depths; first-pivot replay; interactive redemption checks; answer-change observations and optional learner confirmation.
- Automatic local revision cards with transparent recall scheduling.
- Local-only history/repairs in IndexedDB, namespaced preferences in localStorage, deep-validated JSON import/export and confirmed reset. No login, learner database, advertising or analytics.
- Text/PNG/JPEG/PDF forge, Gemini Flash / Flash Lite selection, exam-specific supported-keyword structured output, request-scoped BYOK headers, size/MIME/signature validation and a bounded SymPy guardrail. See [contract repairs and live-acceptance limits](docs/GEMINI_TROUBLESHOOTING.md).
- BYOK study coach with tailored post-drill suggestions, practice questions and conversational follow-ups. Full reference flow remains available without AI.
- Optional **SmolLM2 360M, 4-bit** on-device text assistant with explicit download consent, WebGPU checks, bounded single-turn suggestions, Stop/Unload/Remove and no cloud fallback. It is experimental, not a local image/PDF or verified-drill replacement.
- Keyless API connection check and safe failure receipts distinguishing provider, generated-format and algebra-verification failures without blaming every error on quota.
- Mirrored TypeScript/Python implementations of **3PL MLE, NRM, precision-weighted log-time speed, SATO with grace adjustment, Brier score and five-bin ECE**, with unit tests.

## Run locally

Prerequisites: Node **22.12+**, npm and Python **3.12** (the Docker/CI target). This sandbox uses Node 22.22.3 and Python 3.11.2. The earlier merged base passed Node 22/26 and Python 3.12 CI; this branch's fresh local results are recorded in the [current review](docs/WORKBOOK_REDESIGN.md), not inferred from those historical runs. No Gemini key or model download is needed for the reference simulator/review/cards.

```bash
npm ci
python3.12 -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt
cp .env.example .env.local
```

Terminal 1 (from the **repository root**, not `backend/`):

```bash
.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --no-access-log
```

Terminal 2:

```bash
NEXT_TELEMETRY_DISABLED=1 npm run dev
```

Open `http://localhost:3000`. Text and coach calls use the same-origin `/api/engine/*` proxy and server-only `TARGETJEE_API_BASE_URL`. File uploads use that relative proxy locally; with an external HTTPS backend they go directly to its fixed upload endpoint to avoid frontend-function body limits. A small same-origin discovery endpoint exposes only the public upload URL, never a key. Browser code never calls the sandbox’s localhost. Configure exact FastAPI CORS origins for production uploads.

### Production-mode local smoke

```bash
npm run build
TARGETJEE_API_BASE_URL=http://127.0.0.1:8000 npm start
curl --fail http://127.0.0.1:8000/health
```

### Verify

```bash
npm run lint                  # ESLint, zero warnings allowed
npm run typecheck             # tsc --noEmit
npm run build                 # Next production build
.venv/bin/ruff check backend   # Python lint
.venv/bin/ruff format --check backend
npx prettier --check .
.venv/bin/python -m pytest backend/tests -q -W error
npm test                      # Vitest equations, contracts and workflow logic
npm run audit:design          # palette/fonts/research/contrast/source-secret scan
npm run test:e2e              # production services must already be running
npm run smoke                 # local HTTP health/routes/both modes/models
npm audit --audit-level=low
.venv/bin/pip check
.venv/bin/python -m pip_audit -r backend/requirements-dev.txt --vulnerability-service pypi --progress-spinner off
```

The Linux test browser and libraries come from `@sparticuz/chromium` via npm, avoiding an extra browser-CDN download. Tests use Playwright + axe across **375 / 768 / 1440 pixels × all three themes**, six routes, explicit enhanced-contrast scans in High Contrast, and real Main/Advanced drill/repair/BYOK/export/reset/import/isolation flows. `scripts/browser.mjs` configures the bundled libraries without disabling browser web security. Browser screenshots/reports are generated into ignored directories; they are not committed artifacts.

CI uses Python **3.12** and Node **22 / 26**. The health endpoint and local reference workflow can be exercised independently of Google availability. `hosted.yml` separately audits the actual public frontend, including its browser workflows and original font notices; it explicitly does **not** treat an unconfigured backend as full production acceptance. It is now available on `main` for manual dispatch with real frontend/backend origins. The normal quality workflow additionally builds and exercises the root-context, non-root backend container on Node 22.

## BYOK privacy

1. Open **Add API key** from any page, or the key entry in the navigation/forge/coach.
2. Get a key from [Google AI Studio](https://aistudio.google.com/apikey) and save it in your own browser.
3. Select `gemini-flash-latest` (default) or `gemini-flash-lite-latest`.
4. Your key is kept only at `localStorage['targetjee.byok.gemini.v1']`. It is forwarded in `X-Gemini-Api-Key` to FastAPI and then `x-goog-api-key` to Google, **not URLs or request bodies**.
5. **Remove / Clear Key** deletes it immediately. Backups never include it.

Saving a key checks its **format only**. “Key saved” does not mean Google accepted it, granted model access or confirmed quota; that is checked on use. No automatic paid validation/retry call is made on Save.

The dashboard coach automatically sends the selected completed drill’s compact evidence summary when a saved key is available; follow-ups send recent conversation context. Source scans are sent only when you click Forge. The provider sees these requests and its quotas, terms and billing apply. A free-tier key is not a guarantee of unrestricted or perpetual free use. Never enter a server-wide Gemini key in environment variables. Device access and same-origin script access can expose localStorage: this is privacy through locality, **not encrypted secret storage**.

## Optional local text help

In **Build a drill**, expand **On-device text assistant**. Nothing downloads until **Load local assistant** is selected. The model/runtime download is several hundred MB; the catalog estimates roughly 600 MB GPU memory plus browser overhead, not a measured requirement or universal device guarantee. WebGPU is required. Prompts stay in the local inference path and are not saved to learner history or backups; download hosts still see ordinary request metadata.

Use **Stop** while loading/thinking, **Unload from memory** after use, or **Remove downloaded model** to clear this model's cached/partial files. Failed local operations do not make Gemini calls. Short text suggestions are unverified and cannot replace scanned-problem extraction or the strict algebraic drill contract. See [requirements, privacy, licensing and unverified device acceptance](docs/LOCAL_ASSISTANT.md).

For generation failures, **Check API connection (no key)** tests only our API, not Google/model access or quota. A failure's **Technical details → Copy safe diagnostics** excludes source/key/history. See [Gemini troubleshooting and separate-service deployment](docs/GEMINI_TROUBLESHOOTING.md); do not put a real key in chat or hosting environment variables.

## API overview

| Method | Endpoint                  | Purpose                                                 |
| ------ | ------------------------- | ------------------------------------------------------- |
| GET    | `/health`                 | Liveness; no secrets                                    |
| GET    | `/v1/reference?exam=main` | Seeded, shuffled reference items                        |
| POST   | `/v1/extractions`         | `{text, exam, model}` with BYOK header                  |
| POST   | `/v1/extractions/upload`  | Multipart `file`, `exam`, `model`; PNG/JPEG/PDF ≤20 MB  |
| POST   | `/v1/items/validate`      | `{items:[...]}` → bounded algebraic certificate results |
| POST   | `/v1/coach`               | `{message, context, exam, model}` with BYOK header      |

Uploads are signature-checked and decoded, not trusted solely by extension: images ≤25 MP; PDFs 1–30 pages, unencrypted. The API accepts no arbitrary model URL. Pydantic errors omit input values. Timeouts, quota errors and failed verification produce safe errors, never invented drill content.

## Deploy without touching an older product

The latest user instruction explicitly authorizes committing and pushing this implementation to `soham-laha/Practice-project`, superseding the earlier new-repository-only publication requirement for this repository. Commits and pushes must remain on the current Arena session branch; use a pull request to integrate into `main`, without rewriting history. Do **not** overwrite `soham-laha/TargetJEE` or the older `targetjee-engine` Vercel project. Application deployments should still use the separate new project/services described below.

### Backend (Render or Railway)

The owner has deployed the new **`targetjee-studio-api`** Render service from `main`; its public health endpoint is verified, and the dedicated Vercel frontend has been rebuilt with that API origin. Do not create a duplicate service for the existing installation. See [the live-host inventory and operator guide](docs/DEPLOYMENT.md) for verification and future isolated installations. The Blueprint sets exact frontend CORS and disables push-triggered source deployments.

- Build `backend/Dockerfile` with **root build context** so `data/` is copied.
- The image uses Python 3.12, a non-root user and `${PORT:-8000}`.
- `render.yaml` and `backend/railway.toml` are provided.
- Set `TARGETJEE_FRONTEND_ORIGINS` to the exact frontend origin listed in **About → Website** (already set by the Render Blueprint; no wildcard).
- Set `TARGETJEE_REQUIRE_HTTPS=true` behind a trusted TLS-terminating proxy. Only credential-free GET `/health` is exempt for private internal health probes; API requests and all POSTs still require HTTPS.
- Verify `https://your-new-api-host/health` returns 200 before wiring the frontend.
- Hosting free tiers, cold starts and usage fees depend on the provider’s current plan. No paid services were enabled by this build.

### Frontend (Vercel)

- The dedicated `targetjee-studio` project is deployed; its public address belongs in **About → Website**. It uses repository-root Next.js, Node 26, `npm ci` and `npm run build`. Do not use the older project.
- Server-only `TARGETJEE_API_BASE_URL` is configured in **production** with the new Render API origin; no provider key is configured on either host.
- Rebuild production after changing the API origin: the CSP upload allowlist is compiled at build time. Then verify `/`, `/simulator`, `/dashboard`, both exam modes, direct HTTPS uploads and local persistence. Exact backend CORS must include this frontend origin.
- Run `SMOKE_FRONTEND_URL=https://your-new-frontend SMOKE_BACKEND_URL=https://your-new-api npm run smoke` against real hosts; placeholder URLs in this command are not deployments. The hosted GitHub workflow also accepts both origins and exercises actual browser CORS/CSP upload transport without a valid provider key.
- The connected production deployment is READY and the public alias serves the application without authentication. Full live Gemini extraction/coach acceptance remains separate from keyless auth checks, mocked UI tests and large-body transport tests; see the audit. Vercel Functions have a 4.5 MB body cap, so multipart files go directly to the allowlisted HTTPS API instead of that proxy.

## Mathematical and product limits

- **Illustrative/model-proposed item parameters are not empirically calibrated.** No rank, percentile, causal learning gain or certified “true mastery” is claimed.
- Main reference marking: +4/−1. Advanced reference marking: single-correct +4/−2. Generated Advanced may use +4/−1 or +4/−2. This does not implement every variable JEE Advanced paper section or multi-correct partial-mark scheme.
- SymPy proves expression/certificate consistency and rejects equivalent options. It cannot prove that an AI correctly interpreted arbitrary textbook physics, derived all units from prose, or understood a diagram. Learners preview extracted prompts before starting. Coach answers are explicitly not SymPy-verified.
- The SATO penalty and tier thresholds are transparent product heuristics, not validated institutional scoring standards. Grace never changes the actual exam mark.
- Certainty calibration uses **only explicit diagnostic tags**, never invented confidence inferred from clicks.
- “Immutable” grace records are append-only in application logic, not cryptographically tamper-proof local evidence.
- No-service-worker reference assets are bundled for zero-credential operation after loading, but first-load offline/PWA installation is not claimed. The UI still needs its hosting origin to load initially.
- Each browser profile/origin is an independent workspace. People sharing one profile share local data. Export before changing origin/device or clearing site storage. History is capped at 200 completed sessions; raw source files are never retained by the backend.

## Documentation

- [Current workbook redesign, test evidence and open acceptance gates](docs/WORKBOOK_REDESIGN.md)
- [Optional browser-local text assistant: use, privacy and limits](docs/LOCAL_ASSISTANT.md)
- [Gemini error stages, safe receipts and deployment/retest guide](docs/GEMINI_TROUBLESHOOTING.md)
- [Earlier repository findings, tests and unresolved provider acceptance](docs/FINAL_REVIEW.md)
- [Hallmark installation receipt and earlier audit](docs/DESIGN_TOOLING.md)
- [Design research, citations, semantic tokens and explicit defaults](docs/DESIGN_RESEARCH.md)
- [Architecture, security, equations and PDF traceability](docs/SYSTEM_ARCHITECTURE.md)
- [Verification results and deployment status](docs/AUDIT_REPORT.md)
- [CI failure, contribution attribution, licensing and branch investigation](docs/REPOSITORY_REVIEW.md)
- [Third-party license scope and preserved upstream notices](THIRD_PARTY_NOTICES.md)

The four custom-design fields in the request were unfilled placeholders. Documented defaults implement an intentional coherent design; they are **not represented as unspecified exact user-provided artwork**.

## License

The existing application license is MIT; this is a permission notice, not a registration or proof of ownership. The owner has not requested a replacement policy. Dependencies are **not all MIT**: bundled fonts retain OFL terms, and optional native components have additional licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the preserved notices in `public/notices/`. Textbook uploads remain subject to their owners’ rights; upload only material you are permitted to process.
