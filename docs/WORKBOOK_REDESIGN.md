# Workbook redesign and AI diagnostics review

**16 November 2026.** Working branch `arena/6870be33-practice-project`, based on `3f8dd03a2e50d658658ef5e318093ca3e4d2c202` (merged PR #6). This is the subsequent **requested frontend redesign**, not the earlier installation-only audit. No new commit, push, PR, production deployment, hosting upgrade, live Gemini call or real model-weight download was made by this task.

## Direction and scope

The old screen had a coherent forest/paper palette, useful reference problem and a clear route to free practice. Those stay. The generated-template tells were the brochure-like hero, pastel feature-card grid, decorative statistics/art, many tracked-cap labels, repeated italic heading fragments and tiny functional text. The redesign leads with an actual worked-problem interaction and a study-notebook composition instead.

- **Retained:** TargetJEE wordmark; self-hosted Manrope/Newsreader; three semantic themes; all six routes; reference items and math; simulator/review/cards/history; strict extraction checks; request-scoped BYOK; existing research/limits.
- **Changed:** workbook opening, ruled task index, actual three-action practice ledger, quieter shell, source-first forge, readable labels/annotations, flatter practice-style choices, clear disabled/focus states, responsive data controls and mobile navigation focus/Escape behavior. Opening the page no longer awards a completed practice milestone.
- **Added, by the user's scope choice:** optional [on-device text assistance](LOCAL_ASSISTANT.md) and [safe Gemini diagnostics/deployment guidance](GEMINI_TROUBLESHOOTING.md). The subsequent generation-only continuation also repairs the provider-schema constraints and empty-diagram server/browser mismatch; it is not another redesign. Local text suggestions are not a local OCR/PDF/drill generator and never silently replace a failed forge result.
- **No stock or generated imagery:** the reference problem is the signature object. The original procedural Three.js illustration remains explicitly decorative, with no learner-data claim. No image slots, invented ranks, testimonials, account system or central learner storage were introduced.

## Hallmark evidence and honest limits

Hallmark v2.0.0 was read and reinstalled globally/project-locally using the reviewed installer with telemetry disabled. The existing brand and app-screen flow were retained rather than dealing a replacement marketing theme. Source remains ignored tooling, not bundled product code. The [earlier installation/audit receipt](DESIGN_TOOLING.md) is historical; the figures below belong to this redesign.

| Mechanical audit                                  |        Before |                                Final |
| ------------------------------------------------- | ------------: | -----------------------------------: |
| Static Floor / Reflex / warnings                  | 81 / 483 / 20 |                           0 / 0 / 10 |
| Six-route rendered Floor / open Reflex / warnings | 91 / 506 / 28 |                       **2 / 0 / 17** |
| Explicit Reflex exceptions                        |             0 | Three rules, 41 repeated occurrences |
| Screenshot capture                                |            30 |                                   30 |

**The final rendered audit exits 1; this is not an unqualified Hallmark pass.** The two remaining gate-73 findings are at the overview's and science page's KaTeX expressions. Inspection of `htmlAndMathml` output and the renderer's point-hit heuristic identifies the clipped screen-reader MathML layer being compared against the visible HTML glyph layer. The equations were visually inspected and retained with accessible MathML; no math was removed, shrunk or marked inaccessible to make the audit green. Application axe/contrast checks pass, but this does not waive a Hallmark Floor finding or certify every accessibility condition.

The three explicit Reflex decisions, recorded in the CSS stamp, are:

1. **7b:** retain the existing white surface/on-accent tokens and white high-contrast ink/control boundaries rather than tinting them for a house-style preference. Palette/boundary and actual three-theme browser contrast checks pass. The 38 occurrences are repeated uses of these tokens, not 38 separate design exemptions.
2. **39b:** practice-style choices include an explanation and grow above a 52px heuristic ceiling; they retain a generous touch target instead of clipping instructional text.
3. **49b:** linked academic citations wrap at narrow widths instead of hiding author/topic facts or causing horizontal scrolling. Actual wrapped action buttons in the 320/375px dashboard were fixed with shorter key-connect text and stacked data actions.

The 17 warnings were reviewed: error emphasis; long/descriptive controls; repeated functional control/container recipes; four/five font weights including brand/math/selected controls; two tabular-figure warnings despite the later explicit tabular rule; and five science headings whose numbering changed from `01` plus a middle dot to `1.`. The last warning is an inventory/parser acknowledgement gap, not five missing equations. Warning review is not a fabricated clean result.

### Preserved wiring and copy

The kept comparison records **18/18 unique links, 4/4 recorded fields and 14/14 recorded figures**. It reports 62/64 unchanged handler-source fingerprints, with two changes explicitly on record: source text edits now invalidate a checked preview, and tab changes clear obsolete diagnostics/results. Both handlers still exist; keyboard tab equivalents and regression tests were added. No route, input contract or functional script hook was removed. Original tests were not deleted or disabled; CSP/health expectations were extended to the deliberately new contract without changing their fixed-origin/no-secret requirements.

Major rewordings are listed in the stylesheet stamp and visible in the branch diff:

| Before                                        | After                                            |
| --------------------------------------------- | ------------------------------------------------ |
| Make your knowledge exam-ready.               | Your practice notebook.                          |
| Don't just solve it. See through the trap.    | Find the step that needs a second look.          |
| Looks familiar. Look a little closer.         | The sign is the question.                        |
| Your next breakthrough starts here.           | Your next steps                                  |
| A quieter space. A sharper edge.              | Work at your own pace.                           |
| Your books. A new perspective.                | Build from your books                            |
| Find your rhythm. Then find your pace.        | Practice without the noise                       |
| A mistake isn't the end of the story.         | Understand the attempt                           |
| A thoughtful coach, not another subscription. | AI is optional. Practice isn't locked behind it. |
| Give a good problem a sharper edge.           | Build a practice drill.                          |
| Your problem goes here.                       | The source problem                               |
| Every wrong turn has a reason.                | What makes it a drill?                           |
| Meet your next breakthrough.                  | Practice room.                                   |
| The science behind it (rail link)             | How it works (same destination)                  |

Tracked-cap pre-headings/status dots and heading-only italics were removed. Sentence-case labels retain acronyms such as API, PDF, JEE, BYOK, NTA, NRM and ECE; domain/expression data and formula strings were not lowercased. Metadata punctuation was normalized without altering values. The reset disclosure now includes optional model files. New Gemini failure/download/privacy disclosures are substantive task changes, not unexplained copy polish. `git diff 3f8dd03 -- app components lib` is the lossless copy/handler record; the ignored transformation ledger is `.arena/design/copy-changes.json`.

The same six URLs were rendered before/after. Artifacts remain out of Git: `.hallmark/before/`, `.hallmark/shots/`, `.hallmark/compare.html`, and `.arena/design/{before-render,final-render}.json`. The before run was development-mode and included six development evaluation/CSP errors; the final run uses the production build. A successful baseline-recording exit was not treated as a pass. Overview/forge desktop/mobile, the mobile dashboard and theme variants were visually inspected. The actual reference/review/recovery flow is covered separately by the browser suite, not inferred from empty-workspace screenshots.

### Finish review

Review was **in-thread**, not a claimed independent subagent review. The old layout gave the broad product sections more promotional colour and made the introduction feel lighter; the current version intentionally prioritizes reading and doing a problem. Actual defects found in the review—mobile drawer visibility/focus, compressed dashboard actions, tiny annotations, a gauge label on its ring, broad prose measure, misleading quota generalization and stale preview handoff—were corrected and recaptured. A settled-render inspection also caught the renderer's inline 260px canvas overriding its new 160px CSS slot and crossing the caption. The drawing buffer, mesh/camera/material parameters and pixel-ratio cap are unchanged; Three.js now leaves CSS sizing alone. A real-WebGL browser regression verifies canvas/slot dimensions, caption separation, decorative semantics, high-contrast hiding and reduced-motion hiding (explicitly skipped if WebGL2 is unavailable). Accessible math was kept despite the heuristic conflict. No photo/material slot remains to fill.

## Generation-only follow-through

The user's subsequent request was to finish persistent drill-generation errors within the existing scope, not add another AI feature or redesign. This continuation replaces the raw Pydantic provider payload with the supported-keyword projection in `backend/app/generation_schema.py`: supported enums now constrain A–D IDs/literals, exam-specific marks/pacing and conservative parameters; the request schema asks for exactly one problem like the prompt. Full final validation and the bounded algebra worker remain authoritative. Unsupported keywords in the old schema are a demonstrated compatibility/constraint gap, not proof of the original screenshots' exact failure. Empty diagram labels/descriptions are now rejected consistently by server and browser rather than issuing an unusable success.

Four new Main/Advanced × Flash/Lite browser cases consume author-owned successful fixtures first checked through the real local API/Pydantic/isolated SymPy pipeline, then verify preview, canonical math, no early session and a genuinely forged (not reference) handoff. Only Google's transport is mocked. Backend regressions retain strict format/algebra rejection and one-call/no-retry behavior; the coach budget is unchanged. Both browser CI workflows install the helper's Python dependencies. Details and the still-required live-provider gate are in [GEMINI_TROUBLESHOOTING.md](GEMINI_TROUBLESHOOTING.md). The production Vercel revision was freshly reconfirmed as the old `6a0f4ce`; no backend deployment access or authorized live request was available, and no production resolution is inferred from these local changes.

## Application verification

Local environment: Node 22.22.3, Python 3.11.2. Python 3.12 and Node 26 remain CI/container targets, **not fresh local passes**. No new remote CI/container run or public deployment is claimed.

| Gate                                               | Observed result                                                                                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint / TypeScript / formatting                   | Pass, zero lint warnings                                                                                                                                                  |
| Next 16.4.6 webpack production build               | Pass; all six app routes and fixed API proxy                                                                                                                              |
| Ruff lint / format; pytest with warnings as errors | **137 passed**                                                                                                                                                            |
| Vitest                                             | **103 passed**, including worker contract/cache/diagnostic tests                                                                                                          |
| Production-mode Playwright + axe                   | **27 passed / 3 public-only skipped**, including four checked-Forge handoffs, eight assistant/diagnostic cases, runtime-import failure-path and settled-orbit regressions |
| Local HTTP smoke and actual keyless health proxy   | Pass; keyless API revision is safely labelled `workspace`, not a fake commit                                                                                              |
| Semantic design/source audit                       | Pass; 11 AA/AAA text pairs and three boundary pairs per theme, fonts/research/motion/breakpoints/source-secret checks                                                     |
| npm audit / pip-audit                              | Zero known advisories at this review; not a general security guarantee                                                                                                    |
| Production dependency notices                      | 48 installed packages recorded; root notices preserved; regeneration is repeatable                                                                                        |

The real worker removes synthetic complete/partial cache entries with no network request. The actual bundled runtime imports under production CSP and reaches its **intercepted** model-config boundary; no config/weight request leaves the test browser. Load/answer/Stop lifecycle and inference errors are also exercised with runtime/worker mocks. **No real model load, GPU inference, output quality, artifact-size measurement or complete download redirect test was performed.**

**Still open:** authorized real-key Gemini acceptance; actual compatible-device model download/inference; independent converted-model/binary artifact license/integrity review; new deployment/public acceptance; the two unmodified Hallmark MathML heuristic flags. Accordingly `ALL_GATES_PASS=false`. The useful next problem material is a shareable original failing source and a safe diagnostic receipt after both reviewed services are deployed—never an API key in chat. The public frontend URL remains in GitHub About only, not README.
