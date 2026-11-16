# TargetJEE Engine

**Thoughtful practice. Lasting progress.** A private-by-design JEE Main / JEE Advanced CBT practice engine and misconception-repair studio.

Turn a textbook problem into a timed, four-option drill. Understand why a wrong answer looked right, find the first invalid pivot, test a counterfactual, and close the loop with a 45-second recovery check. Or start with the complete built-in reference experience—no account, API key or running AI service needed.

> **Status:** the user has authorized publishing this implementation to **[soham-laha/Practice-project](https://github.com/soham-laha/Practice-project)** on the fixed branch `arena/051ee326-practice-project`. Select that branch to browse the implementation; changes reach the default `main` branch through a pull request. See [the audit report](docs/AUDIT_REPORT.md) for local test results and remaining deployment blockers. Source publication is not a public application deployment. The older TargetJEE product remains untouched.

## What’s included

- Carefully designed warm-paper / forest workspace with self-hosted **Manrope + Newsreader**, tactile cards and restrained glass surfaces. No prohibited blue-green palette families.
- Light / Dark / AAA-palette High Contrast themes, persisted locally, reduced-motion support and explicit mobile/tablet/laptop/desktop breakpoints.
- Interactive five-second trap preview and lazy procedural Three.js orbital illustration.
- **12 authored reference items**: six per exam mode across Physics, Chemistry and Mathematics, complete with distractor traces and symbolic calculation certificates.
- NTA-style simulator with session-locked options, touch palette, review flags, clear response, countdowns, optional diagnostic certainty tags and immutable local +1/+2-minute grace events.
- Four adaptive tiers: 1.60× → 1.30× → 1.00× → 0.80×. Three timely, accurate, grace-free drills promote the learner.
- Actual score vs. recoverable marks; activity/subject views; honest provisional estimate labels; three review depths; first-pivot replay; interactive redemption checks; answer-change observations and optional learner confirmation.
- Automatic local revision cards with transparent recall scheduling.
- Local-only history/repairs in IndexedDB, namespaced preferences in localStorage, deep-validated JSON import/export and confirmed reset. No login, learner database, advertising or analytics.
- Text/PNG/JPEG/PDF forge, Gemini Flash / Flash Lite selection, request-scoped BYOK headers, size/MIME/signature validation and a bounded SymPy guardrail.
- BYOK study coach with tailored post-drill suggestions, practice questions and conversational follow-ups. Full reference flow remains available without AI.
- Mirrored TypeScript/Python implementations of **3PL MLE, NRM, precision-weighted log-time speed, SATO with grace adjustment, Brier score and five-bin ECE**, with unit tests.

## Run locally

Prerequisites: Node **22.12+**, npm and Python **3.12** (the Docker/CI target). The current sandbox tests ran under Python 3.11.2 because standalone 3.12 downloads were blocked; 3.12 execution is explicitly not yet verified. No Gemini key is needed for the reference simulator/review/cards.

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
```

The Linux test browser and libraries come from `@sparticuz/chromium` via npm, avoiding an extra browser-CDN download. Tests use Playwright + axe across **375 / 768 / 1440 pixels × all three themes**, six routes, explicit enhanced-contrast scans in High Contrast, and real Main/Advanced drill/repair/BYOK/export/reset/import/isolation flows. `scripts/browser.mjs` configures the bundled libraries without disabling browser web security. Browser screenshots/reports are generated into ignored directories; they are not committed artifacts.

CI uses Python **3.12** and runs the same gates. The health endpoint and local reference workflow can be exercised independently of Google availability.

## BYOK privacy

1. Open **Add API key** from any page, or the key entry in the navigation/forge/coach.
2. Get a key from [Google AI Studio](https://aistudio.google.com/apikey) and save it in your own browser.
3. Select `gemini-flash-latest` (default) or `gemini-flash-lite-latest`.
4. Your key is kept only at `localStorage['targetjee.byok.gemini.v1']`. It is forwarded in `X-Gemini-Api-Key` to FastAPI and then `x-goog-api-key` to Google, **not URLs or request bodies**.
5. **Remove / Clear Key** deletes it immediately. Backups never include it.

The dashboard coach automatically sends the selected completed drill’s compact evidence summary when a saved key is available; follow-ups send recent conversation context. Source scans are sent only when you click Forge. The provider sees these requests and its quotas, terms and billing apply. A free-tier key is not a guarantee of unrestricted or perpetual free use. Never enter a server-wide Gemini key in environment variables. Device access and same-origin script access can expose localStorage: this is privacy through locality, **not encrypted secret storage**.

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

The latest user instruction explicitly authorizes committing and pushing this implementation to `soham-laha/Practice-project`, superseding the earlier new-repository-only publication requirement for this repository. Commits and pushes must remain on `arena/051ee326-practice-project`; use a pull request to integrate into `main`, without rewriting history. Do **not** overwrite `soham-laha/TargetJEE` or the older `targetjee-engine` Vercel project. Application deployments should still use the separate new project/services described below.

### Backend (Render or Railway)

- Build `backend/Dockerfile` with **root build context** so `data/` is copied.
- The image uses Python 3.12, a non-root user and `${PORT:-8000}`.
- `render.yaml` and `backend/railway.toml` are provided.
- Set `TARGETJEE_FRONTEND_ORIGINS=https://your-new-frontend.vercel.app` (exact origin, no wildcard).
- Set `TARGETJEE_REQUIRE_HTTPS=true` behind a trusted TLS-terminating proxy.
- Verify `https://your-new-api-host/health` returns 200 before wiring the frontend.
- Hosting free tiers, cold starts and usage fees depend on the provider’s current plan. No paid services were enabled by this build.

### Frontend (Vercel)

- New Next.js project, repository root, Node 22.12+, `npm ci`, `npm run build`.
- Set server-only `TARGETJEE_API_BASE_URL=https://your-new-api-host`.
- Deploy production and verify `/`, `/simulator`, `/dashboard`, both exam modes, direct HTTPS file uploads and local persistence. Exact backend CORS must include this new frontend origin.
- Run `SMOKE_FRONTEND_URL=https://your-new-frontend SMOKE_BACKEND_URL=https://your-new-api npm run smoke` against the real hosts; placeholder URLs above are not deployments.
- The connected Vercel connector has first-deployment limitations documented in the audit report; a created project alone is not a successful deployment.

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

- [Design research, citations, semantic tokens and explicit defaults](docs/DESIGN_RESEARCH.md)
- [Architecture, security, equations and PDF traceability](docs/SYSTEM_ARCHITECTURE.md)
- [Verification results and deployment status](docs/AUDIT_REPORT.md)

The four custom-design fields in the request were unfilled placeholders. Documented defaults implement an intentional coherent design; they are **not represented as unspecified exact user-provided artwork**.

## License

MIT. Bundled fonts retain their SIL Open Font License via Fontsource; KaTeX, Lucide, Three.js and other dependencies retain their respective licenses. Textbook uploads remain subject to their owners’ rights; upload only material you are permitted to process.
