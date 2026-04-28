import type { OcrProvider } from "../../../../packages/core/src/index.js";

export class OcrProviderNotConfiguredError extends Error {
  constructor(providerId: OcrProvider) {
    super(`OCR provider "${providerId}" is not configured.`);
    this.name = "OcrProviderNotConfiguredError";
  }
}

export class OcrProviderExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcrProviderExecutionError";
  }
}

export interface OcrUploadPayload {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  buffer: Buffer;
}
