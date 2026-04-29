# Technical Specification

## Current Technical Direction

This document now describes the target architecture for a launch-quality founding partner product candidate, not only an MVP thought exercise.

## Target Stack

### Frontend

- React
- Vite
- TypeScript

### Backend

- Express
- TypeScript
- shared deterministic calculation logic from `packages/core`

### Database

- planned Postgres adapter behind the existing store boundary
- database is not live yet

### OCR Provider

- env-configured OCR adapter
- fixture OCR remains available
- external provider remains optional and draft-only

### Deployment

- separate frontend and backend deploy
- safe production persistence strategy required
- validation commands act as release gates

## Store and Persistence Direction

Current supported drivers:

- `memory`
- `file`

Planned next driver:

- `database` via Postgres adapter behind the same store boundary

Key rule:

- application routes should not depend on a specific store implementation

## System Modules

### Frontend Modules

- onboarding
- dashboard
- dishes list
- dish detail
- simulator
- invoice intake
- OCR upload and review
- supplier alerts
- pilot and admin-like setup tools

### Backend Modules

- datasets and workspace config
- ingredients
- recipes
- dishes
- analytics
- simulation
- recommendation engine
- invoice drafts and confirmation
- OCR provider registry and job handling
- alerts
- export/import/reset
- health and environment validation

## Core Architecture Rules

- OCR output creates drafts only
- invoice parsing never updates current ingredient costs directly
- `review-confirm` is the only cost mutation path
- analytics derive from deterministic source data
- setup and persistence layers must not weaken invoice safety rules
- mobile invoice intake is a first-class product requirement

## Mobile-First Invoice Technical Requirement

The invoice workflow must support mobile web as a serious operating path.

Technical implications:

- browser file input with camera capture is acceptable for first launch-quality version
- review UI must support responsive line-card layout
- no critical invoice action can depend on desktop hover or wide tables
- no critical workflow should require horizontal scrolling as the main interaction

## API Surface Direction

Critical API groups:

- app config and health
- setup data APIs for ingredients, recipes, dishes
- analytics overview, actions, dishes, and dish detail
- simulation
- invoice parse, OCR upload, review-confirm
- alerts
- export/import/reset

## Deployment Profile

Target production-ish profile for founding partner launch:

- frontend deployed separately from backend
- backend with persistent storage
- env-based OCR configuration
- health checks
- validation commands run before deployment

## Production-Readiness Gaps

Not live yet:

- database persistence
- auth
- billing
- external OCR benchmark confidence on real invoices
- monitoring
- production backup strategy
- full security hardening

## Release Gates

Validation commands are part of the technical release boundary:

- `npm run validate:synthetic`
- `npm run validate:demo`
- `npm run validate:invoice`
- `npm run validate:ocr`
- `npm run validate:ocr:provider`
- `npm run validate:pilot`
- `npm run validate:env`

Future gates should include:

- private OCR benchmark workflow
- mobile viewport smoke coverage
- deployment readiness checks
