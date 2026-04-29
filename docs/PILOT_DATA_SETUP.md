# Pilot Data Setup

## Purpose

Use this guide to prepare a controlled restaurant workspace before a pilot session.

Priority order:

1. get the menu and ingredient names into a usable baseline
2. confirm current ingredient costs
3. review dashboard actions and dish-level margin risk

## Current Supported Setup Paths

- seeded demo datasets
- JSON import through `/pilot-tools`
- pilot-tools ingredient editing
- pilot-tools dish price and sales editing
- invoice cost intake for ongoing ingredient cost updates

Not supported yet:

- full recipe editor in the UI
- spreadsheet import wizard
- persistent database-backed onboarding

## JSON Import Shape

Import expects the same shape returned by `GET /api/export`.

Required top-level fields:

- `dataset`
- `ingredients`
- `recipes`
- `dishes`
- `suppliers`
- `supplierProductMatches`
- `costHistory`
- `alerts`
- `invoices`
- `ocrJobs`

Important:

- import should target a pilot workspace id such as `pilot-workspace`
- importing into seeded demo datasets is blocked on purpose

## Minimum Data Quality Checklist

Prepare:

- ingredient names
- ingredient units
- current ingredient cost per unit
- recipe ingredient quantities
- dish price
- dish sales volume estimate

Recommended:

- supplier names
- initial supplier product aliases if known
- at least one recent supplier invoice for review-confirm testing

## Pilot Tools Editor

`/pilot-tools` now supports:

- adding ingredients
- editing ingredient name, unit, and cost
- adding dishes linked to existing recipes
- editing dish name, recipe link, price, and sales volume

Current limitation:

- recipe ingredient editing is still limited and may require JSON import or API use for larger menu changes

## Suggested First Customer Checklist

- confirm restaurant name used in the dataset label
- confirm top 10 to 20 ingredients by spend
- confirm top-selling dishes
- confirm current menu prices
- confirm recent supplier invoice examples
- identify one dish with known margin pressure

## Current Limitations

- file store is local JSON persistence, not a database
- import is JSON-based, not a polished onboarding workflow
- recipe editing remains limited
- OCR is still review-first and not production-accuracy validated
