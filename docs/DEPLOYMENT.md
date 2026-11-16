# TargetJEE deployment and operator guide

Last checked: **16 November 2026**. The owner has provisioned the new backend; **do not create a duplicate service or reuse the older TargetJEE product**.

## Live-host inventory

| Component                       | Current installation                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public frontend                 | **https://targetjee-studio.vercel.app**; also verified in GitHub **About → Website**                                                                           |
| Dedicated Vercel project        | `targetjee-studio` / `prj_KFXNcBKpCvyPcT5VJFU6f7gH07I2`; root Next.js, Node 26, `npm ci`, `npm run build`                                                      |
| Connected production deployment | `dpl_5StVSw6YN4zin3oY83XxWpXvpS89`, **READY / PROMOTED**, application commit `6a0f4ce4201e4075567e82845a0a3b4f1d04a355`                                        |
| New Render backend              | **https://targetjee-studio-api.onrender.com**; service `targetjee-studio-api`, Free/Docker, `main` commit `6a0f4ce` shown in the owner's deployment screenshot |
| Public backend health           | `/health`: HTTP 200, `status: "ok"`, `service: "targetjee-engine"`, `schema: "targetjee.item.v2"`, `persistence: "none"`                                       |
| Frontend connection             | Production-only, server-side `TARGETJEE_API_BASE_URL=https://targetjee-studio-api.onrender.com`; rebuilt after setting it                                      |
| Provider credentials            | **No Gemini key configured on either host.** Learners supply their own key in browser settings; it is sent only in a request-scoped header                     |

The frontend deployment was requested from the fixed active Arena branch at the exact merged `main` commit above; no application changes were added to that deployment. **The live backend is still on `6a0f4ce`, with its old 8-second symbolic wall deadline.** Live six-item Main and Advanced validation batches have returned HTTP 422 with `Symbolic verification timed out; simplify the problem` in separate runs. Corrected source `416ddaa` allows 30 seconds of wall time while keeping the same 6-second CPU / 512 MiB limits, and reserves a 75-second total provider deadline. That correction has not yet been deployed to Render. A pushed source fix is not a fixed live service; the Blueprint disables push-triggered source deployments.

The complete credential-free Main/Advanced reference drill, review, recovery, flashcards and local backups are bundled in the frontend. The API is now connected, rather than the previous unconfigured-backend state. **Actual successful Gemini extraction/coach remains a separate, untested acceptance gate**; keyless rejection and transport checks must not be presented as provider success. See [the exact verification evidence](AUDIT_REPORT.md).

The older repository, `targetjee-engine` Vercel project and Railway backend are not reused or changed. PRs #1–#3 are merged into this repository's `main`; current follow-through changes stay on the active Arena branch and go through a new pull request.

## GitHub About placement

The repository's **About → Website** metadata is now verified as `https://targetjee-studio.vercel.app`. The URL is intentionally not repeated in README. No further owner action is needed for the current installation.

For a future address change, use **Code → About gear → Website → Save**. This metadata is separate from commits. The earlier integration PATCH returned HTTP 403 and did not update it; a later GitHub API GET confirmed the correct saved value. Do not attribute that successful metadata change to the failed API request.

## Required follow-through for the existing service

1. Review and merge [PR #4](https://github.com/soham-laha/Practice-project/pull/4) into `main`. Its corrected source-quality run passed both runtimes; the audit distinguishes that result from the still-failing old-backend public check.
2. In Render, open the **existing `targetjee-studio-api` service → Manual Deploy → Deploy latest commit** from `main`. Wait for **Live**. Do not create another Blueprint, enable a paid tier, change the working branch or paste credentials into chat.
3. Re-run the hosted workflow with both live origins and verify that both six-item validation batches now pass. The live check is intentionally still failing while the old backend revision is deployed; it has not been weakened to hide the timeout.
4. No frontend environment change or duplicate Vercel deployment is required for this backend-only fix: its public origin and API contract are unchanged. Live Gemini extraction/coach remains untested until the owner performs an authorized browser BYOK check.

The already-provided backend URL is correct; it does not need to be sent again. A deployment completion/screenshot is sufficient to resume independent live verification.

## Updating the existing installation later

1. Keep Render on the authorized repository's **`main`** branch and review source changes before a manual deployment. Keep repository-root build context, Dockerfile `backend/Dockerfile`, and health-check path `/health`.
2. Keep `TARGETJEE_FRONTEND_ORIGINS=https://targetjee-studio.vercel.app` exact, without a wildcard. Update it deliberately if the public frontend origin changes. Preview aliases are not implicitly authorized for direct uploads.
3. Keep `TARGETJEE_REQUIRE_HTTPS=true` behind trusted TLS termination. Only credential-free GET `/health` may arrive internally over plain HTTP; API routes and every POST still require HTTPS.
4. If the backend origin changes, verify its health, reference items and bounded validation first. Change only server-side `TARGETJEE_API_BASE_URL` on the dedicated Vercel project; never add a provider key or a `NEXT_PUBLIC_*` credential.
5. **Rebuild/redeploy Vercel after an API-origin change.** Its CSP is generated at build time, not only at runtime. Verify that `/api/engine/upload-target` and the forge page's `connect-src` use the same fixed HTTPS origin.
6. Repeat the public-host tests below. Render Free may take 50 seconds or more to wake from idle; do not silently enable a paid tier to avoid cold starts.

The current backend image uses Python 3.12, a non-root user, `${PORT:-8000}` and no central learner database or server-side key persistence. Public health confirms the service identity, not the correctness of an arbitrary AI-generated item. Host/proxy quotas, trusted forwarded headers and any operator APM capture remain operator responsibilities.

## Repeatable public verification

Use real HTTPS origins, never an older product or a placeholder, and no provider key in the shell, workflow inputs or artifacts:

```bash
SMOKE_FRONTEND_URL=https://targetjee-studio.vercel.app \
SMOKE_BACKEND_URL=https://targetjee-studio-api.onrender.com \
npm run smoke

SMOKE_FRONTEND_URL=https://targetjee-studio.vercel.app \
SMOKE_BACKEND_URL=https://targetjee-studio-api.onrender.com \
TEST_BASE_URL=https://targetjee-studio.vercel.app \
npm run test:e2e
```

The **Hosted website verification** GitHub workflow accepts both origins. Select the current PR branch while testing changes; after merge, select `main`. With no backend input it deliberately runs only the reference-frontend audit and skips the new public API integration suite. With both inputs, the suite checks health, both six-item certificate sets, keyless extraction/coach for both model names, origin rejection, exact multipart CORS, CSP/discovery agreement and a 20 MiB real-browser transport check. It also runs the existing 13 browser workflows, whose AI coach response is explicitly mocked, and the two-service HTTP smoke. Local quality jobs skip the public-only cases rather than substituting localhost for production.

The large transport test sends a synthetic 20 MiB multipart file with an intentionally malformed key. The API rejects it **before file decoding or a provider call**. That exercises the actual browser's CSP/preflight and the hosting/body-parser path, not successful OCR, image/PDF validation or a paid Gemini request. Browser security remains enabled. HTML reports/traces are retained as seven-day artifacts; actionable assertion failures are also reported in GitHub Checks.

### Remaining live-provider acceptance

Only the owner/learner should enter an authorized Gemini key into the public site's browser key dialog. Never send it in chat or put it in a URL, body, deployment variable, GitHub workflow input, log or artifact. Complete a small, non-sensitive text extraction, review the generated item and run a coach request; test each supported model and permitted file type before claiming comprehensive provider acceptance. Remove the key with **Remove / Clear Key** when finished. These actions may incur provider usage charges.

No real key was used by the automated checks. They cannot prove provider account access, current model availability, arbitrary source interpretation or reliable successful generation at the 20 MiB maximum. SymPy checks bounded algebra/certificates, not general OCR/physics/prose correctness.

## Fresh isolated installations only

The current Render service is already live. The following is for a separate future installation, not another setup step for the owner:

[Deploy the prepared isolated backend on Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fsoham-laha%2FPractice-project)

1. Sign in to Render yourself, review the new-service Blueprint and current plan terms, and approve only the intended isolated service. The manifest requests `free`; no paid upgrade is authorized here.
2. Use **Blueprint Path `render.yaml`**, not `backend/Dockerfile`. The root YAML selects the Dockerfile, root context, `/health`, exact CORS and HTTPS settings internally. Confirm the repository default **`main`** branch, not an obsolete Arena branch.
3. Verify the new public HTTPS `/health`, then use the update/rebuild/check sequence above with that origin. Do not paste hosting credentials or provider keys into chat.

A Railway alternative remains in `backend/railway.toml`: create a new authorized service, retain root context, select the Dockerfile and configure the same CORS/HTTPS variables. Review current costs first. Neither alternative authorizes overwriting an older backend.

## Why not silently move the backend into Vercel?

Vercel supports Python/FastAPI and container services, but its documented [function request-body limit is 4.5 MB](https://vercel.com/docs/functions/limitations#request-body-size), including the same function limits for the [container runtime](https://vercel.com/docs/functions/runtimes/container#limits-and-pricing). Deploying the unchanged 20 MB API there would make the advertised upload limit false. A central upload bucket or a new chunked-upload protocol would be a separate architecture/security change, not a completed Render deployment.

The current architecture keeps small text/coach calls behind the same-origin frontend proxy and sends production file uploads directly to the new fixed HTTPS backend, with no cookies, redirects or arbitrary target URLs. Both routes use header-only, request-scoped keys. Learner history remains only in the browser.
