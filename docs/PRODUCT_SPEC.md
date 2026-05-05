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
- mobile-first restaurant onboarding wizard
- restaurant profile setup
- ingredient, recipe, dish, and supplier setup without JSON editing
- OCR review safety
- supplier price alerts
- dish-level margin engine
- price simulator
- auditability of cost changes
- export and backup
- error handling
- deployability
- pricing plan and workspace license model
- founding partner lifetime access represented explicitly
- billing status visibility without card collection until payment provider is live

## Core Functional Areas

### Setup

- restaurant profile setup
- ingredient setup with mobile cards
- recipe builder with touch-friendly ingredient lines
- dish builder linked to recipes
- supplier setup
- first invoice setup through existing invoice intake
- onboarding progress checklist

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

### Billing And License Layer

- workspace plan status
- active/trial/lifetime/internal access states
- founding partner lifetime entitlement
- usage counters for invoices, OCR uploads, users, and restaurants
- billing provider seam with no live payment dependency yet
- no payment form or card collection in the current foundation

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
- restaurant onboarding works without desktop-only interaction
- workspace data remains isolated and protected
