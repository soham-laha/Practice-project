# Hallmark installation and design audit

> **Historical review:** this document records the earlier merged audit. The subsequent requested workbook redesign, local assistant and new diagnostic/test results are recorded in [WORKBOOK_REDESIGN.md](WORKBOOK_REDESIGN.md); neither report implies production deployment or live model acceptance.

Date: **16 November 2026**. This is an **audit of the existing app**, not a full Hallmark redesign or a claim that it passed every Hallmark rule.

## Installation receipt

The user-requested global install completed with telemetry/security-audit telemetry disabled:

```bash
DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 npx --yes skills@1.8.1 add nutlope/hallmark -g --agent codex --skill hallmark --yes --copy
```

A project-local copy was also installed with the same command **without `-g`** so this workspace can use it without relying solely on files outside the repository. Neither install changes the app's production npm dependencies or enables a hook.

| Item                       | Verified value                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Installer                  | `skills@1.8.1`; Node ≥22.20.0 (local Node 22.22.3 qualifies)                                         |
| Upstream                   | [Nutlope/hallmark](https://github.com/Nutlope/hallmark), MIT                                         |
| Reviewed upstream revision | `04977e15f3dfd6ee4b74c887dac3eb52665d6c92`                                                           |
| Skill frontmatter          | `hallmark`, version `2.0.0`                                                                          |
| Global location            | `~/.agents/skills/hallmark`                                                                          |
| Workspace location         | `.agents/skills/hallmark`                                                                            |
| Project lock               | `skills-lock.json`, computed hash `e5d4ee5cf0af2dcc81a23ef49b587fbfd71236ff9f9df9da12d3bf347e26e572` |
| Byte verification          | All **187 upstream skill files** in **both** installations match the reviewed Git tree's blob hashes |

`skills list -g --json` and `skills list --json` both report the installation. The upstream instructions and audit/render scripts were inspected before use. Matching upstream bytes is provenance, **not a security certification of every bundled script or asset**. A later install from `nutlope/hallmark` follows its then-current default branch; review changes before updating, and keep the lock/receipt in sync.

The copied skill, including its themes and deliberately failing lint fixtures, is ignored in Git. ESLint, TypeScript, Prettier and the product palette/source audit exclude these tooling directories, **not** `app/`, `components/`, `lib/` or first-party tests. The Docker context already allowlists only backend/data/license files. The skill is not imported by the application, bundled in Next output or required by production CI. Its generated shots/reports remain ignored.

## Pre-flight: preserve the actual product

- **Audience/use:** JEE Main/Advanced learners building a finite drill and reviewing a misconception, not a SaaS marketing funnel.
- **System kept:** self-hosted Manrope + Newsreader (`app/layout.tsx:2`), warm-paper/forest and three semantic palettes (`app/globals.css:1`), existing routes, local data, equations and reference workflow.
- **Genre/scope:** editorial treatment inside an **app**; `--scope app` avoids applying marketing hero/word-budget rules to a working simulator/dashboard. No photo slots, made-up testimonials or new theme were introduced.
- **Introduced:** installation/receipt, an evidence-led audit, clearer key-state wording, stronger field boundaries and a no-shrink exam selector. No wholesale redesign, hook, paid image generation or external asset fetch.

## What actually ran

Static audit:

```bash
node .agents/skills/hallmark/scripts/sloplint.mjs app components --genre editorial --scope app --json
```

Rendered audit used the production Next build, all six routes (`/`, `/forge`, `/simulator`, `/dashboard`, `/flashcards`, `/science`) and Hallmark's eight widths from 320 to 1920px. `puppeteer-core@24.39.1` was installed **only in ignored `.arena/hallmark-browser/`**, not `package.json`. A local executable wrapper supplies `scripts/browser.mjs`'s already-installed Chromium binary, sandbox-compatible flags and library environment through `CHROME_PATH`; `HALLMARK_PUPPETEER` points to that isolated tooling prefix. Browser web security remains enabled.

The before command added `--render --before` and six `--url http://localhost:3000/...` arguments. The after command omitted `--before`. Each captured **30 screenshots** (desktop folds, desktop full-page and mobile full-page). The audit uses anonymous, empty-workspace screens; it never loads a real key or learner backup. Baseline/final screenshots were visually inspected, including desktop overview/forge and mobile overview/forge/dashboard.

| Mechanical result       | Before | After small defect fixes |
| ----------------------- | -----: | -----------------------: |
| Hallmark Floor findings |     96 |                       89 |
| Reflex findings         |    506 |                      506 |
| Warnings                |     30 |                       30 |
| Source files inspected  |     24 |                       24 |
| Render tier             |    ran |                      ran |

**The after audit exits 1. It is not a Hallmark pass.** Counts include opinionated house-style rules, repeated source occurrences, tiny spacing differences, third-party math rendering heuristics and genuine design debt; they are not 625 distinct application failures. The `--before` recording mode exits successfully even with findings, so its exit code was not used as a pass. No waiver/stamp was added to manufacture a zero result.

## Findings and the lightest sensible follow-up

| Finding / evidence                                                                                                                                                         | Decision                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fixed:** forge field edges measured **1.33:1** against their surface (render gate 40).                                                                                   | Dedicated `--control-line` tokens in all three themes and ≥3:1 checks against background/surface/surface-alt. The final render no longer reports this gate. Decorative dividers remain quieter.                                                                                                 |
| **Fixed:** exam choices wrapped at 320/768/1280px (49a).                                                                                                                   | Keep the exam group from shrinking, prevent label wrapping and allow the title row to wrap. Those exam-control findings are gone.                                                                                                                                                               |
| **Fixed:** “connected” falsely suggested a tested key (honesty/state concern).                                                                                             | “Key saved”; format-only explanation, access checked on use, no paid validation call on Save. Browser regression covers it.                                                                                                                                                                     |
| **Partly improved:** tiny functional/provenance text (`app/globals.css:187`, `:391`, `:433`; gate 75).                                                                     | Removed the coach's explicit 8px disclaimer override. A broader readable type-scale pass remains advisable; it should be reviewed with the existing three-theme/math layouts, not mechanically enlarged everywhere.                                                                             |
| **Still present:** tracked-cap eyebrows and repeated italic heading fragments (`app/page.tsx:105`, `components/forge.tsx:119`, `components/dashboard.tsx:162`; 54/67/38i). | The strongest “generated template” tells. A focused copy/type polish should replace decorative pre-headings with plain useful headings and use the editorial face consistently rather than italicising one phrase in nearly every heading. Not silently rewritten by this installation request. |
| **Still present:** repeated rounded feature tiles and nested simulator selections (`app/page.tsx:164`, `components/simulator.tsx:297`; 3/4).                               | A full composition pass could lead with the real item → attempt → repair workflow instead of equal feature tiles. Keep actual selection controls and their behavior; do not delete them just because their class contains “card.”                                                               |
| **Still present:** three source tabs and some data/coach buttons wrap at 320px (49a).                                                                                      | A mobile-control polish can shorten visible labels or reflow controls while preserving accessible names/actions. No horizontal-overflow failure was reported; wrapping is not by itself proof of inaccessibility.                                                                               |
| **Still present:** CSS literal shadows/colours and off-scale spacing (48/24b).                                                                                             | Tokenise gradually in a deliberate style pass. Replacing the entire stylesheet or importing a catalogue theme is unnecessary.                                                                                                                                                                   |
| **Needs human interpretation:** gate 73 flags the decorative hero sticker/action region and KaTeX's overlapping glyph spans.                                               | Desktop screenshot does not show the sticker hiding the action; KaTeX deliberately layers math spans. Retain these raw findings, do not call them confirmed collisions or modify KaTeX to satisfy the heuristic.                                                                                |

Recommended next design scope: **a bounded polish**, retaining fonts/palette/content/wiring. A full redesign is only justified if the owner also wants the overview's composition changed. Audit mode itself does not make that decision or guarantee “not AI-looking.”

Evidence in this workspace: `.arena/audit/hallmark-{static-before,render-before,render-after}.json`, `.hallmark/before/`, `.hallmark/shots/`, and `.hallmark/before.json`. These are generated local artifacts, not committed application assets. Product browser/axe results and remaining live-provider acceptance are recorded separately in [the final repository review](FINAL_REVIEW.md).
