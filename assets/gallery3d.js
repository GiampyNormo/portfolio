/* ================================================================
   EDOARDO GUTTUSO — GALLERIA 3D
   Scrollando si cammina in un corridoio-museo: i quadri sono i video
   elencati in assets/progetti.js. Click/tap su un quadro = video a
   tutto schermo (lightbox di app.js). Se WebGL o la libreria 3D non
   sono disponibili, la pagina torna da sola alle griglie classiche.
   ================================================================ */
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

const root = document.documentElement;
const section = document.querySelector('.g3d');

const fallbackToGrid = () => {
  root.classList.remove('has-3d');
  const stage = section && section.querySelector('.g3d-stage');
  if (stage) stage.innerHTML = '';
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pad = (n) => String(n).padStart(2, '0');
const ytId = (url) => {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
};

// i testi dei quadri sono disegnati su canvas: aspetto i font del sito
async function fontsReady() {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('700 64px "Space Grotesk"'),
        document.fonts.load('600 36px "Space Grotesk"'),
        document.fonts.load('500 32px "Inter"')
      ]),
      new Promise(r => setTimeout(r, 1500))
    ]);
  } catch (e) { /* si usa il font di riserva */ }
}

async function main() {
  if (!section || !root.classList.contains('has-3d')) return;

  const DATA = window.PORTFOLIO || {};
  // due "sale": prima tutti gli orizzontali, poi tutti i verticali
  const groups = [
    { kind: 'h', label: 'Orizzontali', ratio: '16:9', items: DATA.orizzontali || [] },
    { kind: 'v', label: 'Verticali', ratio: '9:16', items: DATA.verticali || [] }
  ].filter((gr) => gr.items.length);
  const projects = [];
  groups.forEach((gr, gi) => gr.items.forEach((p, k) => projects.push({
    ...p, kind: gr.kind, group: gi, pos: k, groupSize: gr.items.length, groupLabel: gr.label
  })));
  if (!projects.length) return fallbackToGrid();

  let THREE;
  try { THREE = await import(THREE_URL); } catch (e) { return fallbackToGrid(); }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return fallbackToGrid(); }

  /* ---------- riferimenti DOM ---------- */
  const sticky = section.querySelector('.g3d-sticky');
  const stage = section.querySelector('.g3d-stage');
  const hud = {
    now: section.querySelector('.g3d-now'),
    idx: section.querySelector('.g3d-idx'),
    name: section.querySelector('.g3d-name'),
    client: section.querySelector('.g3d-client'),
    play: section.querySelector('.g3d-play'),
    toggle: section.querySelector('.g3d-toggle'),
    progress: section.querySelector('.g3d-progress span')
  };
  const backBtn = document.querySelector('.g3d-back-btn');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- renderer, scena, camera ---------- */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x0b0b0c, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0b0c);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 90);
  camera.rotation.order = 'YXZ';
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const C = {
    border: new THREE.Color(0x1c1c1f),
    accent: new THREE.Color(0x19e3ff)
  };

  await fontsReady();

  /* ---------- texture disegnate su canvas ---------- */
  function canvasTex(w, h, draw, { repeat = false } = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  const T = {
    // pozza di luce morbida
    radial: canvasTex(256, 256, (g) => {
      const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      rg.addColorStop(0, 'rgba(255,255,255,1)');
      rg.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
    }),
    // cono di luce del faretto (stretto in alto, largo e sfumato in basso)
    beam: canvasTex(256, 512, (g, w, h) => {
      g.filter = 'blur(10px)';
      const vg = g.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0, 'rgba(255,255,255,0.95)');
      vg.addColorStop(0.35, 'rgba(255,255,255,0.35)');
      vg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = vg;
      g.beginPath();
      g.moveTo(w * 0.42, 0); g.lineTo(w * 0.58, 0);
      g.lineTo(w * 0.96, h); g.lineTo(w * 0.04, h);
      g.closePath(); g.fill();
    }),
    // sfumatura verticale (luce LED che sale sul muro)
    glowV: canvasTex(8, 128, (g, w, h) => {
      const lg = g.createLinearGradient(0, h, 0, 0);
      lg.addColorStop(0, 'rgba(255,255,255,1)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
    }),
    // sfumatura orizzontale (riflesso LED sul pavimento)
    glowH: canvasTex(128, 8, (g, w, h) => {
      const lg = g.createLinearGradient(0, 0, w, 0);
      lg.addColorStop(0, 'rgba(255,255,255,1)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
    }),
    // icona play
    play: canvasTex(256, 256, (g) => {
      g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2);
      g.fillStyle = 'rgba(25,227,255,0.94)'; g.fill();
      g.beginPath(); g.moveTo(106, 84); g.lineTo(106, 172); g.lineTo(178, 128); g.closePath();
      g.fillStyle = '#0b0b0c'; g.fill();
    }),
    // pavimento: cemento scuro a lastre
    floor: canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#0e0e10'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = `rgba(255,255,255,${(Math.random() * 0.05).toFixed(3)})`;
        g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 3;
      g.strokeRect(1.5, 1.5, w - 3, h - 3);
    }, { repeat: true }),
    // muro finale: invito ai contatti
    end: canvasTex(2048, 1024, (g, w) => {
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillStyle = 'rgba(243,241,236,0.55)';
      g.font = '500 44px "Inter", sans-serif';
      g.letterSpacing = '14px';
      g.fillText('FINE DELLA MOSTRA', w / 2, 250);
      g.letterSpacing = '0px';
      g.fillStyle = '#f3f1ec';
      g.font = '700 230px "Space Grotesk", sans-serif';
      g.fillText('Lavoriamo', w / 2, 520);
      const word = 'insieme';
      const ww = g.measureText(word).width, dot = g.measureText('.').width;
      const x0 = w / 2 - (ww + dot) / 2;
      g.textAlign = 'left';
      g.fillText(word, x0, 760);
      g.fillStyle = '#19e3ff'; g.fillText('.', x0 + ww, 760);
      g.textAlign = 'center';
      g.font = '600 64px "Space Grotesk", sans-serif';
      const cta = 'Scrivimi  →';
      g.fillText(cta, w / 2, 930);
      const tw = g.measureText(cta).width;
      g.fillRect(w / 2 - tw / 2, 956, tw, 4);
    })
  };

  // targhetta sotto il quadro: numero, titolo, cliente
  function plaqueTexture(p, i, n) {
    const t = canvasTex(1024, 256, (g, w) => {
      g.fillStyle = '#19e3ff';
      g.font = '600 36px "Space Grotesk", sans-serif';
      g.fillText(`${pad(p.pos + 1)} / ${pad(p.groupSize)}`, 4, 50);
      let size = 76;
      g.font = `700 ${size}px "Space Grotesk", sans-serif`;
      while (g.measureText(p.titolo || '').width > w - 10 && size > 40) {
        size -= 4; g.font = `700 ${size}px "Space Grotesk", sans-serif`;
      }
      g.fillStyle = '#f3f1ec';
      g.fillText(p.titolo || '', 2, 140);
      g.fillStyle = 'rgba(243,241,236,0.6)';
      g.font = '500 32px "Inter", sans-serif';
      g.letterSpacing = '6px';
      g.fillText(String(p.cliente || '').toUpperCase(), 4, 205);
    });
    t.userData.owned = true;
    return t;
  }

  // insegna della sala: largo = striscione 4:1, stretto = pannello 2:1 su più righe
  function signTexture(gr, gi, wide) {
    const W = 2048, H = wide ? 512 : 1024;
    const t = canvasTex(W, H, (g) => {
      g.fillStyle = '#efece5'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(12,12,13,0.12)'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6);
      const x = wide ? 110 : 130;
      const count = `${gr.items.length} ${gr.items.length === 1 ? 'VIDEO' : 'VIDEO'}`;
      g.fillStyle = '#0aa6c9';
      g.font = '600 60px "Space Grotesk", sans-serif';
      g.letterSpacing = '12px';
      g.fillText(`SALA ${pad(gi + 1)}  ·  ${count}`, x, wide ? 150 : 250);
      g.letterSpacing = '0px';
      // riduce il font finché la riga più lunga entra nel pannello
      const line = wide ? `${gr.label} ${gr.ratio}` : gr.label;
      let size = 230;
      g.font = `700 ${size}px "Space Grotesk", sans-serif`;
      while (g.measureText(line).width > W - 2 * x && size > 80) {
        size -= 8; g.font = `700 ${size}px "Space Grotesk", sans-serif`;
      }
      g.fillStyle = '#0c0c0d';
      g.fillText(gr.label, x, wide ? 410 : 560);
      g.fillStyle = '#0aa6c9';
      if (wide) g.fillText(gr.ratio, x + g.measureText(gr.label + ' ').width, 410);
      else g.fillText(gr.ratio, x, 830);
    });
    t.userData.owned = true;
    return t;
  }

  /* ---------- copertine dei video (YouTube, cover locale o file) ---------- */
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  // YouTube risponde con un segnaposto 120x90 quando una miniatura non esiste
  const loadImg = (url) => new Promise((res, rej) => loader.load(url, (t) => {
    if (t.image && t.image.width >= 200) res(t); else { t.dispose(); rej(); }
  }, undefined, rej));

  function loadVideoTex(src) {
    return new Promise((res) => {
      const v = document.createElement('video');
      Object.assign(v, { src, muted: true, loop: true, playsInline: true, crossOrigin: 'anonymous', preload: 'auto' });
      v.addEventListener('loadeddata', () => { v.play().catch(() => {}); res(new THREE.VideoTexture(v)); }, { once: true });
      v.addEventListener('error', () => res(null), { once: true });
    });
  }

  async function loadCover(p) {
    const tries = [];
    if (p.cover) tries.push(p.cover);
    const id = ytId(p.video);
    if (id) {
      if (p.kind === 'v') tries.push(`https://i.ytimg.com/vi/${id}/oardefault.jpg`);   // verticale per gli Shorts
      tries.push(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
    }
    for (const u of tries) { try { return await loadImg(u); } catch (e) { /* prova la prossima */ } }
    if (/\.(mp4|webm|mov)(#|\?|$)/i.test(p.video || '')) return loadVideoTex(p.video);
    return null;
  }

  // ritaglio "cover": l'immagine riempie il quadro senza deformarsi
  function fitCover(tex, frameAspect) {
    const img = tex.image;
    const ia = (img.videoWidth || img.width) / (img.videoHeight || img.height);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    if (ia > frameAspect) { const s = frameAspect / ia; tex.repeat.set(s, 1); tex.offset.set((1 - s) / 2, 0); }
    else { const s = ia / frameAspect; tex.repeat.set(1, s); tex.offset.set(0, (1 - s) / 2); }
    tex.needsUpdate = true;
  }

  const coverCache = new Map();
  function cover(i) {
    if (!coverCache.has(i)) {
      const p = projects[i];
      coverCache.set(i, loadCover(p).then((t) => {
        if (t) fitCover(t, p.kind === 'v' ? 9 / 16 : 16 / 9);
        return t;
      }).catch(() => null));
    }
    return coverCache.get(i);
  }
  projects.forEach((_, i) => cover(i));   // caricamento in parallelo, subito

  /* ---------- impostazioni per formato schermo ---------- */
  let Z0 = 5;   // dove parte la camminata (ricalcolato in build)
  function computeCfg() {
    const w = sticky.clientWidth || innerWidth, h = sticky.clientHeight || innerHeight;
    const aspect = w / h;
    if (aspect >= 1.05) {
      // schermo largo: quadri sospesi ai due lati, girati verso chi cammina
      const fov = clamp(2 * Math.atan(Math.tan(40 * Math.PI / 180) / aspect) * 180 / Math.PI, 48, 70);
      return {
        wide: true, fov, spacing: 5.6, sideX: 2.1, rot: 0.62, hW: 2.5, vW: 1.15,
        wallX: 4.2, ceil: 4.6, eye: 1.6, frameY: 1.85, viewOffset: 4.0,
        endGap: 8, camStop: 6.5, fogFar: 34, vhPerUnit: 17, stripX: 1.3, endW: 5.4,
        groupGap: 4.0, signW: 4.8, signY: 3.7, signFromFirst: 2.2, z0Back: 8
      };
    }
    // telefono / finestra stretta: i quadri restano ai lati e lo sguardo si gira
    // verso ciascuno, fermandosi davanti. La camera non attraversa mai un quadro.
    const fov = 62, rot = 0.62, sideX = 1.5;
    const D = sideX / Math.sin(rot);                      // distanza della vista frontale
    const tanH = Math.tan(fov / 2 * Math.PI / 180);
    const visH = 2 * D * tanH, visW = visH * aspect;      // area inquadrata a quella distanza
    const camStop = 5;
    return {
      wide: false, fov, spacing: 4.2, sideX, rot,
      hW: clamp(visW * 0.86 - 0.16, 0.6, 2.2),
      // verticali un po' più bassi e alzati: restano sopra la barra in basso dell'HUD
      vW: clamp(Math.min(visW * 0.86 - 0.16, visH * 0.56 * 9 / 16), 0.45, 1.2),
      viewZ: D * Math.cos(rot), viewOffset: D * Math.cos(rot),
      wallX: 2.6, ceil: 3.8, eye: 1.6, frameY: 1.72,
      endGap: 6, camStop, fogFar: 24, segVh: 95, stripX: 0.8,
      endW: Math.min(3.6, 2 * camStop * tanH * aspect * 0.92),
      // insegna: ci si ferma a 3 metri, sguardo un po' in su; resta sopra la testa
      groupGap: 3.4, signStop: 3.0, signPitch: 0.12, signFromFirst: 2.2, z0Back: 6,
      signW: clamp(2 * 3.0 * tanH * aspect * 0.9, 1.1, 2.2)
    };
  }

  /* ---------- costruzione del mondo ---------- */
  let cfg = null, world = null, frames = [], hitList = [], L = 1;
  let keys = [];   // modalità stretta: tappe della camera (posizione + direzione dello sguardo)
  let signs = [];  // insegne delle sale

  function disposeWorld() {
    if (!world) return;
    world.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { if (m.map && m.map.userData.owned) m.map.dispose(); m.dispose(); });
      }
    });
    scene.remove(world);
    world = null;
  }

  function build(next) {
    disposeWorld();
    cfg = next;
    world = new THREE.Group();
    scene.add(world);
    frames = []; hitList = [];

    const n = projects.length;
    // tra una sala e l'altra c'è un varco in più
    const zOf = (i) => -i * cfg.spacing - projects[i].group * cfg.groupGap;
    // insegne: la prima all'ingresso della sala 1, le altre a metà del varco
    signs = groups.map((gr, gi) => {
      const first = projects.findIndex((p) => p.group === gi);
      const z = gi === 0 ? zOf(first) + cfg.signFromFirst : (zOf(first - 1) + zOf(first)) / 2;
      return { gr, gi, first, z };
    });
    Z0 = signs[0].z + cfg.z0Back;
    const endZ = zOf(n - 1) - cfg.endGap;
    L = Z0 - (endZ + cfg.camStop);
    const zFront = Z0 + 12, len = zFront - endZ, zMid = (zFront + endZ) / 2;
    const narrowFade = false;   // nessun quadro viene più attraversato

    scene.fog = new THREE.Fog(0x0b0b0c, 6, cfg.fogFar);
    camera.fov = cfg.fov;
    camera.updateProjectionMatrix();

    // lunghezza di scroll: proporzionale al percorso (largo) o una tappa per quadro (stretto)
    section.style.height = cfg.wide
      ? `${Math.round(100 + L * cfg.vhPerUnit)}vh`
      : `${Math.round(100 + cfg.segVh * (n + 1))}vh`;

    /* pavimento lucido (semi-trasparente: lascia vedere i riflessi) */
    T.floor.repeat.set((cfg.wallX * 2) / 2.2, len / 2.2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.wallX * 2, len),
      new THREE.MeshBasicMaterial({ map: T.floor, transparent: true, opacity: 0.78, depthWrite: false })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, zMid);
    floor.renderOrder = 1;
    world.add(floor);

    /* pareti, soffitto, fondo */
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x131316 });
    for (const s of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, cfg.ceil), wallMat);
      wall.rotation.y = -s * Math.PI / 2;
      wall.position.set(s * cfg.wallX, cfg.ceil / 2, zMid);
      world.add(wall);
    }
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(cfg.wallX * 2, len), new THREE.MeshBasicMaterial({ color: 0x0f0f11 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, cfg.ceil, zMid);
    world.add(ceiling);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(cfg.wallX * 2, cfg.ceil), wallMat);
    back.position.set(0, cfg.ceil / 2, endZ);
    world.add(back);

    /* luci lineari a soffitto (bianche) e LED a pavimento (ciano) */
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xf3f1ec });
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x19e3ff });
    const ledWashMat = new THREE.MeshBasicMaterial({
      map: T.glowV, color: 0x19e3ff, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const ledFloorMat = new THREE.MeshBasicMaterial({
      map: T.glowH, color: 0x19e3ff, transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    for (const s of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.07, len), stripMat);
      strip.rotation.x = Math.PI / 2;
      strip.position.set(s * cfg.stripX, cfg.ceil - 0.01, zMid);
      world.add(strip);

      const led = new THREE.Mesh(new THREE.PlaneGeometry(0.05, len), ledMat);
      led.rotation.x = -Math.PI / 2;
      led.position.set(s * (cfg.wallX - 0.06), 0.012, zMid);
      world.add(led);

      const wash = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.8), ledWashMat);
      wash.rotation.y = -s * Math.PI / 2;
      wash.position.set(s * (cfg.wallX - 0.005), 0.4, zMid);
      wash.renderOrder = 2;
      world.add(wash);

      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, len), ledFloorMat);
      glow.rotation.x = -Math.PI / 2;
      glow.scale.x = s < 0 ? 1 : -1;   // la parte luminosa sempre verso il muro
      glow.position.set(s * (cfg.wallX - 0.45), 0.006, zMid);
      glow.renderOrder = 2;
      world.add(glow);
    }

    /* pozze di luce calda sulle pareti, a ritmo regolare */
    const poolWallMat = new THREE.MeshBasicMaterial({
      map: T.radial, color: 0xffe2b8, transparent: true, opacity: 0.1,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    for (let z = zFront - 2; z > endZ + 1; z -= 2.8) {
      for (const s of [-1, 1]) {
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), poolWallMat);
        pool.rotation.y = -s * Math.PI / 2;
        pool.position.set(s * (cfg.wallX - 0.01), cfg.ceil * 0.62, z);
        pool.renderOrder = 2;
        world.add(pool);
      }
    }

    /* muro finale "Lavoriamo insieme" → contatti */
    const endGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.endW * 1.5, cfg.endW),
      new THREE.MeshBasicMaterial({ map: T.radial, color: 0xffe6c4, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    endGlow.position.set(0, cfg.ceil * 0.45, endZ + 0.01);
    endGlow.renderOrder = 2;
    world.add(endGlow);
    const endText = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.endW, cfg.endW / 2),
      new THREE.MeshBasicMaterial({ map: T.end, transparent: true, depthWrite: false })
    );
    endText.position.set(0, cfg.wide ? 2.0 : 1.75, endZ + 0.02);
    endText.renderOrder = 3;
    endText.userData.end = true;
    world.add(endText);
    hitList.push(endText);

    /* insegne delle sale, appese al soffitto (sopra la testa: ci si passa sotto) */
    for (const s of signs) {
      const w = cfg.signW, h = cfg.wide ? w / 4 : w / 2;
      const y = cfg.wide ? cfg.signY : cfg.eye + 0.35 + h / 2;
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: signTexture(s.gr, s.gi, cfg.wide) })
      );
      sign.position.set(0, y, s.z);
      world.add(sign);
      const top = y + h / 2;
      world.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-w * 0.4, top, s.z), new THREE.Vector3(-w * 0.4, cfg.ceil, s.z),
          new THREE.Vector3(w * 0.4, top, s.z), new THREE.Vector3(w * 0.4, cfg.ceil, s.z)
        ]),
        new THREE.LineBasicMaterial({ color: 0x55555c, transparent: true, opacity: 0.7 })
      ));
      // alone di luce calda dietro l'insegna
      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 1.5, h * 2.2),
        new THREE.MeshBasicMaterial({ map: T.radial, color: 0xffe6c4, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      halo.position.set(0, y, s.z - 0.02);
      halo.renderOrder = 2;
      world.add(halo);
    }

    /* i quadri */
    projects.forEach((p, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const w = p.kind === 'v' ? cfg.vW : cfg.hW;
      const h = p.kind === 'v' ? w * 16 / 9 : w * 9 / 16;
      const x = side * cfg.sideX, y = cfg.frameY, z = zOf(i);
      const rotY = -side * cfg.rot;
      const fadeMats = [];
      const mat = (opts, base = 1) => {
        const m = new THREE.MeshBasicMaterial({ ...opts, transparent: opts.transparent || narrowFade });
        m.userData.base = base;
        if (narrowFade || opts.transparent) fadeMats.push(m);
        return m;
      };

      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = rotY;
      world.add(g);

      const borderMat = mat({ color: C.border.clone() });
      const border = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.06), borderMat);
      border.userData.index = i;
      g.add(border);
      hitList.push(border);

      const matte = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.1, h + 0.1), mat({ color: 0xefece5 }));
      matte.position.z = 0.036;
      g.add(matte);

      const imgMat = mat({ color: 0x2a2a2e });
      const img = new THREE.Mesh(new THREE.PlaneGeometry(w, h), imgMat);
      img.position.z = 0.042;
      g.add(img);

      const playSize = cfg.wide ? 0.46 : 0.36;
      const playMat = new THREE.MeshBasicMaterial({ map: T.play, transparent: true, opacity: 0, depthWrite: false });
      const play = new THREE.Mesh(new THREE.PlaneGeometry(playSize, playSize), playMat);
      play.position.z = 0.05;
      g.add(play);

      const PW = cfg.wide ? 1.55 : 1.15;
      const plaque = new THREE.Mesh(
        new THREE.PlaneGeometry(PW, PW / 4),
        mat({ map: plaqueTexture(p, i, projects.length), transparent: true, depthWrite: false })
      );
      plaque.position.set(-w / 2 - 0.08 + PW / 2, -h / 2 - 0.2 - PW / 8, 0.01);
      g.add(plaque);

      // cavi di sospensione fino al soffitto
      const top = h / 2 + 0.08, ceilLocal = cfg.ceil - y;
      const wires = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-w * 0.32, top, 0), new THREE.Vector3(-w * 0.32, ceilLocal, 0),
          new THREE.Vector3(w * 0.32, top, 0), new THREE.Vector3(w * 0.32, ceilLocal, 0)
        ]),
        new THREE.LineBasicMaterial({ color: 0x55555c, transparent: true, opacity: 0.7 })
      );
      wires.material.userData.base = 0.7;
      fadeMats.push(wires.material);
      g.add(wires);

      // faretto a soffitto + cono di luce + pozza sul pavimento
      const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.16), mat({ color: 0x1a1a1d }));
      fixture.position.set(0, ceilLocal - 0.05, 0.55);
      g.add(fixture);
      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1), mat({ color: 0xfff4e3 }));
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, ceilLocal - 0.101, 0.55);
      g.add(lens);

      const beamH = ceilLocal + h / 2;
      const beam = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 1.6, beamH),
        mat({ map: T.beam, color: 0xfff1dc, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }, 0.14)
      );
      beam.position.set(0, ceilLocal - beamH / 2, 0.55);
      beam.renderOrder = 3;
      g.add(beam);

      const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 1.9, w * 1.5),
        mat({ map: T.radial, color: 0xffe6c4, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }, 0.32)
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(0, -y + 0.015, 0.7);
      pool.renderOrder = 2;
      g.add(pool);

      // riflesso capovolto sotto il pavimento lucido
      const refl = new THREE.Group();
      refl.position.set(x, -y, z);
      refl.rotation.y = rotY;
      refl.scale.set(1, -1, 1);
      world.add(refl);
      const rBorder = new THREE.Mesh(border.geometry, mat({ color: 0x0c0c0e, side: THREE.DoubleSide }));
      const rMatte = new THREE.Mesh(matte.geometry, mat({ color: 0x4d4b47, side: THREE.DoubleSide }));
      rMatte.position.z = matte.position.z;
      const rImgMat = mat({ color: 0x151517, side: THREE.DoubleSide });
      const rImg = new THREE.Mesh(img.geometry, rImgMat);
      rImg.position.z = img.position.z;
      refl.add(rBorder, rMatte, rImg);

      const f = { p, i, g, refl, z, side, border, borderMat, playMat, fadeMats, hov: 0, fade: 1, view: cfg.viewOffset, loaded: false };
      frames.push(f);

      cover(i).then((tex) => {
        if (!tex || !frames.includes(f)) return;
        imgMat.map = tex; imgMat.color.set(0xffffff); imgMat.needsUpdate = true;
        rImgMat.map = tex; rImgMat.color.set(0x5a5a5a); rImgMat.needsUpdate = true;
        f.loaded = true;
      });
    });

    // tappe (modalità stretta): ingresso → insegna sala → davanti a ogni suo quadro
    // (girati verso di lui) → insegna sala successiva → … → muro finale
    keys = [{ z: Z0, yaw: 0, pitch: 0 }];
    for (const s of signs) {
      keys.push({ z: s.z + (cfg.signStop || 0), yaw: 0, pitch: cfg.signPitch || 0, sign: s.gi });
      for (const f of frames) {
        if (f.p.group === s.gi) keys.push({ z: f.z + cfg.viewZ, yaw: -f.side * cfg.rot, pitch: 0, frame: f.i });
      }
    }
    keys.push({ z: endZ + cfg.camStop, yaw: 0, pitch: 0 });

    computeViews();
  }

  // Dove si trova la camera (e dove guarda) per una data percentuale di scroll.
  // Stretto: tra una tappa e l'altra c'è una sosta (20% + 20%) a ogni tappa.
  function pathAt(p) {
    if (cfg.wide) return { z: Z0 - p * L, yaw: 0, pitch: 0, cur: null };
    const segs = keys.length - 1, u = p * segs;
    const s = Math.min(Math.floor(u), segs - 1), te = smooth(0.2, 0.8, u - s);
    const a = keys[s], b = keys[s + 1], k = Math.round(u);
    return {
      z: a.z + (b.z - a.z) * te,
      yaw: a.yaw + (b.yaw - a.yaw) * te,
      pitch: a.pitch + (b.pitch - a.pitch) * te,
      cur: (Math.abs(u - k) < 0.3 && keys[k] && keys[k].frame !== undefined) ? keys[k].frame : -1
    };
  }
  // percentuale di scroll di una tappa / di un quadro
  const keyProgress = (k) => k / (keys.length - 1);

  // Punto di vista ideale di ogni quadro: la distanza minima a cui il quadro,
  // cornice compresa, sta tutto nell'inquadratura (vale per ogni formato schermo).
  const probe = new THREE.PerspectiveCamera(55, 1, 0.1, 90);
  const corner = new THREE.Vector3();
  function computeViews() {
    if (!world) return;
    world.updateMatrixWorld(true);
    probe.fov = cfg.fov;
    probe.aspect = camera.aspect;
    probe.updateProjectionMatrix();
    for (const f of frames) {
      f.border.geometry.computeBoundingBox();
      const bb = f.border.geometry.boundingBox;
      f.view = cfg.viewOffset;
      for (let d = 2.2; d <= 14; d += 0.1) {
        probe.position.set(0, cfg.eye, f.z + d);
        probe.updateMatrixWorld(true);
        let fits = true;
        for (const x of [bb.min.x, bb.max.x]) {
          for (const y of [bb.min.y, bb.max.y]) {
            corner.set(x, y, bb.max.z).applyMatrix4(f.border.matrixWorld).project(probe);
            if (Math.abs(corner.x) > 0.92 || Math.abs(corner.y) > 0.9 || corner.z > 1) fits = false;
          }
        }
        if (fits) { f.view = d; break; }
      }
    }
  }

  /* ---------- stato, scroll e camminata ---------- */
  const state = {
    camZ: Z0, yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, bob: 0, baseYaw: 0, basePitch: 0,
    current: -2, hover: -1, hoverEnd: false, active: true, walking: null, progress: 0
  };

  function scrollProgress() {
    const r = section.getBoundingClientRect();
    const span = r.height - sticky.clientHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }

  function updateNow(i) {
    if (i === state.current) return;
    state.current = i;
    const on = i >= 0;
    hud.now.classList.toggle('on', on);
    hud.play.hidden = !on;
    if (on) {
      const p = projects[i];
      hud.idx.textContent = `${p.groupLabel} ${pad(p.pos + 1)}/${pad(p.groupSize)}`;
      hud.name.textContent = p.titolo || '';
      hud.client.textContent = p.cliente || '';
    }
  }

  /* ---------- cursore del sito (etichetta "Play") ---------- */
  const ring = document.querySelector('.cursor-ring');
  const ringLabel = ring && ring.querySelector('.cursor-label');
  let cursorLabel = null;
  function setCursor(label) {
    if (!ring || label === cursorLabel) return;
    cursorLabel = label;
    if (label) { ringLabel.textContent = label; ring.classList.add('is-label'); ring.classList.remove('is-hover'); }
    else ring.classList.remove('is-label');
  }

  function openProject(i) {
    const p = projects[i];
    if (!p || !window.egOpenVideo) return;
    setCursor(null);
    window.egOpenVideo({ video: p.video, kind: p.kind, title: p.titolo || '', client: p.cliente || '' });
  }

  /* ---------- click / hover sui quadri ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const targets = hitList.filter((o) => {
      if (o.userData.end) return true;
      const f = frames[o.userData.index];
      return f && f.g.visible && f.fade > 0.5;
    });
    const hit = raycaster.intersectObjects(targets, false)[0];
    return hit ? hit.object : null;
  }

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    state.tYaw = -(((e.clientX - r.left) / r.width) * 2 - 1) * 0.12;
    state.tPitch = -(((e.clientY - r.top) / r.height) * 2 - 1) * 0.05;
    const o = pick(e.clientX, e.clientY);
    state.hover = o && o.userData.index !== undefined ? o.userData.index : -1;
    state.hoverEnd = !!(o && o.userData.end);
    setCursor(state.hover >= 0 ? 'Play' : state.hoverEnd ? 'Scrivi' : null);
  });
  canvas.addEventListener('pointerleave', () => {
    state.hover = -1; state.hoverEnd = false; state.tYaw = 0; state.tPitch = 0;
    setCursor(null);
  });

  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 500;
    down = null;
    if (moved > 10 || !quick) return;   // era uno scroll, non un tap
    const o = pick(e.clientX, e.clientY);
    if (!o) return;
    if (o.userData.end) {
      const contact = document.getElementById('contact');
      if (contact) contact.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    openProject(o.userData.index);
  });

  /* ---------- HUD: guarda / vista griglia ---------- */
  hud.play.addEventListener('click', () => openProject(state.current));

  function setGrid(on) {
    root.classList.toggle('view-grid', on);
    try { on ? sessionStorage.setItem('eg-view', 'grid') : sessionStorage.removeItem('eg-view'); } catch (e) { /* ok */ }
    requestAnimationFrame(() => {
      const target = document.getElementById(on ? 'orizzontali' : 'galleria');
      if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
      if (!on) resize();
    });
  }
  hud.toggle.addEventListener('click', () => setGrid(true));
  if (backBtn) backBtn.addEventListener('click', () => setGrid(false));

  // elenco accessibile (screen reader)
  const list = section.querySelector('.g3d-a11y');
  if (list) {
    projects.forEach((p, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `Guarda: ${p.titolo || ''}${p.cliente ? ' — ' + p.cliente : ''}`;
      b.addEventListener('click', () => openProject(i));
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  /* ---------- dimensioni ---------- */
  function resize() {
    const w = sticky.clientWidth, h = sticky.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const next = computeCfg();
    if (!cfg || next.wide !== cfg.wide || (!next.wide && Math.abs(next.hW - cfg.hW) > 0.08)) {
      build(next);
      const at = pathAt(scrollProgress());
      state.camZ = at.z; state.baseYaw = at.yaw; state.basePitch = at.pitch;
    } else {
      cfg.fov = next.fov;
      camera.fov = cfg.fov;
      computeViews();
    }
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(sticky);
  resize();

  new IntersectionObserver(([en]) => { state.active = en.isIntersecting; }, { rootMargin: '200px 0px' }).observe(section);

  /* ---------- arrivo da home con #orizzontali / #verticali: davanti all'insegna della sala ---------- */
  function progressForSign(gi) {
    if (!cfg.wide) return keyProgress(keys.findIndex((k) => k.sign === gi));
    const s = signs.find((x) => x.gi === gi);
    return clamp((Z0 - (s.z + 7)) / L, 0, 1);   // insegna 7 metri avanti, primi quadri in vista
  }
  const hash = location.hash.slice(1);
  if ((hash === 'orizzontali' || hash === 'verticali') && !root.classList.contains('view-grid') && scrollY < 60 && cfg) {
    const gi = groups.findIndex((gr) => gr.kind === (hash === 'orizzontali' ? 'h' : 'v'));
    if (gi >= 0) {
      const pT = progressForSign(gi);
      const top = section.getBoundingClientRect().top + scrollY + pT * (section.offsetHeight - sticky.clientHeight);
      scrollTo({ top, behavior: 'instant' });
      const at = pathAt(pT);
      state.camZ = at.z; state.baseYaw = at.yaw; state.basePitch = at.pitch;
    }
  }

  /* ---------- ciclo di animazione ---------- */
  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!state.active || document.hidden) return;
    update(dt);
  }

  function update(dt) {
    if (!cfg || !sticky.clientWidth) return;

    // camminata: la camera insegue il percorso (e lo sguardo) con un po' di inerzia
    const p = scrollProgress();
    state.progress = p;
    const at = pathAt(p);
    const follow = 1 - Math.pow(0.0008, dt);
    const prevZ = state.camZ;
    state.camZ += (at.z - state.camZ) * follow;
    state.baseYaw += (at.yaw - state.baseYaw) * follow;
    state.basePitch += (at.pitch - state.basePitch) * follow;
    const step = Math.abs(state.camZ - prevZ);
    state.bob += step * 2.4;
    const bobAmp = clamp(step / Math.max(dt, 1e-3) / 3, 0, 1) * 0.022;

    // sguardo: segue il mouse, con un leggero ondeggiare
    const lookK = 1 - Math.pow(0.02, dt);
    const idle = Math.sin(clock.elapsedTime * 0.35) * 0.012;
    const lookOn = !root.classList.contains('lightbox-open');
    state.yaw += ((lookOn ? state.tYaw : 0) + idle - state.yaw) * lookK;
    state.pitch += ((lookOn ? state.tPitch : 0) - state.pitch) * lookK;
    camera.position.set(0, cfg.eye + Math.sin(state.bob) * bobAmp, state.camZ);
    camera.rotation.set(state.basePitch + state.pitch, state.baseYaw + state.yaw, 0);

    // quadri: il più vicino al punto di vista diventa "quello attuale"
    let best = -1, bestD = Infinity;
    const hovK = 1 - Math.pow(0.002, dt);
    for (const f of frames) {
      const d = state.camZ - f.z;   // > 0: il quadro è davanti
      const vd = Math.abs(d - f.view);
      if (d > -0.5 && vd < bestD) { bestD = vd; best = f.i; }

      const visible = d > -4;       // i quadri superati da un po' non si disegnano
      f.g.visible = f.refl.visible = visible;
      if (!visible) continue;

      const hovered = state.hover === f.i || (!finePointer && state.current === f.i);
      f.hov += ((hovered ? 1 : 0) - f.hov) * hovK;
      const s = 1 + 0.035 * f.hov;
      f.g.scale.setScalar(s);
      f.refl.scale.set(s, -s, s);
      f.borderMat.color.copy(C.border).lerp(C.accent, f.hov);
      f.playMat.opacity = f.hov * 0.95;
    }
    updateNow(cfg.wide ? (bestD < cfg.spacing * 0.55 ? best : -1) : at.cur);

    // HUD
    const walking = p > 0.015;
    if (walking !== state.walking) { state.walking = walking; section.classList.toggle('is-walking', walking); }
    hud.progress.style.width = (p * 100).toFixed(2) + '%';

    renderer.render(scene, camera);
  }

  section.classList.add('is-ready');
  requestAnimationFrame(tick);

  // per verifiche tecniche dalla console
  window.__g3d = {
    THREE, renderer, scene, camera, state, projects,
    get frames() { return frames; }, get cfg() { return cfg; }, get L() { return L; },
    get keys() { return keys; }, get signs() { return signs; }, get Z0() { return Z0; }, pathAt, keyProgress,
    step(n = 1, dt = 1 / 60) { for (let k = 0; k < n; k++) update(dt); },   // avanza a mano (tab in background)
    resize
  };
}

main().catch(() => fallbackToGrid());
