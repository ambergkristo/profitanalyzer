import request from "supertest";

import { createApp } from "../apps/api/src/app.js";

function assertCondition(condition: boolean, message: string, failures: string[]) {
  if (!condition) {
    failures.push(message);
  }
}

async function main() {
  const failures: string[] = [];

  const demoApp = createApp({
    env: {
      ...process.env,
      NODE_ENV: "development",
      APP_MODE: "demo",
      AUTH_MODE: "dev",
      STORE_DRIVER: "memory",
      OCR_PROVIDER: "fixture"
    }
  });

  const configResponse = await request(demoApp).get("/api/app/config");
  const healthResponse = await request(demoApp).get("/health");
  const deepHealthResponse = await request(demoApp).get("/api/health/deep");
  const readinessResponse = await request(demoApp).get("/api/health/readiness");

  assertCondition(configResponse.status === 200, "App config should load.", failures);
  assertCondition(healthResponse.status === 200, "Health endpoint should load.", failures);
  assertCondition(deepHealthResponse.status === 200, "Deep health endpoint should load.", failures);
  assertCondition(readinessResponse.status === 200, "Readiness endpoint should load.", failures);
  assertCondition(readinessResponse.body.ok === true, "Demo readiness should pass.", failures);
  assertCondition(readinessResponse.body.productionReady === false, "Production readiness must remain false.", failures);
  assertCondition(
    JSON.stringify(configResponse.body).includes("SESSION_SECRET") === false,
    "App config must not expose secrets.",
    failures
  );
  assertCondition(
    JSON.stringify(readinessResponse.body).includes("postgresql://") === false &&
      JSON.stringify(readinessResponse.body).includes("postgres://") === false,
    "Readiness must not expose raw database connection strings.",
    failures
  );

  const pilotApp = createApp({
    env: {
      ...process.env,
      NODE_ENV: "development",
      APP_MODE: "pilot",
      AUTH_MODE: "dev",
      STORE_DRIVER: "memory"
    }
  });
  const protectedResponse = await request(pilotApp).get("/api/analytics/overview?dataset=pilot-workspace");
  assertCondition(protectedResponse.status === 401, "Pilot protected route should reject unauthenticated access.", failures);
  assertCondition(typeof protectedResponse.body.error?.requestId === "string", "Error responses should include requestId.", failures);
  assertCondition(protectedResponse.headers["x-request-id"] !== undefined, "Responses should include x-request-id header.", failures);

  const unknownRouteResponse = await request(demoApp).get("/api/ghost-route");
  assertCondition(unknownRouteResponse.status === 404, "Unknown API routes should return 404.", failures);
  assertCondition(unknownRouteResponse.body.error?.code === "not_found", "404 responses should use consistent error codes.", failures);

  const unsafeProductionApp = createApp({
    env: {
      ...process.env,
      NODE_ENV: "production",
      APP_MODE: "production",
      AUTH_MODE: "dev",
      STORE_DRIVER: "memory",
      OCR_PROVIDER: "fixture",
      APP_BASE_URL: "",
      API_BASE_URL: "",
      CORS_ORIGIN: ""
    }
  });
  const unsafeReadinessResponse = await request(unsafeProductionApp).get("/api/health/readiness");
  assertCondition(unsafeReadinessResponse.status === 200, "Unsafe production readiness should still respond.", failures);
  assertCondition(unsafeReadinessResponse.body.ok === false, "Unsafe production readiness should fail.", failures);
  assertCondition(
    Array.isArray(unsafeReadinessResponse.body.checks) &&
      unsafeReadinessResponse.body.checks.some((check: { status: string }) => check.status === "fail"),
    "Unsafe production readiness should report explicit fail checks.",
    failures
  );

  if (failures.length > 0) {
    console.log("FAIL runtime validation");
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS runtime validation");
  console.log("App config, health, and readiness endpoints respond safely.");
  console.log("Unsafe production configuration fails readiness without exposing secrets.");
  console.log("Protected routes still reject unauthenticated access outside demo mode.");
  console.log("Error responses include request ids and consistent safe error codes.");
}

void main();
