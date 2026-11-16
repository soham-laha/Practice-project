# Repository review — 16 November 2026

**Latest review:** [FINAL_REVIEW.md](FINAL_REVIEW.md) supersedes the historical maintenance-only status below. It records confirmed dependency/application fixes, fresh tests, unresolved real Gemini failures and the [Hallmark installation/design audit](DESIGN_TOOLING.md). The new patch is not deployed and will need both existing services updated after merge.

This follow-up reviews the merged implementation on a new Arena working branch. It does not rewrite `main`, remove contribution history, change the app's license, or reuse the older TargetJEE deployment.

## Failed GitHub Actions investigation

The main-branch run [43806474705](https://github.com/soham-laha/Practice-project/actions/runs/43806474705) and both preceding PR/branch runs failed at **4 · Start production-mode services**. GitHub's job/step metadata confirms that installation, static checks, production build, equations/contracts, dependency audit and design audit had already succeeded under Python 3.12. Browser tests and HTTP smoke were skipped, not passed.

Reproduction found a deterministic readiness-probe mismatch:

- The committed `wait-on http://127.0.0.1:8000/health` command sends **HEAD** by default.
- FastAPI implements **GET** `/health`; GET returns **200**, HEAD returns **405**.
- Thus a healthy API never satisfies that readiness probe, and the command times out.

The correction uses explicit `http-get://` probes for both services. A regression test invokes the actual installed wait-on CLI against a GET-only HTTP endpoint. Service logs are now preserved alongside browser artifacts, so startup failures are diagnosable without relying on a browser report that was never generated.

GitHub annotations also identified deprecated Node 20 action runtimes and a moving `ubuntu-latest` image. Actions are updated to verified Node 24-runtime releases, pinned to immutable commit SHAs, and the runner is pinned to Ubuntu 24.04. Node 22 and the Vercel project's Node 26 runtime are both tested with Python 3.12. The corrected push run [43809999805](https://github.com/soham-laha/Practice-project/actions/runs/43809999805) and PR run [43810056859](https://github.com/soham-laha/Practice-project/actions/runs/43810056859) both completed successfully on commit `4a88bd4`: both runtime jobs passed service readiness, all 13 browser cases and local two-service HTTP smoke. Subsequent full matrix runs on `27ba630` also passed, including a root-context, non-root Python 3.12 container build and both certificate sets. A separate hosted-site run passed all 13 browser cases against the actual public frontend; the audit report records those run links and makes clear that its backend smoke was skipped, not passed.

The full downloadable run-log archive is hosted outside this sandbox's outbound host allowlist. Investigation used the accessible GitHub jobs/check-annotation APIs plus a local HTTP-method reproduction; it does not pretend that the unavailable archive was read.

## Why Arena appears under Contributors

Implementation commit `6feab52` names `soham-laha` as both author and committer. Its message contains a `Co-authored-by: arena-agent ...` trailer, which GitHub uses for contribution attribution. The contributor listing is not the repository's collaborator/access-control list and does not itself grant permissions or transfer repository ownership.

Removing that historical attribution would normally involve changing commit history. This review does not force-push or rewrite merged history. Future automation attribution should remain transparent rather than being misrepresented as exclusively human authorship.

## License review

The application currently includes an MIT license. No license registration, fee or certification is implied by adding that file. Applying a license requires authority over the relevant material; a repository name or contributor badge does not establish copyright ownership. AI-output protectability and third-party rights are separate questions, not certified by this project.

MIT permits use, modification, redistribution and commercial copies subject to its notice requirements. The generic `TargetJEE Engine contributors` copyright notice and the MIT choice were defaults in the original implementation, not a specific legal opinion or a newly approved owner policy. This review **leaves the license unchanged** rather than silently making another licensing decision. Changing a future version's license does not automatically revoke permissions already granted for earlier distributed copies.

Third-party libraries, fonts and native components retain their own licenses. In particular, the bundled fonts are OFL-1.1 and optional Sharp/libvips dependencies are not covered solely by the app's MIT notice. Upstream notices are preserved in `public/notices/` and inventoried in `THIRD_PARTY_NOTICES.md`; any native-binary/source obligations must still be reviewed for the actual distribution. Uploaded textbook content is not relicensed by the application. This is technical license inventory and general information, not legal clearance of all content.

## Branch housekeeping

PR #1 was merged into `main`. Its old Arena branch can be deleted as optional housekeeping without deleting commits reachable from `main`. Deleting that pointer neither fixes CI nor removes contributor credit. This task works only on the current new Arena branch and does not delete the old branch, switch branches, or rewrite either history.

## Deployment boundary

Only the dedicated `targetjee-studio` Vercel project and the new owner-provisioned Render service are in scope. The older `targetjee-engine` project and older TargetJEE backend remain untouched. The frontend at **https://targetjee-studio.vercel.app** is now rebuilt and connected to **https://targetjee-studio-api.onrender.com** using a server-only production variable. Public health and upload discovery are verified; the 13 hosted browser workflows and real 20 MiB browser transport passed. GitHub About now contains the correct website metadata, without duplicating the public frontend URL in README.

The live-host check exposed an 8-second symbolic wall-deadline timeout on six-item reference batches. [PR #4](https://github.com/soham-laha/Practice-project/pull/4), merged as `0a8022f`, raises only the wall allowance to 30 seconds, retains 6-second CPU / 512 MiB worker caps and minimal environments, and reserves a 75-second total provider deadline within the 110-second proxy deadline. The owner manually deployed that merge to the **existing** Render service. [Public run 43821911026](https://github.com/soham-laha/Practice-project/actions/runs/43821911026) now **PASSES all 16 cases**, including both complete six-item certificate batches, plus real-host HTTP smoke. Assertions were not weakened or batches reduced. The pre-deployment red main check also passes on rerun without an application change.

No hosting action remains for this correction, and no authorized real Gemini key has been used. PR #5 maintenance only refreshed evidence and makes the audit's keyless-request timeout accommodate free-host cold starts; it does not change the deployed frontend/backend. See [the audit](AUDIT_REPORT.md) for exact identities and [the operator guide](DEPLOYMENT.md) for future updates and the separate live-provider acceptance checklist. Provider-free transport/auth tests are not represented as successful AI extraction or coaching.
