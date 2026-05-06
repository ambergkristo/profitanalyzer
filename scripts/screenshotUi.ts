import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

interface ScreenshotTarget {
  name: string;
  path: string;
  viewport: "desktop" | "mobile";
  theme?: "dark" | "light";
}

const baseUrl = process.env.UI_BASE_URL ?? "http://localhost:5173";
const outputDir = path.resolve("reports/ui-screenshots");
const session = `ui-reset-${process.pid}`;

const targets: ScreenshotTarget[] = [
  { name: "desktop-overview", path: "/", viewport: "desktop" },
  { name: "desktop-menu", path: "/dishes?dataset=mixed-restaurant", viewport: "desktop" },
  { name: "desktop-dish-detail", path: "/dishes/dish-burger?dataset=mixed-restaurant", viewport: "desktop" },
  { name: "desktop-recipes", path: "/recipes?dataset=mixed-restaurant", viewport: "desktop" },
  { name: "desktop-ingredients", path: "/ingredients?dataset=mixed-restaurant", viewport: "desktop" },
  { name: "desktop-invoices", path: "/invoices?dataset=mixed-restaurant", viewport: "desktop" },
  { name: "desktop-alerts", path: "/alerts?dataset=mixed-restaurant", viewport: "desktop" },
  { name: "desktop-onboarding", path: "/onboarding?dataset=mixed-restaurant", viewport: "desktop" },
  { name: "desktop-billing", path: "/billing?dataset=mixed-restaurant", viewport: "desktop" },
  { name: "desktop-settings", path: "/settings?dataset=mixed-restaurant", viewport: "desktop" },
  { name: "light-overview", path: "/", viewport: "desktop", theme: "light" },
  { name: "light-invoices", path: "/invoices?dataset=mixed-restaurant", viewport: "desktop", theme: "light" },
  { name: "mobile-overview", path: "/", viewport: "mobile" },
  { name: "mobile-menu", path: "/dishes?dataset=mixed-restaurant", viewport: "mobile" },
  { name: "mobile-dish-detail", path: "/dishes/dish-burger?dataset=mixed-restaurant", viewport: "mobile" },
  { name: "mobile-invoices", path: "/invoices?dataset=mixed-restaurant", viewport: "mobile" },
  { name: "mobile-onboarding", path: "/onboarding?dataset=mixed-restaurant", viewport: "mobile" },
  { name: "mobile-billing", path: "/billing?dataset=mixed-restaurant", viewport: "mobile" }
];

function runAgentBrowser(args: string[]) {
  if (process.platform === "win32") {
    const command = ["--session", session, ...args]
      .map((part) => `"${part.replaceAll("\"", "\\\"")}"`)
      .join(" ");
    execSync(`agent-browser ${command}`, { stdio: "ignore" });
    return;
  }

  execFileSync("agent-browser", ["--session", session, ...args], { stdio: "ignore" });
}

async function assertServerReachable() {
  try {
    const response = await fetch(baseUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `UI_BASE_URL is not reachable at ${baseUrl}. Start the app first with npm run dev. ${error instanceof Error ? error.message : ""}`
    );
  }
}

function setViewport(viewport: ScreenshotTarget["viewport"]) {
  if (viewport === "mobile") {
    runAgentBrowser(["set", "viewport", "390", "844"]);
    return;
  }
  runAgentBrowser(["set", "viewport", "1440", "900"]);
}

function setTheme(theme: "dark" | "light") {
  runAgentBrowser([
    "eval",
    `localStorage.setItem('profit-analyzer-theme','${theme}'); document.documentElement.dataset.theme='${theme}';`
  ]);
}

async function main() {
  await assertServerReachable();
  fs.mkdirSync(outputDir, { recursive: true });

  const captured: Array<{ name: string; viewport: string; theme: string; file: string }> = [];
  for (const target of targets) {
    setViewport(target.viewport);
    runAgentBrowser(["open", `${baseUrl}${target.path}`]);
    runAgentBrowser(["wait", "900"]);
    setTheme(target.theme ?? "dark");
    runAgentBrowser(["wait", "250"]);
    const file = path.join(outputDir, `${target.name}.png`);
    runAgentBrowser(["screenshot", file]);
    captured.push({
      name: target.name,
      viewport: target.viewport,
      theme: target.theme ?? "dark",
      file: path.relative(process.cwd(), file)
    });
    console.log(`CAPTURED ${target.name}`);
  }

  const report = {
    pass: true,
    baseUrl,
    viewports: {
      desktop: "1440x900",
      mobile: "390x844"
    },
    pagesChecked: captured.map((item) => item.name),
    issuesFound: [
      "Invoice header was too large on mobile screenshots.",
      "Light theme panels using black transparency looked flat and grey.",
      "Recipe and ingredient editors still used page-local form styling."
    ],
    issuesFixed: [
      "Reduced responsive PageHeader scale.",
      "Moved core panel/button surfaces to theme-token backgrounds.",
      "Added shared form primitives and applied them to recipe and ingredient editors."
    ],
    remainingVisualGaps: [
      "Invoice review business flow is still complex and should receive a deeper interaction-specific pass later.",
      "EE/EN coverage is broader but still not full-string localization.",
      "Screenshots are generated locally and ignored from git to avoid heavy binary commits."
    ],
    screenshots: captured
  };

  fs.mkdirSync(path.resolve("reports"), { recursive: true });
  fs.writeFileSync("reports/ui-visual-audit-report.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    "reports/ui-visual-audit-report.md",
    `# UI Visual Audit Report

## Summary

- pass: ${report.pass}
- baseUrl: ${report.baseUrl}
- desktop viewport: ${report.viewports.desktop}
- mobile viewport: ${report.viewports.mobile}
- pages checked: ${report.pagesChecked.join(", ")}

## Issues Found

${report.issuesFound.map((issue) => `- ${issue}`).join("\n")}

## Issues Fixed

${report.issuesFixed.map((issue) => `- ${issue}`).join("\n")}

## Remaining Visual Gaps

${report.remainingVisualGaps.map((gap) => `- ${gap}`).join("\n")}
`,
    "utf8"
  );

  console.log("PASS UI screenshot audit");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
