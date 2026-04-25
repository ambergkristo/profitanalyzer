# MAX SPRINT 3

- [x] Build canonical synthetic dataset metadata, validation reporting, and deterministic CLI outputs.
- [x] Add dataset-aware API endpoints and query handling with scenario coverage tests.
- [x] Add frontend scenario selector, scenario-aware loading, and safer dataset-aware dish detail routing.
- [x] Polish dashboard, dishes, dish detail, and simulator UX into a premium decision-first demo.
- [x] Update README and product validation docs for RM5/RM6.
- [x] Run install, typecheck, tests, build, lint, validate:synthetic, and audit.
- [ ] Commit `feat: add synthetic validation and premium decision UX`, push to `origin/main`, and verify `HEAD == origin/main`.

## Review

- Implemented deterministic synthetic dataset validation with JSON/Markdown reports and a root `npm run validate:synthetic` command.
- Added dataset-aware API and frontend scenario selection so dashboard, dishes, detail, and simulation can switch between mixed, low-margin, and high-margin demos.
- Validation passed for `npm install`, `npm run typecheck`, `npm test`, `npm run build`, `npm run lint`, and `npm run validate:synthetic`.
- `npm audit` still reports 5 moderate vulnerabilities in the transitive `vite` / `vitest` / `esbuild` chain; the available fix requires `npm audit fix --force` and a breaking major upgrade, so it was not applied.
