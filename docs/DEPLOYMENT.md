# TargetJEE deployment and operator guide

Last verified: **16 November 2026, 07:10–07:12 UTC**. The owner has merged PR #4 and deployed the corrected backend. **The existing installation needs no further hosting action. Do not create a duplicate service or reuse the older TargetJEE product.**

## Live-host inventory

| Component                     | Current installation                                                                                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public frontend               | **https://targetjee-studio.vercel.app**; also verified in GitHub **About → Website**, intentionally not duplicated in README                                                                                          |
| Dedicated Vercel project      | `targetjee-studio` / `prj_KFXNcBKpCvyPcT5VJFU6f7gH07I2`; root Next.js, Node 26, `npm ci`, `npm run build`                                                                                                             |
| Connected production frontend | `dpl_5StVSw6YN4zin3oY83XxWpXvpS89`, **READY / PROMOTED**, frontend application commit `6a0f4ce4201e4075567e82845a0a3b4f1d04a355`                                                                                      |
| New Render backend            | **https://targetjee-studio-api.onrender.com**; existing `targetjee-studio-api`, Free/Docker; owner screenshot shows manual deployment of `main` merge **`0a8022f3190c4f69cbe11bbd8c80cd9b1fb9b7ff`** succeeded / Live |
| Backend correction            | PR #4 source `416ddaa`, now included in deployed merge `0a8022f`: 30-second symbolic wall deadline, unchanged 6-second CPU / 512 MiB limits and minimal environment; 75-second total provider deadline                |
| Frontend connection           | Production-only server-side `TARGETJEE_API_BASE_URL=https://targetjee-studio-api.onrender.com`; rebuilt after initially setting it; origin and API contract unchanged by the backend-only correction                  |
| Public health                 | HTTP 200, `status: "ok"`, `service: "targetjee-engine"`, `schema: "targetjee.item.v2"`, `persistence: "none"`                                                                                                         |
| Public acceptance evidence    | **[43821911026](https://github.com/soham-laha/Practice-project/actions/runs/43821911026): all 16 cases and two-service HTTP smoke PASS**, including both six-item validation batches                                  |
| Provider credentials          | **No Gemini key configured on either host.** Learners supply their own browser key, sent only in a request-scoped header                                                                                              |

The frontend remains on the connected deployment above: PR #4 changed backend execution budgets, tests and documentation, not the frontend application. A second frontend deployment was neither needed nor performed for that correction. Render source-push automatic deployment remains intentionally off. Future source commits do not imply that either host has changed revision.

The old deadline failure is now cleared by real-host validation, not merely by a screenshot or green source CI. **Successful live Gemini extraction/coach is still untested.** The 20 MiB public-browser test proves multipart/CORS/CSP transport to the auth guard, not valid document decoding or a provider result. [AUDIT_REPORT.md](AUDIT_REPORT.md) distinguishes those scopes.

The older repository, `targetjee-engine` Vercel project and Railway backend are not reused or changed. PRs #1–#4 are merged into this repository's `main`. The current maintenance branch changes only verification scripts/tests and evidence; merging that maintenance does **not** require another Render or Vercel deployment.

## Completed follow-through and the screenshot's red check

- PR #4 was merged as `0a8022f` and manually deployed to the existing Render service; the screenshot's logs show it Live at about **07:05:24 UTC**.
- The first main hosted-check attempt finished at **07:05:07 UTC**, before that deployment completed. It failed in the public-page/backend-availability step, so its browser/API/smoke steps were skipped. The inaccessible signed log archive does not establish its exact error text.
- **[The same main run, attempt 2](https://github.com/soham-laha/Practice-project/actions/runs/43821189854), now PASSES** without an application-source change. It has no backend input, so its 13 reference browser cases pass while its three public API cases and two-service smoke are explicitly skipped.
- **[The separate full run](https://github.com/soham-laha/Practice-project/actions/runs/43821911026)** supplied both live origins and passed all **16** browser/integration cases plus public HTTP smoke. This, not the reference-only rerun, clears the deployed validation/transport gate.

No new URL, repeated Blueprint setup, paid upgrade or additional hosting deployment is required. No token or Gemini key needs to be sent in chat.

## GitHub About placement

The repository's **About → Website** metadata is verified as `https://targetjee-studio.vercel.app`. The URL is intentionally absent from README. No owner action is needed for the current address.

For a future address change, use **Code → About gear → Website → Save**. Metadata is separate from commits. The earlier integration PATCH returned HTTP 403 and did not update it; a later GET confirmed the correctly saved value. Do not attribute that change to the failed API request.

## Future updates to the existing installation

1. Keep Render on the authorized repository's **`main`** branch and review application/backend changes before **Manual Deploy → Deploy latest commit**. Keep root build context, Dockerfile `backend/Dockerfile` and health path `/health`. Documentation/audit-only changes need no host deployment.
2. Keep `TARGETJEE_FRONTEND_ORIGINS=https://targetjee-studio.vercel.app` exact, without a wildcard. Deliberately update it if the public frontend changes. Preview aliases are not implicitly authorized for direct uploads.
3. Keep `TARGETJEE_REQUIRE_HTTPS=true` behind trusted TLS termination. Only credential-free GET `/health` may arrive internally over HTTP; API routes and every POST still require HTTPS.
4. If the backend origin changes, verify health, references and bounded validation first. Change only server-side `TARGETJEE_API_BASE_URL` on the dedicated Vercel project; never add a provider key or a `NEXT_PUBLIC_*` credential.
5. **Rebuild/redeploy Vercel after an API-origin change.** CSP is generated at build time. Verify that `/api/engine/upload-target` and the forge page's `connect-src` permit the same fixed HTTPS origin.
6. Repeat public-host checks. Render Free may take 50 seconds or more to wake; do not silently enable a paid tier to avoid that. Static-page audit probes remain capped at 20 seconds; keyless API probes allow 120 seconds, outlasting the proxy's bounded 110-second upstream wait. The longer audit allowance does not retry, accept unavailable responses or relax validation.

The backend image uses Python 3.12, a non-root user, `${PORT:-8000}` and no central learner database or server-side key persistence. Fixed symbolic/provider budgets cannot be increased by a request or environment variable. Public health proves liveness/identity, not the correctness of arbitrary AI-generated content. Trusted forwarded headers, edge quotas, host limits and operator APM capture remain operator responsibilities.

## Repeatable public verification

Use real HTTPS origins and no provider key in the shell, workflow input or artifact:

```bash
SMOKE_FRONTEND_URL=https://targetjee-studio.vercel.app \
SMOKE_BACKEND_URL=https://targetjee-studio-api.onrender.com \
npm run smoke

SMOKE_FRONTEND_URL=https://targetjee-studio.vercel.app \
SMOKE_BACKEND_URL=https://targetjee-studio-api.onrender.com \
TEST_BASE_URL=https://targetjee-studio.vercel.app \
npm run test:e2e
```

The **Hosted website verification** workflow accepts both origins. Select the current PR branch while changing checks; after merge, select `main`. Without a backend input it is intentionally a reference-frontend audit, not API acceptance. With both inputs, all 16 cases run: real health, both six-item certificate sets, keyless extraction/coach for both models, foreign/malformed origin rejection, exact multipart CORS, CSP/discovery agreement, a 20 MiB real-browser transport check and the 13 existing UI/accessibility/local-history cases. The UI coach response is explicitly mocked. The independent two-service HTTP smoke also runs.

The large transport test sends a synthetic 20 MiB multipart file with an intentionally malformed key. The API rejects it **before file decoding or a provider call**. It proves the actual browser/host/body-parser path, not successful OCR, valid-image/PDF processing or a paid Gemini result. Browser security remains enabled. Reports/traces are retained as seven-day artifacts, with actionable browser assertion failures in GitHub Checks. Unit fixtures cannot append simulated public results to the real workflow summary.

## Remaining live-provider acceptance

Only the owner/learner should enter an authorized Gemini key into the public site's browser key dialog. Never send it in chat or put it in a URL, body, deployment variable, workflow input, log or artifact. Provider usage may incur charges.

1. Save the authorized key in the site's browser settings and try a small, non-sensitive text problem with `gemini-flash-latest`.
2. Review the extracted prompt/options/certificates before starting a drill, then test a coach request.
3. Repeat with `gemini-flash-lite-latest` and supported PNG/JPEG/PDF sources before claiming comprehensive provider/file-type acceptance. Maximum-size transport success alone is not maximum-size extraction success.
4. Use **Remove / Clear Key** when finished and verify it is removed locally.

No real key was used by the automated checks. They cannot prove provider account access, current model availability, arbitrary source interpretation or successful generation at 20 MiB. SymPy checks bounded algebra/certificates, not general OCR/physics/prose correctness. Full provider acceptance therefore remains incomplete even though the provider-free deployed gates now pass.

## Fresh isolated installations only

The current service is already live. The following is for a separate future installation, not another owner setup step:

[Deploy the prepared isolated backend on Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fsoham-laha%2FPractice-project)

1. Sign in to Render yourself, review the new-service Blueprint/current plan terms, and approve only the intended isolated service. The manifest requests `free`; no paid upgrade is authorized here.
2. Use **Blueprint Path `render.yaml`**, not `backend/Dockerfile`. The root YAML selects the Dockerfile, root context, health, CORS and HTTPS settings. Confirm default **`main`**, not an obsolete Arena branch.
3. Verify the new HTTPS health/reference/validation endpoints and follow the update/rebuild/check sequence above. Do not paste host credentials or provider keys into chat.

The alternative `backend/railway.toml` likewise requires a new authorized service, root context, the Dockerfile and the same CORS/HTTPS variables. Review costs first; neither alternative authorizes overwriting an older backend.

## Why not silently move the backend into Vercel?

Vercel supports Python/FastAPI and containers, but its documented [function request-body limit is 4.5 MB](https://vercel.com/docs/functions/limitations#request-body-size), including [container functions](https://vercel.com/docs/functions/runtimes/container#limits-and-pricing). The unchanged 20 MB API would not meet its advertised limit there. A central bucket or chunk-upload protocol would be a separate architecture/security change.

Small text/coach calls use the same-origin frontend proxy; production files go directly to the fixed HTTPS Render endpoint, without cookies, redirects or arbitrary targets. Both paths use header-only, request-scoped keys. Learner history stays only in the browser.
