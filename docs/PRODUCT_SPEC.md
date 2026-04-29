# Product Specification

## Product Target

Profit Analyzer is now targeting a production SaaS-ready restaurant profit optimization platform.

Important:

- the current product is not production SaaS ready yet
- RM1-RM9 remain a strong controlled pilot and founding-partner foundation
- the next target is production SaaS readiness, not another demo-only layer

## Core Product Summary

Profit Analyzer helps restaurants:

- understand dish-level profitability
- react to supplier-cost movement
- review invoice and OCR drafts safely
- prioritize concrete profit actions
- simulate menu pricing decisions before acting

## Production SaaS Requirements

The production target requires:

- multi-tenant restaurant and workspace model
- authenticated users
- production database
- protected APIs
- mobile-first invoice workflow
- onboarding
- OCR review safety
- supplier price alerts
- dish-level margin engine
- price simulator
- auditability of cost changes
- export and backup
- error handling
- deployability

## Core Functional Areas

### Setup

- restaurant or workspace setup
- ingredient setup
- recipe setup
- dish setup
- supplier setup

### Decision Layer

- dashboard
- action ranking
- dish detail
- supplier alerts
- price simulator

### Invoice And OCR Layer

- invoice intake
- OCR draft intake
- review-confirm workflow
- cost history
- auditability

## Mobile-First Invoice Requirement

Invoice intake is a first-class mobile workflow.

The production target assumes:

- phone upload is normal behavior
- browser file input and camera capture path is acceptable initially
- invoice review uses mobile-friendly line cards, not desktop-only tables
- unresolved lines are obvious on small screens
- confirm CTA remains visible and understandable on mobile

## Non-Goals

Still out of scope for the first production version:

- full accounting suite
- full inventory system
- POS integration
- supplier API sync
- blind OCR import
- enterprise multi-location complexity unless explicitly added later

## Core Success Criteria

- restaurant can onboard into a real workspace
- invoice and OCR review-confirm works safely
- dashboard produces concrete actions from real data
- dish detail and simulator support real decisions
- mobile invoice workflow works without desktop-only interaction
- workspace data remains isolated and protected
