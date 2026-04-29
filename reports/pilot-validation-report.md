# Pilot Validation Report

## Summary

- Default app mode demo; storage memory; external OCR configured false.
- Pilot mode file store initialized successfully with readable=true and writable=true for local persistence validation.
- Memory export returned dataset mixed-restaurant; invalid import returned HTTP 400; pilot import in file mode succeeded.
- File store persisted ingredient and dish edits, then restored them correctly after a full app reload using a temporary data directory.
- Invoice confirmation in file mode survived reload and continued to expose persisted supplier alerts plus ingredient cost history.
- Fixture OCR upload still worked with file storage, and OCR job metadata remained available after reload without mutating costs before confirmation.
- File-store reset restored the mixed restaurant baseline and cleared persisted alerts and cost-history records after a reload.
- Pilot persistence foundation is ready for controlled local use: memory mode remains the default, file mode preserves pilot edits, and invoice/OCR safety gates remain intact.

