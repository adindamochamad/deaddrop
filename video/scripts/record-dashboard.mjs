#!/usr/bin/env node
/**
 * Rekam dashboard nyata ke public/demo-recording.webm (opsional).
 * Butuh: npx playwright install chromium, server di localhost:8000.
 *
 *   cd video && node scripts/record-dashboard.mjs
 */

import { chromium } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const URL_DASHBOARD = process.env.DEMO_URL || "http://localhost:8000";
const OUT = join(__dirname, "..", "public", "demo-recording.webm");

async function tungguLog(page, kataKunci, timeoutMs = 90000) {
  await page.waitForFunction(
    (kata) => {
      const el = document.getElementById("log-output");
      return el && el.textContent && el.textContent.includes(kata);
    },
    kataKunci,
    { timeout: timeoutMs },
  ).catch(() => {});
}

async function main() {
  mkdirSync(join(__dirname, "..", "public"), { recursive: true });

  console.log(`🎬 Rekam ${URL_DASHBOARD} → ${OUT}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: join(__dirname, "..", "public"), size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();

  await page.goto(URL_DASHBOARD, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const klikSkenario = async (nama) => {
    const btn = page.locator(`button:has-text("${nama}")`).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(8000);
    }
  };

  await klikSkenario("A — Normal");
  await tungguLog(page, "DONE");
  await klikSkenario("B — Rate Limit");
  await tungguLog(page, "DONE");
  await klikSkenario("D — Full Chaos");
  await tungguLog(page, "DONE");
  await page.waitForTimeout(3000);

  await context.close();
  await browser.close();

  console.log("✅ Video tersimpan di folder public/ (nama hash Playwright).");
  console.log("   Rename ke demo-recording.webm jika ingin dipakai di Remotion.");
  console.log("   Scene 06_LiveDashboard sudah punya animasi UI tanpa file ini.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
