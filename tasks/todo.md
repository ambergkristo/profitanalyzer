# MAX SPRINT 2

- [x] Upgrade core calculation contracts, decision ranking, price suggestion logic, and synthetic datasets.
- [x] Upgrade API overview, dish detail, actions, and simulation endpoints with tests.
- [x] Rebuild dashboard, dishes page, and dish detail simulator UI against the upgraded API.
- [x] Update README and any minimal roadmap status needed for Sprint 2.
- [x] Run install, typecheck, tests, build, lint, and audit.
- [ ] Commit `feat: strengthen decision layer and simulator`, push to `origin/main`, and verify `HEAD == origin/main`.

## Review

- Core now emits richer calculated dish metrics, explainable actions with reason codes, frontend-safe simulation results, and deterministic synthetic dataset coverage.
- API now exposes stronger overview, dish detail, ranked actions, and validated simulation responses without changing the original endpoint set.
- Frontend now shows decision-first dashboard sections, filterable dish performance, dish-level cost drivers, and a backend-driven price simulator.
- Validation passed for `npm install`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run lint`.
- `npm audit` still reports 5 moderate vulnerabilities in the Vitest/Vite dependency chain; the available fix requires `npm audit fix --force` and a breaking upgrade, so it was not applied in this sprint.
