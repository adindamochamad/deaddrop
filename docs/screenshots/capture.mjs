#!/usr/bin/env node
/**
 * Ambil screenshot dashboard untuk README.
 * Butuh: npm install puppeteer-core (sekali)
 *   node docs/screenshots/capture.mjs
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const URL_DEMO = process.env.DEMO_URL || "https://deaddrop.adindamochamad.com";
const CHROMIUM = process.env.CHROMIUM_PATH || "/snap/bin/chromium";

async function ambil(nama, aksi) {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const halaman = await browser.newPage();
  await halaman.setViewport({ width: 1400, height: 900 });
  await halaman.goto(URL_DEMO, { waitUntil: "networkidle2", timeout: 60000 });
  const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
  if (aksi) await aksi(halaman, tunggu);
  await halaman.screenshot({ path: join(__dirname, nama), fullPage: false });
  await browser.close();
  console.log("✓", nama);
}

mkdirSync(__dirname, { recursive: true });

await ambil("dashboard-overview.png");
await ambil("dashboard-rate-limit.png", async (p, tunggu) => {
  await p.click('[data-scenario="rate_limit"]');
  await tunggu(5000);
});
await ambil("dashboard-metrics.png", async (p) => {
  await p.evaluate(() => window.scrollTo(0, 0));
});
