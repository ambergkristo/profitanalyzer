import { describe, expect, it } from "vitest";

import { buildApiPath, buildDatasetPath } from "../api/client.js";

describe("api client dataset path builder", () => {
  it("adds a dataset query param when missing", () => {
    expect(buildDatasetPath("/api/analytics/overview", "mixed-restaurant")).toBe(
      "/api/analytics/overview?dataset=mixed-restaurant"
    );
  });

  it("appends a dataset query param to an existing query string", () => {
    expect(buildDatasetPath("/api/test?foo=bar", "low-margin-kitchen")).toBe(
      "/api/test?foo=bar&dataset=low-margin-kitchen"
    );
  });

  it("leaves the path untouched without a dataset id", () => {
    expect(buildDatasetPath("/api/analytics/overview")).toBe("/api/analytics/overview");
  });
});

describe("api client base URL builder", () => {
  it("keeps relative paths relative when no public API base URL is configured", () => {
    expect(buildApiPath("/api/app/config")).toBe("/api/app/config");
  });

  it("leaves absolute URLs untouched", () => {
    expect(buildApiPath("https://api.example.com/health")).toBe("https://api.example.com/health");
  });
});
