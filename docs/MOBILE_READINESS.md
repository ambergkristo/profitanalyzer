# Mobile Readiness

## Product Rule

The product is not considered founding-partner or production-path ready if a critical workflow requires a desktop-only layout.

## Core Requirement

Invoice intake is mobile-first.

The app must support:

- opening the app on a phone
- choosing or taking an invoice photo through browser file input when available
- uploading image or PDF from mobile
- OCR creating a review draft only
- mobile review and confirm
- no cost update before confirmation

## Current UI Expectations

- invoice review uses card-style rows, not a wide desktop-only table
- unresolved lines stay visually obvious
- touch targets for confirm, ignore, and ingredient selection remain usable
- dashboard KPI cards stack cleanly
- top actions remain readable
- dish detail simulator remains usable on smaller screens
- no horizontal scrolling as the primary interaction

## Future Camera Note

No native mobile app is required yet.

For the current web product:

- browser file input with camera capture is acceptable
- mobile web or PWA-style use is acceptable if the UX is strong

## Mobile Smoke Checklist

- invoice upload mode renders
- invoice review-confirm CTA renders
- invoice page does not depend on a desktop-only table
- dashboard supplier/action surfaces still render
- dish detail simulator controls still render

## Current Validation

Run:

```bash
npm run validate:mobile
```

Current validation is a smoke gate, not full browser automation.

## Launch Blockers

The product must not be called launch ready if:

- invoice scan/upload is desktop-only
- invoice review-confirm is desktop-only
- unresolved OCR lines are unreadable on mobile
- dashboard/actions require horizontal scrolling to function
- dish simulator cannot be used from a phone-sized viewport
