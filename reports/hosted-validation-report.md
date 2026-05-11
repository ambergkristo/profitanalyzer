# Hosted Validation Report

## Summary

- hostedValidationRan: false
- hostedApiConfigured: false
- hostedAppConfigured: false
- productionReady: false

## Checks

- health: skipped
- deepHealth: skipped
- readiness: skipped
- cors: skipped
- appConfig: skipped
- auth: skipped
- analytics: skipped
- invoiceSafety: skipped
- billing: skipped
- secretExposure: skipped

## Missing Inputs

- HOSTED_SMOKE_ENABLED=true
- HOSTED_API_BASE_URL
- HOSTED_APP_BASE_URL

## Blockers

- none

## Warnings

- Hosted smoke validation did not run because hosted environment inputs were not provided.

## Notes

- Set HOSTED_SMOKE_ENABLED=true, HOSTED_API_BASE_URL, HOSTED_APP_BASE_URL, HOSTED_TEST_EMAIL, and HOSTED_TEST_PASSWORD to run hosted smoke checks.
