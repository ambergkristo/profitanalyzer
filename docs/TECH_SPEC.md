# Technical Specification

## Production Target Architecture

### Frontend

- React
- Vite
- TypeScript

### Backend

- Express
- TypeScript
- shared deterministic decision logic from `packages/core`

### Database

- Postgres target

### Migration Layer

- Prisma or equivalent should be evaluated and selected

### Auth

- auth provider to be selected
- architecture must support protected API access and workspace scoping

### Storage

- file and image storage strategy needed for production invoice and OCR inputs

### OCR

- provider adapter remains the pattern
- OCR still creates drafts only

### Deployment

- separate frontend, backend, and DB deployment profile

### Observability

- logging
- health checks
- error handling
- validation gates

## Migration Note

Existing memory and file store support must not be abruptly destroyed.

The correct approach is:

- introduce DB adapter behind the existing store boundary
- preserve memory and file store for deterministic tests, demo, or local fallback where useful
- keep validation deterministic while the DB path is introduced

## Production Gaps Still Open

- database is not live yet
- auth is not live yet
- tenant isolation is not live yet
- billing is not live yet
- production file storage strategy is not finalized
- monitoring is not live yet
- backup and restore strategy is not finalized
- external OCR is not benchmarked on real invoices yet

## Technical Rules That Stay Fixed

- review-confirm remains mandatory
- no blind OCR import
- no direct ingredient-cost mutation from parser or OCR output
- mobile-first invoice workflow remains a product requirement
