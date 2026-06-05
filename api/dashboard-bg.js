/**
 * Background Three.js — Jaringan Neural interaktif (khas LLM / agent).
 * Setiap baris Agent Live Log memicu propagasi sinyal antar node.
 */
import * as THREE from 'three';

const kanvas = document.getElementById('three-bg');
if (!kanvas) {
  console.warn('[deaddrop-bg] Canvas #three-bg tidak ditemukan');
} else {
  const renderer = new THREE.WebGLRenderer({
    canvas: kanvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x07060c, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0e0a14, 0.04);

  const kamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  kamera.position.set(0, 1.5, 32);

  function lerpHalus(nilai, target, lambda, delta) {
    return THREE.MathUtils.lerp(nilai, target, 1 - Math.exp(-lambda * delta));
  }

  // ── Bangun arsitektur NN: input → hidden → hidden → output ──
  const UKURAN_LAPISAN = [5, 7, 7, 4];
  // Lebar penuh layar — tidak hanya di tengah (agar tidak tertutup panel log)
  const POSISI_X_LAPISAN = [-34, -12, 12, 34];
  const LABEL_LAPISAN = ['input', 'hidden', 'hidden', 'output'];

  const daftarNode = [];
  const posisiNode = [];

  UKURAN_LAPISAN.forEach((jumlah, idxLapisan) => {
    const x = POSISI_X_LAPISAN[idxLapisan];
    for (let n = 0; n < jumlah; n++) {
      const y = ((n / (jumlah - 1 || 1)) - 0.5) * 16;
      const z = (Math.sin(n * 1.7 + idxLapisan) * 1.2);
      const indeks = daftarNode.length;
      daftarNode.push({
        indeks,
        lapisan: idxLapisan,
        label: LABEL_LAPISAN[idxLapisan],
        aktivasi: 0,
        aktivasiTarget: 0,
      });
      posisiNode.push(x, y, z);
    }
  });

  const JUMLAH_NODE = daftarNode.length;
  const posisiNodeArr = new Float32Array(posisiNode);
  const warnaNodeArr = new Float32Array(JUMLAH_NODE * 3);
  const ukuranNodeArr = new Float32Array(JUMLAH_NODE);

  for (let i = 0; i < JUMLAH_NODE; i++) {
    warnaNodeArr[i * 3] = 0.55;
    warnaNodeArr[i * 3 + 1] = 0.48;
    warnaNodeArr[i * 3 + 2] = 0.75;
    ukuranNodeArr[i] = 0.35;
  }

  const daftarKoneksi = [];
  const posisiGaris = [];
  const warnaGarisArr = [];

  for (let i = 0; i < JUMLAH_NODE; i++) {
    const lapisanA = daftarNode[i].lapisan;
    if (lapisanA >= UKURAN_LAPISAN.length - 1) continue;
    for (let j = 0; j < JUMLAH_NODE; j++) {
      if (daftarNode[j].lapisan !== lapisanA + 1) continue;
      const indeksKoneksi = daftarKoneksi.length;
      daftarKoneksi.push({ dari: i, ke: j, indeksKoneksi });
      const ax = posisiNodeArr[i * 3];
      const ay = posisiNodeArr[i * 3 + 1];
      const az = posisiNodeArr[i * 3 + 2];
      const bx = posisiNodeArr[j * 3];
      const by = posisiNodeArr[j * 3 + 1];
      const bz = posisiNodeArr[j * 3 + 2];
      posisiGaris.push(ax, ay, az, bx, by, bz);
      warnaGarisArr.push(0.35, 0.32, 0.55, 0.35, 0.32, 0.55);
    }
  }

  const geoGaris = new THREE.BufferGeometry();
  geoGaris.setAttribute('position', new THREE.Float32BufferAttribute(posisiGaris, 3));
  geoGaris.setAttribute('color', new THREE.Float32BufferAttribute(warnaGarisArr, 3));
  const matGaris = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    blending: THREE.NormalBlending,
  });
  const jaringanGaris = new THREE.LineSegments(geoGaris, matGaris);

  const geoNode = new THREE.BufferGeometry();
  geoNode.setAttribute('position', new THREE.BufferAttribute(posisiNodeArr, 3));
  geoNode.setAttribute('color', new THREE.BufferAttribute(warnaNodeArr, 3));
  geoNode.setAttribute('size', new THREE.BufferAttribute(ukuranNodeArr, 1));

  const matNode = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uWaktu: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vWarna;
      varying float vAktivasi;
      uniform float uWaktu;
      void main() {
        vWarna = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float denyut = 0.85 + 0.15 * sin(uWaktu * 2.0 + position.x * 0.2 + position.y * 0.3);
        gl_PointSize = size * denyut * (280.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vWarna;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float inti = smoothstep(0.5, 0.08, d);
        float halo = smoothstep(0.55, 0.2, d) * 0.35;
        gl_FragColor = vec4(vWarna, inti + halo);
      }
    `,
  });

  const titikNode = new THREE.Points(geoNode, matNode);

  // Paket sinyal yang bergerak di sepanjang koneksi (propagasi log)
  const daftarPaket = [];
  const geoPaket = new THREE.BufferGeometry();
  const matPaket = new THREE.PointsMaterial({
    size: 0.42,
    color: 0xa5b4fc,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const titikPaket = new THREE.Points(geoPaket, matPaket);

  const grupJaringan = new THREE.Group();
  grupJaringan.add(jaringanGaris);
  grupJaringan.add(titikNode);
  grupJaringan.add(titikPaket);
  scene.add(grupJaringan);

  // Ring cahaya per lapisan (visual INPUT → OUTPUT)
  const warnaRing = [0x71717a, 0x8b5cf6, 0x7c3aed, 0x22d3ee];
  POSISI_X_LAPISAN.forEach((x, idx) => {
    const geoRing = new THREE.RingGeometry(0.4, 5.8, 48);
    const matRing = new THREE.MeshBasicMaterial({
      color: warnaRing[idx],
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geoRing, matRing);
    ring.position.set(x, 0, -2);
    grupJaringan.add(ring);
  });

  // Sesuaikan posisi jaringan dengan layout DOM (hindari area tertutup panel log)
  const offsetJaringan = new THREE.Vector3(0, 5, 0);
  const skalaJaringan = new THREE.Vector3(1, 1, 1);

  function sesuaikanLayoutJaringan(delta = 0.016) {
    const panelLog = document.querySelector('.panel-log');
    const sidebar = document.querySelector('.side-stack');
    const lebar = window.innerWidth;
    const tinggi = window.innerHeight;

    let targetX = 0;
    let targetY = 5.5;
    let targetSkala = 1.08;

    if (panelLog) {
      const kotak = panelLog.getBoundingClientRect();
      const pusatLogX = (kotak.left + kotak.right) / 2;
      const pusatLayarX = lebar / 2;
      targetX = (pusatLayarX - pusatLogX) * 0.028;
      targetY = 5 + (tinggi * 0.22 - kotak.top) * 0.025;
    }

    if (sidebar && lebar > 900) {
      const kotakSisi = sidebar.getBoundingClientRect();
      targetX -= (lebar - kotakSisi.left) * 0.004;
      targetSkala = 1.12;
    }

    offsetJaringan.x = lerpHalus(offsetJaringan.x, targetX, 2, delta);
    offsetJaringan.y = lerpHalus(offsetJaringan.y, targetY, 2, delta);
    const skalaBaru = lerpHalus(skalaJaringan.x, targetSkala, 2, delta);
    skalaJaringan.set(skalaBaru, skalaBaru, skalaBaru);

    grupJaringan.position.copy(offsetJaringan);
    grupJaringan.scale.copy(skalaJaringan);
  }

  const warnaGarisAttr = geoGaris.attributes.color.array;
  const warnaNodeAttr = geoNode.attributes.color.array;
  const ukuranNodeAttr = geoNode.attributes.size.array;

  const warnaDasar = new THREE.Color(0x6b5b95);
  const warnaTarget = new THREE.Color(0x6b5b95);
  const warnaSementara = new THREE.Color();

  let aktivitasGlobal = 0;
  let aktivitasTarget = 0;
  let waktuTerakhirLog = 0;
  const posKamera = new THREE.Vector3(0, 1.5, 32);
  const jam = new THREE.Clock();

  const warnaPerLevel = {
    info: new THREE.Color(0x5eb8c9),
    warn: new THREE.Color(0xc98a5e),
    success: new THREE.Color(0x5eb894),
    error: new THREE.Color(0xc95e7a),
  };

  const impulsPerLevel = { info: 0.35, warn: 0.55, success: 0.6, error: 0.8 };

  function pilihNodeAwal(ev) {
    const teks = (ev.message || '').toLowerCase();
    let lapisan = 0;
    if (/done|success|deployed|complete|output/.test(teks)) lapisan = 3;
    else if (/validat|guardrail|check/.test(teks)) lapisan = 2;
    else if (/generat|llm|model|provider|analyz/.test(teks)) lapisan = 1;
    else if (/pending|input|receiv|start/.test(teks)) lapisan = 0;
    else if (ev.job_id && ev.job_id !== 'system') lapisan = Math.floor(Math.random() * 3);

    const kandidat = daftarNode.filter((n) => n.lapisan === lapisan);
    return kandidat[Math.floor(Math.random() * kandidat.length)];
  }

  function bangunJalurPropagasi(nodeAwal) {
    const jalur = [];
    let nodeSaat = nodeAwal;
    while (nodeSaat.lapisan < UKURAN_LAPISAN.length - 1) {
      const koneksiKeluar = daftarKoneksi.filter((k) => k.dari === nodeSaat.indeks);
      if (!koneksiKeluar.length) break;
      const pilih = koneksiKeluar[Math.floor(Math.random() * koneksiKeluar.length)];
      jalur.push(pilih);
      nodeSaat = daftarNode[pilih.ke];
    }
    return jalur;
  }

  function tambahPaketSinyal(koneksi, warna, kecepatan, delay = 0) {
    daftarPaket.push({
      koneksi,
      progres: -delay,
      kecepatan,
      warna: warna.clone(),
      selesai: false,
    });
  }

  function propagasiLog(ev) {
    const level = ev.level || 'info';
    const warna = warnaPerLevel[level] || warnaPerLevel.info;
    const impuls = impulsPerLevel[level] || 0.35;

    warnaTarget.lerp(warna, 0.15);
    aktivitasTarget = Math.min(1, aktivitasTarget + impuls * 0.25);
    waktuTerakhirLog = performance.now();

    const nodeAwal = pilihNodeAwal(ev);
    const jalur = bangunJalurPropagasi(nodeAwal);

    nodeAwal.aktivasiTarget = 1;

    jalur.forEach((koneksi, idx) => {
      const delay = idx * 0.12;
      tambahPaketSinyal(koneksi, warna, 0.55 + impuls * 0.35, delay);
    });

    if (jalur.length === 0) {
      daftarNode[nodeAwal.indeks].aktivasiTarget = 1;
    }

    const teks = (ev.message || '').toLowerCase();
    if (/chaos|full_chaos|cascad/.test(teks)) {
      for (let r = 0; r < 3; r++) {
        const acak = daftarNode[Math.floor(Math.random() * JUMLAH_NODE)];
        bangunJalurPropagasi(acak).forEach((k, idx) => {
          tambahPaketSinyal(k, warnaPerLevel.error, 0.7, idx * 0.08 + r * 0.15);
        });
      }
    }
  }

  function deteksiKataKunci(pesan) {
    const teks = (pesan || '').toLowerCase();
    if (/chaos|outage|failed|error|blocked/.test(teks)) return 'error';
    if (/rate.?limit|timeout|retry|switch|fallback|quarantine/.test(teks)) return 'warn';
    if (/done|success|deployed|validated|complete/.test(teks)) return 'success';
    return 'info';
  }

  function padaEventLog(ev) {
    const level = deteksiKataKunci(ev.message) || ev.level || 'info';
    propagasiLog({ ...ev, level });
  }

  function perbaruiPaket(delta) {
    const posisiPaket = [];
    const warnaPaket = [];

    for (let p = daftarPaket.length - 1; p >= 0; p--) {
      const paket = daftarPaket[p];
      paket.progres += paket.kecepatan * delta;

      if (paket.progres < 0) continue;

      if (paket.progres >= 1) {
        const nodeTujuan = daftarNode[paket.koneksi.ke];
        nodeTujuan.aktivasiTarget = Math.min(1, nodeTujuan.aktivasiTarget + 0.85);
        paket.selesai = true;
        daftarPaket.splice(p, 1);
        continue;
      }

      const i = paket.koneksi.dari;
      const j = paket.koneksi.ke;
      const t = paket.progres;
      const ax = posisiNodeArr[i * 3];
      const ay = posisiNodeArr[i * 3 + 1];
      const az = posisiNodeArr[i * 3 + 2];
      const bx = posisiNodeArr[j * 3];
      const by = posisiNodeArr[j * 3 + 1];
      const bz = posisiNodeArr[j * 3 + 2];

      posisiPaket.push(
        ax + (bx - ax) * t,
        ay + (by - ay) * t,
        az + (bz - az) * t,
      );
      warnaPaket.push(paket.warna.r, paket.warna.g, paket.warna.b);

      const idxKoneksi = paket.koneksi.indeksKoneksi;
      const base = idxKoneksi * 6;
      const kekuatan = Math.sin(t * Math.PI) * 0.7 + 0.3;
      const tr = paket.warna.r * kekuatan;
      const tg = paket.warna.g * kekuatan;
      const tb = paket.warna.b * kekuatan;
      warnaGarisAttr[base] = lerpHalus(warnaGarisAttr[base], tr, 10, delta);
      warnaGarisAttr[base + 1] = lerpHalus(warnaGarisAttr[base + 1], tg, 10, delta);
      warnaGarisAttr[base + 2] = lerpHalus(warnaGarisAttr[base + 2], tb, 10, delta);
      warnaGarisAttr[base + 3] = warnaGarisAttr[base];
      warnaGarisAttr[base + 4] = warnaGarisAttr[base + 1];
      warnaGarisAttr[base + 5] = warnaGarisAttr[base + 2];
    }

    if (posisiPaket.length) {
      geoPaket.setAttribute('position', new THREE.Float32BufferAttribute(posisiPaket, 3));
      geoPaket.setDrawRange(0, posisiPaket.length / 3);
      titikPaket.visible = true;
    } else {
      titikPaket.visible = false;
    }
  }

  function perbaruiNode(delta, waktu) {
    for (let i = 0; i < JUMLAH_NODE; i++) {
      const node = daftarNode[i];
      node.aktivasi = lerpHalus(node.aktivasi, node.aktivasiTarget, 4, delta);
      node.aktivasiTarget *= 0.96;

      const lapisanNorm = node.lapisan / (UKURAN_LAPISAN.length - 1);
      const denyut = 0.08 + 0.06 * Math.sin(waktu * 1.2 + i * 0.4);
      const ukuran = 0.42 + node.aktivasi * 0.7 + denyut + aktivitasGlobal * 0.12;
      ukuranNodeAttr[i] = ukuran;

      warnaSementara.copy(warnaDasar);
      if (node.aktivasi > 0.05) {
        warnaSementara.lerp(warnaTarget, node.aktivasi * 0.85);
      }
      const lapisanTerang = 0.45 + lapisanNorm * 0.25;
      warnaNodeAttr[i * 3] = lerpHalus(warnaNodeAttr[i * 3], warnaSementara.r * lapisanTerang, 5, delta);
      warnaNodeAttr[i * 3 + 1] = lerpHalus(warnaNodeAttr[i * 3 + 1], warnaSementara.g * lapisanTerang, 5, delta);
      warnaNodeAttr[i * 3 + 2] = lerpHalus(warnaNodeAttr[i * 3 + 2], warnaSementara.b * lapisanTerang, 5, delta);
    }
    geoNode.attributes.color.needsUpdate = true;
    geoNode.attributes.size.needsUpdate = true;
  }

  function perbaruiGarisDiam(delta) {
    const warnaDiam = warnaDasar;
    for (let k = 0; k < daftarKoneksi.length; k++) {
      const base = k * 6;
      const adaPaket = daftarPaket.some(
        (p) => p.koneksi.indeksKoneksi === k && p.progres >= 0 && p.progres < 1,
      );
      if (!adaPaket) {
        warnaGarisAttr[base] = lerpHalus(warnaGarisAttr[base], warnaDiam.r * 0.5, 3, delta);
        warnaGarisAttr[base + 1] = lerpHalus(warnaGarisAttr[base + 1], warnaDiam.g * 0.5, 3, delta);
        warnaGarisAttr[base + 2] = lerpHalus(warnaGarisAttr[base + 2], warnaDiam.b * 0.5, 3, delta);
        warnaGarisAttr[base + 3] = warnaGarisAttr[base];
        warnaGarisAttr[base + 4] = warnaGarisAttr[base + 1];
        warnaGarisAttr[base + 5] = warnaGarisAttr[base + 2];
      }
    }
    geoGaris.attributes.color.needsUpdate = true;
    matGaris.opacity = lerpHalus(matGaris.opacity, 0.5 + aktivitasGlobal * 0.3, 3, delta);
  }

  function ukurLayar() {
    const lebar = window.innerWidth;
    const tinggi = window.innerHeight;
    kamera.aspect = lebar / tinggi;
    kamera.updateProjectionMatrix();
    renderer.setSize(lebar, tinggi, false);
    matNode.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  }

  function animasi() {
    requestAnimationFrame(animasi);
    const delta = Math.min(jam.getDelta(), 0.033);
    const waktu = jam.getElapsedTime();

    const logAktif = performance.now() - waktuTerakhirLog < 3500;
    if (!logAktif) aktivitasTarget *= 0.988;
    aktivitasGlobal = lerpHalus(aktivitasGlobal, aktivitasTarget, 2.5, delta);
    warnaDasar.lerp(warnaTarget, 1 - Math.exp(-1.5 * delta));

    matNode.uniforms.uWaktu.value = waktu;

    perbaruiPaket(delta);
    perbaruiNode(delta, waktu);
    perbaruiGarisDiam(delta);
    sesuaikanLayoutJaringan(delta);

    grupJaringan.rotation.y = Math.sin(waktu * 0.05) * 0.04;
    grupJaringan.rotation.x = Math.sin(waktu * 0.035) * 0.02;

    const targetZ = 32 - aktivitasGlobal * 2.5;
    const targetY = 1.5 + Math.sin(waktu * 0.15) * 0.2;
    posKamera.z = lerpHalus(posKamera.z, targetZ, 2.5, delta);
    posKamera.y = lerpHalus(posKamera.y, targetY, 2.5, delta);
    posKamera.x = lerpHalus(posKamera.x, 0, 2, delta);
    kamera.position.copy(posKamera);
    kamera.lookAt(0, 0, 0);

    denyutIdle(delta);

    renderer.render(scene, kamera);
  }

  ukurLayar();
  sesuaikanLayoutJaringan();
  window.addEventListener('resize', () => {
    ukurLayar();
    sesuaikanLayoutJaringan();
  });
  animasi();

  // Denyut idle agar jaringan tetap hidup saat menunggu juri menekan demo
  let waktuDenyutIdle = 0;
  function denyutIdle(delta) {
    waktuDenyutIdle += delta;
    if (waktuDenyutIdle < 9 || daftarPaket.length > 0 || aktivitasGlobal > 0.15) return;
    if (waktuDenyutIdle > 9.2) {
      waktuDenyutIdle = 0;
      const nodeAcak = daftarNode[Math.floor(Math.random() * Math.min(12, JUMLAH_NODE))];
      if (nodeAcak) {
        nodeAcak.aktivasiTarget = 0.5;
        bangunJalurPropagasi(nodeAcak).forEach((k, idx) => {
          tambahPaketSinyal(k, warnaDasar, 0.35, idx * 0.15);
        });
      }
    }
  }

  window.deaddropBg = { onEventLog: padaEventLog };
  console.info('[DeadDrop] Hackathon build — neural network ↔ live log');
}
