# UI Visual Audit Report

## Summary

- pass: true
- baseUrl: http://localhost:5174
- desktop viewport: 1440x900
- mobile viewport: 390x844
- pages checked: desktop-overview, desktop-menu, desktop-dish-detail, desktop-recipes, desktop-ingredients, desktop-invoices, desktop-alerts, desktop-onboarding, desktop-billing, desktop-settings, light-overview, light-invoices, mobile-overview, mobile-menu, mobile-dish-detail, mobile-invoices, mobile-onboarding, mobile-billing

## Issues Found

- Invoice header was too large on mobile screenshots.
- Light theme panels using black transparency looked flat and grey.
- Recipe and ingredient editors still used page-local form styling.

## Issues Fixed

- Reduced responsive PageHeader scale.
- Moved core panel/button surfaces to theme-token backgrounds.
- Added shared form primitives and applied them to recipe and ingredient editors.
- Polished invoice review into clearer intake, review-line, and confirmation areas.

## Remaining Visual Gaps

- Invoice review is screenshot-smoked, but full mobile browser interaction still needs dedicated automation later.
- EE/EN coverage is broader but still not full-string localization.
- Screenshots are generated locally and ignored from git to avoid heavy binary commits.

## Invoice Review Checks

- desktop screenshot: true
- mobile screenshot: true
- light screenshot: true
- expected flow: left intake, center review lines, right confirmation summary
- safety copy: Review required before costs update.
