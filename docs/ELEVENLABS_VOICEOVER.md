# Skrip voiceover ElevenLabs — DeadDrop (3 menit)

Narasi **bahasa Indonesia**, nada santai untuk audiens awam.  
Sinkron dengan timeline Remotion di `video/src/constants.ts`.

**Total durasi video:** 3:00 (5400 frame @ 30 fps)

---

## Cara generate audio

```bash
cd video
# API key dari https://elevenlabs.io → Profile → API Key
export ELEVENLABS_API_KEY="sk_..."
# Opsional: voice ID (default Rachel)
export ELEVENLABS_VOICE_ID="21m00Tcm4TlvDq8ikWAM"

npm run voiceover
# Hasil: public/voiceover.mp3

# Render video dengan narasi:
npm run render:demo:vo
```

Butuh **ffmpeg** di PATH (`brew install ffmpeg`).

---

## Segmen per scene (copy-paste ke ElevenLabs manual)

### 1. HOOK — 0:00–0:18 (18 detik)

> Jam dua pagi. Tim harus deploy. Agent AI-nya dipakai untuk bantu otomatis.  
> Tiba-tiba layanan AI penuh — error empat dua sembilan, rate limit.  
> Agent berhenti. Deploy gagal. Engineer harus bangun dan beresin manual.  
> Itu masalah yang DeadDrop selesaikan.

---

### 2. INTRO — 0:18–0:32 (14 detik)

> DeadDrop: agent deploy yang tidak mati saat infrastruktur bermasalah.  
> Infrastructure dies. Your agent doesn't.  
> Dibangun untuk hackathon Resilient Agents — TrueFoundry dan AWS Bedrock.

---

### 3. ARSITEKTUR — 0:32–0:54 (22 detik)

> Empat lapis pengaman. Satu: TrueFoundry AI Gateway — kalau model utama penuh, otomatis ganti provider.  
> Dua: state machine — setiap langkah punya checkpoint, bisa lanjut dari situ.  
> Tiga: MCP tools dengan circuit breaker — kalau GitHub atau deploy error, ada fallback.  
> Empat: guardrails — manifest jelek diblok sebelum ke production.

---

### 4. LIVE DEMO — 0:54–2:22 (88 detik)

> Ini dashboard live di deaddrop titik adindamochamad dot com.  
> Latar belakang neural network — setiap event agent mengirim sinyal visual.  
> Kita klik skenario A — Normal. Job jalan mulus: analisis, generate manifest, deploy staging. Nol switch, nol failure.  
> Sekarang skenario B — Rate Limit. Claude kena empat dua sembilan. Circuit breaker buka, pindah ke Mistral. Recovery satu koma satu detik. Job tetap DONE.  
> Terakhir D — Full Chaos. Outage, quarantine, YAML rusak — semua aktif. Guardrail blok, deploy di-quarantine, notifier jadi cadangan. Tiga failure ditangani, tanpa langkah manual.  
> Itu bukti: agent tetap menyelesaikan tugas meski banyak yang rusak.

---

### 5. METRICS — 2:22–2:42 (20 detik)

> Angka di dashboard bukan dekorasi. Jobs done, provider switches, tool failures, guardrail hits — semua tercatat.  
> Recovery time terukur. TrueFoundry gateway, MCP, guardrails — satu pipeline yang bisa diaudit.

---

### 6. CLOSING — 2:42–3:00 (18 detik)

> DeadDrop — resilient deploy agent untuk hackathon TrueFoundry kali AWS Bedrock.  
> Coba live demo di deaddrop titik adindamochamad dot com.  
> Kode open source di GitHub. Infrastructure dies. Your agent doesn't. Terima kasih.

---

## Tips ElevenLabs (UI manual)

| Setting | Saran |
|---------|--------|
| Model | `eleven_multilingual_v2` |
| Stability | 0,45–0,55 |
| Similarity | 0,75 |
| Style | 0,2 (natural) |
| Speed | 1,0 — sesuaikan jika segment kepanjangan |

Export per segmen MP3, lalu gabung dengan `npm run voiceover` (otomatis) atau paste satu teks panjang di atas.

---

## File terkait

| File | Fungsi |
|------|--------|
| `video/scripts/voiceover-segments.json` | Teks per segmen untuk script Node |
| `video/scripts/generate-elevenlabs.mjs` | Generate + concat → `public/voiceover.mp3` |
| `video/public/voiceover.mp3` | Input audio Remotion (gitignore) |
