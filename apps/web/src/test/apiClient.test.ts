import { describe, expect, it } from "vitest";

import { buildDatasetPath } from "../api/client.js";

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
