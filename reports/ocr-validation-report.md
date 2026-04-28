# OCR Validation Report

## Summary

- Providers loaded: fixture:configured, external_env:not-configured, disabled:not-configured.
- Clean fixture used Fixture OCR Adapter, returned 7 lines, and quality gate marked quick_review.
- Blurry fixture returned 5 unresolved lines and confirmation returned HTTP 400.
- Cropped fixture returned 5 quality warnings and mode careful_review.
- Pre-confirm analytics stayed unchanged, then post-confirm created 4 cost-history records and 6 alerts with supplier-price reason codes present.
- External provider defaulted to unconfigured, returned HTTP 503, and produced 1 failed OCR job entries without mutating analytics.

