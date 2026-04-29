# Pilot Validation Report

## Summary

- Default app mode demo; storage memory; export schemaVersion 1.
- Pilot mode file store initialized successfully with readable=true and writable=true for local persistence validation.
- Import dry-run rejected bad ingredient and recipe references, then allowed a valid pilot workspace import before any write occurred.
- File store persisted recipe edits and dish recipe linkage, then restored both correctly after a full app reload using a temporary data directory.
- Invoice confirmation in file mode survived reload and continued to expose persisted supplier alerts plus ingredient cost history.
- Fixture OCR upload still worked with file storage, and OCR job metadata remained available after reload without mutating costs before confirmation.
- File-store reset restored the pilot recipe baseline and, after resetting the mixed dataset explicitly, cleared persisted mixed-restaurant alerts and cost-history records after a reload.
- Controlled pilot setup is coherent for local use: recipe editing, dish-to-recipe linkage, safer import validation, and file-backed persistence are working together without weakening invoice or OCR safety gates.

