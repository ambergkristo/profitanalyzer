import { describe, expect, it } from "vitest";

import { normalizeErrorBody } from "../src/http/errors.js";
import { validateEnvironmentProfile } from "../src/runtime/profile.js";

describe("runtime profile", () => {
  it("passes a safe demo profile", () => {
    const result = validateEnvironmentProfile({
      environment: {
        APP_MODE: "demo",
        AUTH_MODE: "dev",
        STORE_DRIVER: "memory",
        NODE_ENV: "development",
        OCR_PROVIDER: "fixture"
      },
      authMode: "dev"
    });

    expect(result.ok).toBe(true);
    expect(result.profile.appMode).toBe("demo");
  });

  it("blocks unsafe production defaults", () => {
    const result = validateEnvironmentProfile({
      environment: {
        APP_MODE: "production",
        AUTH_MODE: "dev",
        STORE_DRIVER: "memory",
        NODE_ENV: "production",
        OCR_PROVIDER: "fixture"
      },
      authMode: "dev"
    });

    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("APP_MODE=production"))).toBe(true);
  });

  it("requires database storage and rejects placeholder database credentials in production", () => {
    const result = validateEnvironmentProfile({
      environment: {
        APP_MODE: "production",
        AUTH_MODE: "password",
        STORE_DRIVER: "database",
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:password@db:5432/profit_analyzer",
        SESSION_SECRET: "replace-me-with-a-real-production-secret",
        APP_BASE_URL: "https://app.example.com",
        API_BASE_URL: "https://api.example.com",
        CORS_ORIGIN: "https://app.example.com",
        OCR_PROVIDER: "fixture",
        UPLOAD_STORAGE_DRIVER: "local_file"
      },
      authMode: "password"
    });

    expect(result.ok).toBe(false);
    expect(
      result.blockers.some((blocker) =>
        blocker.includes("DATABASE_URL cannot use documentation placeholder credentials")
      )
    ).toBe(true);
  });

  it("requires a session secret for password auth", () => {
    const result = validateEnvironmentProfile({
      environment: {
        APP_MODE: "pilot",
        AUTH_MODE: "password",
        STORE_DRIVER: "memory",
        NODE_ENV: "development",
        OCR_PROVIDER: "fixture"
      },
      authMode: "password"
    });

    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("SESSION_SECRET"))).toBe(true);
  });
});

describe("error normalization", () => {
  it("wraps message responses with a consistent error shape", () => {
    const normalized = normalizeErrorBody(
      {
        message: "Authentication is required."
      },
      401,
      "request-123"
    ) as {
      message: string;
      error: {
        code: string;
        message: string;
        requestId: string;
      };
    };

    expect(normalized.message).toBe("Authentication is required.");
    expect(normalized.error.code).toBe("unauthenticated");
    expect(normalized.error.requestId).toBe("request-123");
  });

  it("preserves safe extra metadata on error responses", () => {
    const normalized = normalizeErrorBody(
      {
        message: "OCR parse failed.",
        ocrJob: {
          id: "job-1"
        }
      },
      422,
      "request-456"
    ) as {
      ocrJob: {
        id: string;
      };
      error: {
        code: string;
      };
    };

    expect(normalized.ocrJob.id).toBe("job-1");
    expect(normalized.error.code).toBe("unprocessable_entity");
  });
});
