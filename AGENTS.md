# TargetJEE contributor guide

## Design changes

- Read `docs/DESIGN_RESEARCH.md`, the existing components and `app/globals.css`
  before changing a screen. Preserve Manrope/Newsreader, the three semantic
  themes, accessible math, reduced motion and the local-first practice flow.
- Hallmark is installed for design work. Read `.agents/skills/hallmark/SKILL.md`
  (or the global installation) when using it; setup and the actual audit are in
  `docs/DESIGN_TOOLING.md`. If absent, use that document's reviewed install.
- For an existing screen, audit first. Do not turn a bug fix or an installation
  request into a full redesign, replace the palette with a stock theme, or break
  routes, controls, state or tests to satisfy an opinionated style rule.
- Use real practice content, not invented learner results, social proof or
  calibration claims. A Hallmark install is not a taste/accessibility certificate.
- Keep skill sources, browser evidence and scratch files out of the product
  bundle and Git. Do not install skill hooks, generate paid imagery or send
  learner content to third parties merely to run a design audit.

## Verification and safety

Run the static, build, unit, design, browser and dependency checks in README
for application changes. Python targets 3.12; document a different local minor.
Provider mocks, keyless transport and successful live Gemini are separate gates.
Never use a real API key in a test, log, artifact, prompt, URL or chat. Do not
relax the symbolic verifier to release an invalid generated item. Preserve the
root license and third-party notices. The public frontend URL belongs in GitHub
About → Website, not README.
