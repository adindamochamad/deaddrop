#!/usr/bin/env node
/**
 * Generate voiceover.mp3 dari segmen teks via ElevenLabs API.
 * Butuh: ELEVENLABS_API_KEY, ffmpeg di PATH.
 *
 * Usage:
 *   cd video && ELEVENLABS_API_KEY=sk_... node scripts/generate-elevenlabs.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_VIDEO = join(__dirname, "..");
const SEGMEN_PATH = join(__dirname, "voiceover-segments.json");
const TMP_DIR = join(ROOT_VIDEO, "scripts", ".voiceover-tmp");
const OUT_MP3 = join(ROOT_VIDEO, "public", "voiceover.mp3");

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

if (!API_KEY) {
  console.error("❌ Set ELEVENLABS_API_KEY (https://elevenlabs.io)");
  process.exit(1);
}

function cekFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
  } catch {
    console.error("❌ ffmpeg tidak ditemukan. Install: brew install ffmpeg");
    process.exit(1);
  }
}

async function sintesisTeks(teks, pathKeluar) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: teks,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.2,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${err}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(pathKeluar, buffer);
  console.log(`  ✓ ${pathKeluar.split("/").pop()} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

function durasiMp3(pathFile) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${pathFile}"`,
    { encoding: "utf8" },
  );
  return parseFloat(out.trim());
}

function sesuaikanDurasi(pathMasuk, pathKeluar, targetDetik) {
  const durasiAsli = durasiMp3(pathMasuk);
  if (durasiAsli <= 0.1) return;

  const rasio = targetDetik / durasiAsli;
  // atempo hanya 0.5–2.0 per filter; chain jika perlu
  const filters = [];
  let sisa = rasio;
  while (sisa > 2.0) {
    filters.push("atempo=2.0");
    sisa /= 2.0;
  }
  while (sisa < 0.5) {
    filters.push("atempo=0.5");
    sisa /= 0.5;
  }
  if (Math.abs(sisa - 1) > 0.03) {
    filters.push(`atempo=${sisa.toFixed(3)}`);
  }

  if (filters.length === 0) {
    execSync(`cp "${pathMasuk}" "${pathKeluar}"`);
    return;
  }

  execSync(
    `ffmpeg -y -i "${pathMasuk}" -filter:a "${filters.join(",")}" "${pathKeluar}"`,
    { stdio: "ignore" },
  );
}

function gabungSegmen(daftarFile, pathKeluar) {
  const listPath = join(TMP_DIR, "concat.txt");
  const isi = daftarFile.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n");
  writeFileSync(listPath, isi);
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${pathKeluar}"`,
    { stdio: "inherit" },
  );
}

async function main() {
  cekFfmpeg();
  const segmen = JSON.parse(readFileSync(SEGMEN_PATH, "utf8"));

  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });
  mkdirSync(join(ROOT_VIDEO, "public"), { recursive: true });

  console.log(`🎙️  ElevenLabs — voice ${VOICE_ID}, model ${MODEL_ID}`);
  console.log(`   ${segmen.length} segmen\n`);

  const fileSiap = [];

  for (let i = 0; i < segmen.length; i++) {
    const s = segmen[i];
    const raw = join(TMP_DIR, `${String(i).padStart(2, "0")}_${s.id}_raw.mp3`);
    const fit = join(TMP_DIR, `${String(i).padStart(2, "0")}_${s.id}_fit.mp3`);

    console.log(`[${i + 1}/${segmen.length}] ${s.id} (target ${s.durasiDetik}s)`);
    await sintesisTeks(s.teks, raw);
    sesuaikanDurasi(raw, fit, s.durasiDetik);
    const dur = durasiMp3(fit);
    console.log(`     durasi setelah fit: ${dur.toFixed(1)}s\n`);
    fileSiap.push(fit);
  }

  console.log("🔗 Menggabungkan segmen…");
  gabungSegmen(fileSiap, OUT_MP3);

  const total = durasiMp3(OUT_MP3);
  const targetTotal = segmen.reduce((a, s) => a + s.durasiDetik, 0);
  console.log(`\n✅ Done: ${OUT_MP3}`);
  console.log(`   Total duration: ${total.toFixed(1)}s (target ~${targetTotal}s)`);
  console.log("\nRender video dengan audio:");
  console.log('   npm run render:demo:vo');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
