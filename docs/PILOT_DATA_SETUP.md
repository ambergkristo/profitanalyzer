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
- import dry-run validation through `/api/import/validate`
- pilot-tools ingredient editing
- pilot-tools recipe editing
- pilot-tools dish price, sales, and recipe-link editing
- invoice cost intake for ongoing ingredient cost updates

Not supported yet:

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
- creating recipes
- editing recipe name, yield, and ingredient lines
- adding dishes linked to existing recipes
- editing dish name, recipe link, price, and sales volume
- validating import JSON before replacing the workspace
- exporting a dataset with schema metadata

Recipe setup drives dish cost and margin calculations. Update recipes before trusting dashboard margin output for a new pilot workspace.

## Import Dry-Run

Before replacing a pilot workspace:

1. paste or load JSON into `/pilot-tools`
2. run `Validate import`
3. review summary, warnings, and errors
4. only run import if the payload is valid

Validation checks:

- ingredient shape
- recipe shape
- recipe ingredient references
- dish shape
- dish recipe references
- supplier and invoice array shape if present

## Suggested First Customer Checklist

- confirm restaurant name used in the dataset label
- confirm top 10 to 20 ingredients by spend
- confirm recipes for the highest-volume dishes
- confirm top-selling dishes
- confirm current menu prices
- confirm starting sales estimates
- confirm recent supplier invoice examples
- identify one dish with known margin pressure

## Current Limitations

- file store is local JSON persistence, not a database
- import is JSON-based, not a polished onboarding workflow
- OCR is still review-first and not production-accuracy validated
