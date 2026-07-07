/* ================================================================
   EDOARDO GUTTUSO — PORTFOLIO
   Interazioni condivise (home + portfolio)
   ================================================================ */
(function () {
  'use strict';

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  /* ==============================================================
     RENDER DINAMICO DELLE GALLERIE (da assets/progetti.js)
     Costruisce brand + card video dalla lista window.PORTFOLIO.
     Deve girare PRIMA di observer, split-heads e lightbox.
     ============================================================== */
  (function renderFromData() {
    const DATA = window.PORTFOLIO;
    if (!DATA) return; // se manca il file, restano i contenuti statici (fallback)
    const esc = (s) => String(s == null ? '' : s)
      .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const pad = (n) => String(n).padStart(2, '0');

    // BRAND
    const brandGrid = document.querySelector('[data-brands]');
    if (brandGrid && Array.isArray(DATA.brand) && DATA.brand.length) {
      brandGrid.innerHTML = DATA.brand.map((b, i) => `
        <div class="brand-cell brand-cell--logo reveal">
          <span class="b-idx">${pad(i + 1)}</span>
          <img class="b-logo" src="${esc(b.logo)}" alt="${esc(b.nome)}" onerror="this.remove()">
        </div>`).join('');
    }

    // Estrae l'ID di un video YouTube dall'URL (watch, youtu.be, shorts, embed)
    const ytId = (url) => {
      const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
      return m ? m[1] : null;
    };

    // Se la miniatura "originale" (oardefault) è il placeholder 120x90 di YouTube
    // (capita sui video non-Short), passo alla 16:9 maxresdefault.
    window.__egThumb = function (img, id) {
      if (img.naturalWidth && img.naturalWidth < 200) {
        img.src = 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg';
      }
    };

    // Miniatura YouTube ottimale per formato:
    //  - verticale (Shorts): oardefault è verticale 1080x1920
    //  - orizzontale: maxresdefault 1280x720
    const ytThumbImg = (id, kind, t) => {
      const hq = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      if (kind === 'v') {
        return `<img class="inline-media" src="https://i.ytimg.com/vi/${id}/oardefault.jpg" alt="${t}" ` +
          `onload="window.__egThumb&&window.__egThumb(this,'${id}')" ` +
          `onerror="this.onerror=null;this.src='${hq}'">`;
      }
      return `<img class="inline-media" src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" alt="${t}" ` +
        `onerror="this.onerror=null;this.src='${hq}'">`;
    };

    // Copertina della card:
    //  1) campo "cover" se presente (immagine tua) — opzionale
    //  2) miniatura di YouTube presa in automatico dal link
    //  3) fotogramma del file locale (con anteprima al passaggio del mouse)
    const thumbFor = (p, kind, t) => {
      if (p.cover) return `<img class="inline-media" src="${esc(p.cover)}" alt="${t}" loading="lazy" onerror="this.remove()">`;
      const yt = ytId(p.video);
      if (yt) return ytThumbImg(yt, kind, t);
      if (/\.(mp4|webm|mov)(#|\?|$)/i.test(p.video)) return `<video class="inline-media vid-prev" muted loop playsinline preload="metadata" src="${esc(p.video)}#t=0.5"></video>`;
      return '';
    };

    // CARD VIDEO
    const buildCards = (list, kind) => list.map((p, i) => {
      const phClass = kind === 'v' ? 'ph ph--dark' : 'ph';
      const t = esc(p.titolo), c = esc(p.cliente || ''), v = esc(p.video);
      return `
      <article class="vid-card vid-card--${kind} reveal" data-kind="${kind}"
               data-video="${v}" data-title="${t}" data-client="${c}"
               tabindex="0" role="button" aria-label="Guarda: ${t}" data-cursor-label="Play">
        <div class="frame img-reveal">
          <div class="${phClass}"><span class="ph-num">${pad(i + 1)}</span>${t}</div>
          ${thumbFor(p, kind, t)}
          <div class="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></div>
        </div>
        <div class="caption"><h3>${t}</h3><span class="client">${c}</span></div>
      </article>`;
    }).join('');

    const gH = document.querySelector('[data-gallery="orizzontali"]');
    if (gH && Array.isArray(DATA.orizzontali)) gH.innerHTML = buildCards(DATA.orizzontali, 'h');
    const gV = document.querySelector('[data-gallery="verticali"]');
    if (gV && Array.isArray(DATA.verticali)) gV.innerHTML = buildCards(DATA.verticali, 'v');

    // TESSERE HOME (usano il primo video di ogni galleria)
    const setTeaser = (sel, proj, kind) => {
      const elm = document.querySelector(sel);
      if (!elm || !proj) return;
      const yt = ytId(proj.video);
      const isLocalVid = /\.(mp4|webm|mov)(#|\?|$)/i.test(proj.video);
      if (isLocalVid && !proj.cover) {
        elm.src = proj.video + '#t=1';               // video locale: sfondo in autoplay
        return;
      }
      const img = document.createElement('img');     // YouTube/cover: immagine statica
      img.className = elm.className; img.alt = ''; img.loading = 'lazy';
      const hq = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '';
      if (proj.cover) {
        img.src = proj.cover;
      } else if (yt && kind === 'v') {
        img.src = `https://i.ytimg.com/vi/${yt}/oardefault.jpg`;
        img.onload = function () { if (this.naturalWidth && this.naturalWidth < 200) { this.onload = null; this.src = `https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`; } };
        img.onerror = function () { this.onerror = null; this.src = hq; };
      } else if (yt) {
        img.src = `https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`;
        img.onerror = function () { this.onerror = null; this.src = hq; };
      } else return;
      elm.replaceWith(img);
    };
    setTeaser('[data-teaser="orizzontali"]', DATA.orizzontali && DATA.orizzontali[0], 'h');
    setTeaser('[data-teaser="verticali"]', DATA.verticali && DATA.verticali[0], 'v');
  })();

  /* ==============================================================
     PRELOADER (solo prima visita della sessione) + CURTAIN
     ============================================================== */
  const preloader = document.querySelector('.preloader');
  const firstVisit = !sessionStorage.getItem('eg-visited');

  function siteReady() {
    document.body.classList.remove('is-loading');
    document.body.classList.add('ready');
    // titoli hero partono subito, senza aspettare lo scroll
    document.querySelectorAll('[data-hero-anim]').forEach(el => el.classList.add('in'));
  }

  if (preloader && firstVisit && !reducedMotion) {
    document.body.classList.add('is-loading');
    const countEl = preloader.querySelector('.pl-count');
    const t0 = performance.now();
    const DUR = 1000;
    (function tick(now) {
      const p = Math.min((now - t0) / DUR, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      countEl.textContent = Math.round(eased * 100);
      if (p < 1) { requestAnimationFrame(tick); }
      else {
        sessionStorage.setItem('eg-visited', '1');
        setTimeout(() => {
          preloader.classList.add('done');
          siteReady();
          preloader.addEventListener('transitionend', () => preloader.remove(), { once: true });
        }, 160);
      }
    })(t0);
  } else {
    if (preloader) preloader.remove();
    // navigazione interna: la curtain copre la pagina e si apre
    if (!firstVisit && !reducedMotion) {
      root.classList.add('curtain-cover');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        root.classList.add('curtain-out');
        root.classList.remove('curtain-cover');
        setTimeout(() => root.classList.remove('curtain-out'), 700);
      }));
    }
    sessionStorage.setItem('eg-visited', '1');
    siteReady();
  }

  // back/forward cache: ripristina lo stato pulito
  addEventListener('pageshow', (e) => {
    if (e.persisted) {
      root.classList.remove('curtain-cover', 'curtain-out', 'menu-open', 'lightbox-open');
      const c = document.querySelector('.curtain');
      if (c) c.classList.remove('closing');
      siteReady();
    }
  });

  /* ==============================================================
     TRANSIZIONI DI PAGINA (curtain sui link interni)
     ============================================================== */
  const curtain = document.querySelector('.curtain');
  document.querySelectorAll('a[data-transition]').forEach(link => {
    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || reducedMotion || !curtain) return;
      e.preventDefault();
      closeMenu();
      curtain.classList.add('closing');
      setTimeout(() => { location.href = link.href; }, 520);
    });
  });

  /* ==============================================================
     SPLIT TITOLI IN LETTERE
     ============================================================== */
  document.querySelectorAll('.anim-head').forEach(head => {
    const walk = (node) => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(token => {
            if (token.trim() === '') { frag.appendChild(document.createTextNode(token)); return; }
            const word = document.createElement('span');
            word.className = 'word';
            token.split('').forEach(ch => {
              const c = document.createElement('span');
              c.className = 'char'; c.textContent = ch;
              word.appendChild(c);
            });
            frag.appendChild(word);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(head);
    head.querySelectorAll('.char').forEach((c, i) => {
      c.style.transitionDelay = (i * 26) + 'ms';
      c.style.setProperty('--i', i);
    });
  });

  /* ==============================================================
     MANIFESTO — parole in scrub
     ============================================================== */
  const scrubEl = document.querySelector('[data-scrub]');
  let scrubWords = [];
  if (scrubEl) {
    const text = scrubEl.textContent.trim();
    scrubEl.textContent = '';
    text.split(/\s+/).forEach((w, i, arr) => {
      const s = document.createElement('span');
      s.className = 'w' + (/[*]$/.test(w) ? ' k' : '');
      s.textContent = w.replace(/\*$/, '');
      scrubEl.appendChild(s);
      if (i < arr.length - 1) scrubEl.appendChild(document.createTextNode(' '));
    });
    scrubWords = Array.from(scrubEl.querySelectorAll('.w'));
  }

  /* ==============================================================
     CURSORE (pallino + anello con label contestuale)
     ============================================================== */
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  const ringLabel = ring ? ring.querySelector('.cursor-label') : null;

  if (finePointer && dot && ring) {
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    }, { passive: true });
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();

    // delegazione: hover + label contestuale
    document.addEventListener('mouseover', (e) => {
      const labelEl = e.target.closest('[data-cursor-label]');
      const hoverEl = e.target.closest('a, button, [data-cursor]');
      if (labelEl) {
        ringLabel.textContent = labelEl.getAttribute('data-cursor-label');
        ring.classList.add('is-label');
        ring.classList.remove('is-hover');
      } else if (hoverEl) {
        ring.classList.add('is-hover');
        ring.classList.remove('is-label');
      } else {
        ring.classList.remove('is-hover', 'is-label');
      }
    });
  }

  /* ==============================================================
     EFFETTO MAGNETICO
     ============================================================== */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll('.magnetic').forEach(el => {
      const strength = parseFloat(el.dataset.magnet || '0.3');
      el.style.transition = 'transform .35s cubic-bezier(.16,1,.3,1)';
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ==============================================================
     SCRAMBLE sulle voci del menu
     ============================================================== */
  const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#________';
  function scramble(el) {
    const finalText = el.dataset.text;
    let frame = 0;
    const queue = finalText.split('').map(ch => ({
      ch,
      start: Math.floor(Math.random() * 12),
      end: Math.floor(Math.random() * 12) + 12
    }));
    cancelAnimationFrame(el._raf);
    (function update() {
      let out = '', done = 0;
      queue.forEach(q => {
        if (frame >= q.end) { out += q.ch; done++; }
        else if (frame >= q.start) out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      });
      el.textContent = out;
      if (done < queue.length) { frame++; el._raf = requestAnimationFrame(update); }
      else el.textContent = finalText;
    })();
  }
  const navLinks = document.querySelectorAll('.nav nav a');
  navLinks.forEach(el => {
    el.dataset.text = el.textContent.trim();
    el.addEventListener('mouseenter', () => scramble(el));
  });
  // blocca la larghezza quando i font sono pronti (evita salti)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      navLinks.forEach(el => { el.style.minWidth = Math.ceil(el.getBoundingClientRect().width) + 'px'; });
    });
  }

  /* ==============================================================
     REVEAL ALLO SCROLL
     ============================================================== */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -4% 0px' });
  document.querySelectorAll('.reveal, .img-reveal, .anim-head:not([data-hero-anim])')
    .forEach(el => io.observe(el));

  /* ==============================================================
     COUNT-UP NUMERI
     ============================================================== */
  const ioCount = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target; ioCount.unobserve(el);
      const to = parseInt(el.dataset.count, 10) || 0;
      const t0 = performance.now(), DUR = 1300;
      (function step(now) {
        const p = Math.min((now - t0) / DUR, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * to);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(el => {
    if (reducedMotion) { el.textContent = el.dataset.count; return; }
    ioCount.observe(el);
  });

  /* ==============================================================
     SCROLL CONSOLIDATO: progress, nav, scrub, parallasse, nav-dark
     ============================================================== */
  const progress = document.querySelector('.scroll-progress');
  const nav = document.querySelector('header.nav');
  const darkBand = document.querySelector('.contact-band');
  const plxEls = reducedMotion ? [] : Array.from(document.querySelectorAll('[data-parallax]'));

  let ticking = false;
  function onScrollUpdate() {
    ticking = false;
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;

    if (progress) progress.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
    if (nav) {
      nav.classList.toggle('scrolled', scrollY > 40);
      if (darkBand) nav.classList.toggle('over-dark', darkBand.getBoundingClientRect().top < 64);
    }

    if (scrubWords.length) {
      const r = scrubEl.getBoundingClientRect();
      const start = vh * 0.88, end = vh * 0.38;
      const p = Math.min(Math.max((start - r.top) / (r.height + (start - end)), 0), 1);
      const lit = Math.floor(p * scrubWords.length);
      scrubWords.forEach((w, i) => w.classList.toggle('on', i < lit || (p >= 1)));
    }

    plxEls.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      const speed = parseFloat(el.dataset.parallax || '0.08');
      const delta = (r.top + r.height / 2 - vh / 2) * speed;
      el.style.transform = `translate3d(0, ${delta.toFixed(1)}px, 0)`;
    });
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScrollUpdate); }
  }, { passive: true });
  onScrollUpdate();

  /* ==============================================================
     ANCORE INTERNE (scroll fluido) + chiusura menu
     ============================================================== */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ==============================================================
     MENU MOBILE
     ============================================================== */
  const burger = document.querySelector('.burger');
  function closeMenu() { root.classList.remove('menu-open'); if (burger) burger.setAttribute('aria-expanded', 'false'); }
  if (burger) {
    burger.addEventListener('click', () => {
      const open = root.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', String(open));
    });
  }

  /* ==============================================================
     OROLOGIO MILANO
     ============================================================== */
  const clocks = document.querySelectorAll('[data-clock]');
  if (clocks.length) {
    const fmt = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const tickClock = () => clocks.forEach(c => { c.textContent = fmt.format(new Date()); });
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ==============================================================
     LIGHTBOX VIDEO
     ============================================================== */
  const lb = document.querySelector('.lightbox');
  if (lb) {
    const lbMedia = lb.querySelector('.lb-media');
    const lbTitle = lb.querySelector('.lb-title');
    const lbClient = lb.querySelector('.lb-client');
    const lbClose = lb.querySelector('.lb-close');
    let lastFocus = null;

    function toEmbed(url) {
      // File video diretti
      if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { type: 'video', src: url };
      // YouTube
      let m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
      if (m) return { type: 'iframe', src: `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0` };
      // Vimeo
      m = url.match(/vimeo\.com\/(\d+)/);
      if (m) return { type: 'iframe', src: `https://player.vimeo.com/video/${m[1]}?autoplay=1` };
      // Instagram reel / post
      m = url.match(/instagram\.com\/(reel|p)\/([\w-]+)/);
      if (m) return { type: 'iframe', src: `https://www.instagram.com/${m[1]}/${m[2]}/embed` };
      return { type: 'iframe', src: url };
    }

    function openLightbox(card) {
      lastFocus = document.activeElement;
      const src = (card.dataset.video || '').trim();
      const kind = card.dataset.kind === 'v' ? 'v' : 'h';
      lb.classList.toggle('lb-v', kind === 'v');
      lbTitle.textContent = card.dataset.title || '';
      lbClient.textContent = card.dataset.client || '';
      lbMedia.innerHTML = '';

      if (!src) {
        lbMedia.innerHTML = `
          <div class="lb-empty">
            <span class="lb-e-eyebrow">Slot pronto</span>
            <h3>Video in arrivo</h3>
            <p>Questo spazio è già collegato al player: appena il file viene caricato, il video appare qui.</p>
          </div>`;
      } else {
        const emb = toEmbed(src);
        if (emb.type === 'video') {
          const v = document.createElement('video');
          v.src = emb.src; v.controls = true; v.autoplay = true; v.playsInline = true;
          lbMedia.appendChild(v);
        } else {
          const f = document.createElement('iframe');
          f.src = emb.src;
          f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
          f.allowFullscreen = true;
          f.title = card.dataset.title || 'Video';
          lbMedia.appendChild(f);
        }
      }

      lb.hidden = false;
      requestAnimationFrame(() => lb.classList.add('open'));
      root.classList.add('lightbox-open');
      lbClose.focus();
    }

    function closeLightbox() {
      lb.classList.remove('open');
      root.classList.remove('lightbox-open');
      setTimeout(() => { lb.hidden = true; lbMedia.innerHTML = ''; }, 350);
      if (lastFocus) lastFocus.focus();
    }

    document.querySelectorAll('.vid-card').forEach(card => {
      card.addEventListener('click', () => openLightbox(card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(card); }
      });
      // anteprima al passaggio del mouse
      const prev = card.querySelector('.vid-prev');
      if (prev && finePointer && !reducedMotion) {
        card.addEventListener('mouseenter', () => { prev.play().catch(() => {}); });
        card.addEventListener('mouseleave', () => { prev.pause(); });
      }
    });
    lbClose.addEventListener('click', closeLightbox);
    lb.querySelector('.lb-backdrop').addEventListener('click', closeLightbox);
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) closeLightbox(); });
  }

  /* ==============================================================
     ANNO FOOTER
     ============================================================== */
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
