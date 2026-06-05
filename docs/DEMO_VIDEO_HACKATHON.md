# Demo Video Hackathon — DeadDrop (3 menit)

**Kriteria:** Rekaman prototipe yang jalan + penjelasan setup resilience + bagaimana agent bertahan saat infrastruktur gagal.  
**Audiens:** Orang awam (non-engineer) — hindari jargon, pakai analogi.

**Durasi target:** 2:45 – 3:00 (aman untuk upload).

### Opsi render otomatis (Remotion)

```bash
cd video
npm install
npm run render:demo          # MP4 motion + demo dashboard animasi (~3 menit)
# Narasi ElevenLabs:
# export ELEVENLABS_API_KEY=...
# npm run voiceover
# npm run render:demo:vo
```

Skrip narasi & API: [`ELEVENLABS_VOICEOVER.md`](ELEVENLABS_VOICEOVER.md)  
Output: `video/out/deaddrop-demo.mp4`

---

## Sebelum rekam — checklist

| Item | Catatan |
|------|---------|
| Dashboard | http://localhost:8000 **atau** https://deaddrop.adindamochamad.com |
| Server + MySQL | `docker compose up -d mysql` lalu `uvicorn` (lihat README) |
| Browser | Zoom 110%, tab bersih, notifikasi mati |
| Rekam | QuickTime / OBS — **1080p**, capture **seluruh browser** |
| Audio | Headset mic, ruangan tenang |
| Latihan | Baca skrip 1×, klik skenario 1× tanpa rekam |

**Urutan klik saat rekam:** `A — Normal` → `B — Rate Limit` → `D — Full Chaos`  
(Jangan klik terlalu cepat — tunggu log & angka metrics berubah.)

---

## Peta waktu (timeline)

| Waktu | Di layar | Topik (bahasa awam) |
|-------|----------|---------------------|
| 0:00–0:20 | Dashboard / slide masalah | Masalah: agent mati saat AI/layanan error |
| 0:20–0:45 | Header + hero strip | Apa itu DeadDrop — satu kalimat |
| 0:45–1:15 | Scroll arsitektur / dashboard | 4 lapis “pengaman” (tanpa istilah rumit) |
| 1:15–1:35 | Klik **A — Normal** | Demo: jalur mulus |
| 1:35–1:55 | Klik **B — Rate Limit** | Demo: AI penuh → ganti cadangan |
| 1:55–2:15 | Klik **D — Full Chaos** | Demo: banyak masalah, tetap selesai |
| 2:15–2:45 | Metrics + sidebar + neural bg | Bukti angka + TrueFoundry |
| 2:45–3:00 | Footer / live URL | Penutup + link |

---

## Skrip narasi lengkap (bahasa Indonesia — orang awam)

> Bicara santai, seperti menjelaskan ke teman non-teknis.  
> Saat klik demo, **tunjuk kursor** ke log dan angka yang berubah.

---

### [0:00 – 0:20] Hook — masalah yang relatable

**Di layar:** Buka dashboard (atau layar hitam 2 detik lalu dashboard).

**Narasi:**

> Bayangkan jam dua pagi. Tim harus deploy aplikasi.  
> Mereka pakai agent AI untuk bantu otomatis.  
> Tiba-tiba layanan AI-nya penuh — error, lambat, atau mati.  
> Agent-nya berhenti. Deploy gagal. Engineer harus bangun dan beresin manual.  
> Itu masalah yang DeadDrop coba selesaikan.

---

### [0:20 – 0:45] Apa itu DeadDrop

**Di layar:** Tunjuk logo, tagline, hero strip (“Infrastructure dies. Your agent doesn't.”).

**Narasi:**

> DeadDrop adalah agent deploy yang **tidak mudah menyerah**.  
> Kalau satu bagian infrastruktur bermasalah — misalnya model AI kehabisan kuota, tool deploy macet, atau output AI salah —  
> sistem kita **tidak langsung crash**.  
> Dia punya cadangan, pengecekan keamanan, dan memori langkah terakhir — seperti airbag bertingkat untuk pipeline deploy.

---

### [0:45 – 1:15] Setup resilience — 4 lapis (bahasa sederhana)

**Di layar:** Tunjuk area metrics, sidebar AI Gateway / Guardrails, legenda neural Input → Output. Boleh scroll ke kartu skenario sebentar.

**Narasi:**

> Resilience-nya kami bangun dalam empat lapis — mudah dipahami seperti ini:

> **Satu — Otak cadangan.**  
> Kami pakai TrueFoundry AI Gateway: ada beberapa model AI berurutan.  
> Kalau Claude penuh, otomatis coba Mistral, lalu Llama. Seperti antrian operator call center.

> **Dua — Alat cadangan.**  
> Lewat MCP Gateway: deploy, validasi, notifikasi.  
> Kalau tool deploy timeout, kami fallback ke notifikasi — job tetap jalan, tidak diam.

> **Tiga — Penjaga konten.**  
> Guardrails: sembunyikan API key, blok deploy production tanpa izin, cek YAML sebelum dieksekusi.  
> Output AI yang rusak ditangkap **sebelum** merusak server.

> **Empat — Memori checkpoint.**  
> Setiap langkah disimpan di database.  
> Kalau proses agent mati di tengah jalan, dia **lanjut dari langkah terakhir** — tidak dari nol.

> Di belakang layar, garis neural yang bergerak = setiap baris log agent mengalir seperti sinyal di jaringan AI.

---

### [1:15 – 1:35] Demo A — Normal

**Di layar:** Klik **A — Normal**. Tunjuk log hijau/cyan, status DONE, metrics Jobs Done naik.

**Narasi:**

> Skenario pertama: kondisi normal, tanpa gangguan.  
> Saya klik Normal — lihat log-nya: analyze, generate, validate, deploy.  
> Semua hijau. Job selesai DONE.  
> Ini baseline: ketika dunia baik-baik saja, agent kita stabil.

---

### [1:35 – 1:55] Demo B — Rate limit (AI penuh)

**Di layar:** Klik **B — Rate Limit**. Tunjuk baris WARN, “switching provider”, angka **Provider Switches** naik.

**Narasi:**

> Sekarang kita simulasikan AI utama kena rate limit — seperti antrian penuh.  
> Perhatikan: ada peringatan kuning, lalu sistem **ganti ke model cadangan**.  
> Counter Provider Switches naik — itu bukti fallback benar-benar jalan.  
> Job tetap selesai. Engineer tidak perlu intervene.

---

### [1:55 – 2:15] Demo D — Full chaos (wow moment)

**Di layar:** Klik **D — Full Chaos** (kartu dengan “Demo highlight”). Tunjuk banyak WARN/ERROR, lalu **DONE** + recovery time.

**Narasi:**

> Ini yang paling penting untuk juri: **Full Chaos**.  
> Bukan satu error — tapi kombinasi: provider down, tool di-quarantine, output AI jelek.  
> Log-nya ramai — merah, kuning — tapi lihat akhirnya: **status DONE**.  
> Tool failures dan recovery time tercatat.  
> Artinya: badai infrastruktur, agent tetap menyelesaikan tugas.

---

### [2:15 – 2:45] Bukti & stack hackathon

**Di layar:** Tunjuk metric cards (switches, tool failures, guardrails, total recovery), sidebar provider/guardrail, neural propagation.

**Narasi:**

> Angka-angka di atas bukan dekorasi — ini audit trail resilience.  
> Berapa kali ganti provider, berapa tool gagal, berapa kali guardrail blokir hal berbahaya.  
> Semua real-time lewat SSE ke dashboard ini.  

> DeadDrop dibangun untuk hackathon **Resilient Agents** dengan **TrueFoundry** — AI Gateway, MCP Gateway, Guardrails —  
> dan model lewat **AWS Bedrock**.  
> Satu platform untuk routing, tools, dan safety; agent kami yang orchestrate-nya.

---

### [2:45 – 3:00] Penutup

**Di layar:** Footer — live demo + GitHub.

**Narasi:**

> Intinya: infrastruktur boleh mati — **agent Anda tidak harus ikut mati**.  
> Coba live demo di deaddrop.adindamochamad.com, source di GitHub.  
> DeadDrop — infrastructure dies, your agent doesn't. Terima kasih.

---

## Glosarium — jika harus sebut istilah teknis

| Istilah | Penjelasan 5 detik untuk awam |
|---------|-------------------------------|
| LLM / model AI | “Otak bahasa” yang nulis config & keputusan deploy |
| Rate limit | Layanan bilang “terlalu banyak request, tunggu dulu” |
| Fallback | Plan B otomatis |
| MCP / tools | “Tangan” agent: deploy, cek file, kirim alert |
| Guardrails | Filter keamanan: sembunyikan password, blok hal gegabah |
| Checkpoint | Save game — lanjut dari titik terakhir |
| SSE / live log | Log yang update sendiri tanpa refresh |
| Circuit breaker | Stop panggil layanan yang lagi bermasalah, biar tidak makin parah |

---

## Versi Inggris singkat (opsional — 15 detik di akhir)

> If infrastructure fails, your deployment agent shouldn't.  
> DeadDrop adds backup AI models, safe tool fallbacks, guardrails, and checkpoints —  
> built on TrueFoundry and AWS Bedrock for the Resilient Agents Hackathon.  
> Live demo on deaddrop.adindamochamad.com.

---

## Alternatif: render video Remotion (tanpa rekam suara live)

Jika ingin B-roll atau video tanpa screen record:

```bash
cd video
npm install
npm run build   # atau: npx remotion render src/index.ts HackathonDemo out/deaddrop-hackathon.mp4
```

Lip-sync: rekam narasi di atas sebagai audio track, gabung di CapCut / DaVinci.  
Komposisi `HackathonDemo` sudah 3 menit (5400 frame @ 30fps).

---

## Tips menang hackathon (juri)

1. **Menit 1:55 Full Chaos** — emotional peak; jangan terpotong.  
2. **Sebut TrueFoundry + Bedrock** sekali jelas (menit 2:15).  
3. **Tunjuk perubahan angka** — juri suka bukti, bukan hanya kata.  
4. **Satu kalimat masalah + satu kalimat solusi** di awal — sudah ada di skrip.  
5. Upload MP4 < 100MB; cek format submission portal.

---

*File ini: panduan produksi. Untuk menjalankan prototipe saat rekam, lihat README Quick Start.*
