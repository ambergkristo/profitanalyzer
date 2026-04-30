# Observability

## Current Foundation

Phase 14 adds the first operational observability layer.

Current scope:

- structured request logging
- request ids
- safe error logging
- safe readiness reporting
- runtime validation commands

## Logging Rules

- production logs should be structured
- development logs may stay human-readable
- secrets must not be logged
- raw OCR provider payloads must not be logged by default
- request id must be attached to error responses

## Current Endpoints

- `GET /health`
- `GET /api/health/deep`
- `GET /api/health/readiness`

## What Exists Now

- request/response operational context
- readiness checks for env, auth mode, storage mode, and OCR provider config
- consistent safe error shape for API failures

## What Does Not Exist Yet

- metrics backend
- alerting
- distributed tracing
- incident dashboards
- production log shipping

This is an observability foundation, not a complete production monitoring stack.
