# Finish the new TargetJEE deployment

## What is already real

- Public reference frontend: **https://targetjee-studio.vercel.app**.
- Dedicated Vercel project: `targetjee-studio`, `prj_KFXNcBKpCvyPcT5VJFU6f7gH07I2`.
- Fixes and evidence: [PR #2](https://github.com/soham-laha/Practice-project/pull/2) and [AUDIT_REPORT.md](AUDIT_REPORT.md).
- The older TargetJEE repository, Vercel project and Railway backend are not reused or changed.

The complete credential-free Main/Advanced reference drill, review, recovery, flashcards and local backups are bundled in the frontend. **AI forge/coach are not available until a new backend is connected.** Saving a browser key does not create that missing service.

## One owner-side action

[**Deploy the prepared new backend on Render**](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fsoham-laha%2FPractice-project%2Ftree%2Farena%2Fe36de462-practice-project)

1. Sign in to Render yourself. Review the Blueprint for **`targetjee-studio-api`** and approve it in your own account. It requests the `free` service plan, not a paid upgrade; Render controls current plan availability and any signup requirements. Do not approve replacing any existing service.
2. The repository-root Blueprint already selects `backend/Dockerfile`, root build context, `/health`, `TARGETJEE_REQUIRE_HTTPS=true` and **`TARGETJEE_FRONTEND_ORIGINS=https://targetjee-studio.vercel.app`**. Automatic deploys on source pushes are off so a public deploy-button instance does not update without review.
3. When deployment succeeds, send **only its public HTTPS origin** back to the agent. Open `<that-origin>/health` to see `status: "ok"`, `schema: "targetjee.item.v2"` and `persistence: "none"`. Do not send passwords, tokens or a Gemini key.

The link intentionally selects this session's published follow-up branch. Keep that branch while the Blueprint references it, or explicitly update the Render branch setting to `main` after merging the fixes. Do not rename/switch the Arena working branch to accomplish deployment.

This user interaction is necessary because the connected app can deploy Vercel but cannot create a Render/Railway service. The agent does not have those hosting credentials, and GitHub permissions do not supply them. No token needs to be pasted into chat.

### Railway alternative

If you prefer Railway, create a **new** service from the authorized repository/branch, retain repository-root context, select the `backend/railway.toml` configuration (or set Dockerfile path `backend/Dockerfile`) and set the same two environment variables above. Provide the new public HTTPS origin. Review Railway's current costs before enabling it; no paid deployment is authorized by these instructions.

## Agent follow-through once the URL exists

1. Verify the new public `/health`, both six-item reference endpoints and bounded symbolic validation. Do not substitute the older backend.
2. Set server-only `TARGETJEE_API_BASE_URL` on the **dedicated new Vercel project** to the verified HTTPS origin. No API key belongs in an environment variable or any `NEXT_PUBLIC_*` field.
3. Rebuild/redeploy the frontend, rather than only changing a runtime variable: its Content Security Policy is generated at build time. Confirm `connect-src` and `/api/engine/upload-target` agree on the same fixed origin.
4. Verify both model names return 401 without a key through the deployed frontend, malformed/foreign origins are rejected and HTTPS redirects never receive a request-scoped key. Check exact CORS for the public frontend, including the multipart preflight.
5. Run the hosted browser suite and `SMOKE_FRONTEND_URL=<actual-frontend> SMOKE_BACKEND_URL=<actual-backend> npm run smoke` from a network that can reach both public hosts. The manual `Hosted website verification` workflow becomes dispatchable after it exists on the default branch. No real key is used by those automated tests; mocked coach transport is labelled as such.
6. Exercise a 20 MB public upload/CORS path and an authorized BYOK provider request before claiming those gates passed. Never log/store a real key or put it in a URL, request body, workflow input or artifact. A provider-free transport rejection check is not successful AI extraction.
7. Update the audit with deployment IDs, exact commit, real URLs, test-run links and any remaining unverified behavior.

## Why not silently move the backend into Vercel?

Vercel supports Python/FastAPI and container services, but its documented [function request-body limit is 4.5 MB](https://vercel.com/docs/functions/limitations#request-body-size), including the same function limits for the [container runtime](https://vercel.com/docs/functions/runtimes/container#limits-and-pricing). Deploying the unchanged 20 MB API there would make the advertised upload limit false. Adding a central upload bucket or a new chunked-upload protocol would be a separate architecture/security change, not a completed Render/Railway deployment.

The current architecture therefore keeps small text/coach calls behind the same-origin frontend proxy and sends production file uploads directly to the new fixed HTTPS backend, with no cookies, redirects or arbitrary target URLs. Both routes use header-only, request-scoped keys. Learner history remains only in the browser.
