/* Inkasso-Defense – Frontend-Logik
 * Motion: purposeful, transform/opacity/filter only, Signature-Easing,
 * prefers-reduced-motion respektiert. Schema: stammdaten/berechnung/posten/emailTemplate.
 */
(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE_OUT = (t) => 1 - Math.pow(1 - t, 3);

  /* ============================================================
   * 1) Scroll-Reveal (IntersectionObserver)
   * ============================================================ */
  let revealObserver = null;
  function reveal(el) {
    if (!el) return;
    if (REDUCED || !('IntersectionObserver' in window)) { el.classList.add('is-visible'); return; }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    }
    revealObserver.observe(el);
  }
  document.querySelectorAll('.reveal').forEach(reveal);

  /* ============================================================
   * 1b) Theme-Toggle (Light/Dark, persistiert via localStorage)
   * ============================================================ */
  (function initTheme() {
    const btn = document.getElementById('theme-toggle');
    const root = document.documentElement;
    const meta = document.getElementById('meta-theme-color');
    const sync = () => {
      const dark = root.classList.contains('dark');
      if (btn) btn.setAttribute('aria-pressed', String(dark));
      if (meta) meta.setAttribute('content', dark ? '#0b0f19' : '#f7f8fb');
    };
    sync();
    if (!btn) return;
    btn.addEventListener('click', () => {
      // Übergang nur beim aktiven Umschalten animieren (Reduced-Motion via CSS-Guard).
      if (!REDUCED) {
        root.classList.add('theme-anim');
        setTimeout(() => root.classList.remove('theme-anim'), 540);
      }
      const dark = root.classList.toggle('dark');
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (_) {}
      sync();
    });
  })();

  /* ============================================================
   * 1c) Service Worker registrieren (PWA / Offline-Shell)
   * ============================================================ */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  /* ============================================================
   * 2) Canvas-Konstellation
   * ============================================================ */
  (function initParticles() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || REDUCED) return;
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, particles = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const DOT = 'rgba(17, 22, 52, 0.45)';
    const LINE = 'rgba(18, 184, 134, ';
    const MAX_DIST = 150;

    function resize() {
      width = canvas.clientWidth; height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(64, Math.floor((width * height) / 18000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.5,
      }));
    }
    function step() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < MAX_DIST) {
            ctx.strokeStyle = LINE + (1 - d / MAX_DIST) * 0.4 + ')';
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        ctx.fillStyle = DOT;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(step);
    }
    let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(resize, 150); });
    resize(); requestAnimationFrame(step);
  })();

  /* ============================================================
   * 3) Lade-Choreografie (Overlay + Stepper + Progress)
   * ============================================================ */
  function createLoader() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return null;
    const bar = document.getElementById('load-bar');
    const steps = [1, 2, 3].map((n) => document.getElementById('lstep-' + n));
    let timers = [];

    const setBar = (p) => { if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(p, 1))})`; };
    function setStep(active) {
      steps.forEach((el, i) => {
        if (!el) return;
        el.classList.toggle('is-done', i < active);
        el.classList.toggle('is-active', i === active);
      });
    }
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));

    return {
      start() {
        clear();
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        overlay.setAttribute('aria-hidden', 'false');
        setStep(0); setBar(0);
        requestAnimationFrame(() => { overlay.classList.add('is-open'); requestAnimationFrame(() => setBar(0.12)); });
        // Pacing der Phasen (rein visuelles Feedback; Abschluss kommt vom Fetch)
        at(2600, () => { setStep(1); setBar(0.45); });
        at(6200, () => { setStep(2); setBar(0.74); });
        at(11000, () => setBar(0.9));
      },
      finish(done) {
        clear();
        steps.forEach((el) => el && el.classList.remove('is-active'));
        steps.forEach((el) => el && el.classList.add('is-done'));
        setBar(1);
        at(REDUCED ? 120 : 560, done);
      },
      stop() {
        clear();
        overlay.classList.remove('is-open');
        at(REDUCED ? 0 : 420, () => {
          overlay.classList.add('hidden');
          overlay.classList.remove('flex');
          overlay.setAttribute('aria-hidden', 'true');
          setStep(0); setBar(0);
        });
      },
    };
  }

  /* ============================================================
   * Kontext-Onboarding (3 Fragen -> sessionStorage 'inkassoOnboarding')
   * ============================================================ */
  (function initOnboarding() {
    const onbSection = document.getElementById('onboarding-section');
    const uploadSection = document.getElementById('upload-section');
    const continueBtn = document.getElementById('onb-continue');
    const amountWrap = document.getElementById('onb-amount-wrap');
    const amountInput = document.getElementById('onb-amount');
    if (!onbSection || !continueBtn) return;

    const OPT_ON = 'onb-opt rounded-full px-5 py-2 text-sm font-semibold transition bg-mint text-white shadow-sm';
    const OPT_OFF = 'onb-opt rounded-full px-5 py-2 text-sm font-semibold transition text-ink-700/70 dark:text-slate-300';

    const state = { ersterBrief: null, bereitsWidersprochen: null, bereitsGezahlt: null };

    function parseEur(s) {
      s = String(s == null ? '' : s).trim().replace(/[€\s]/g, '');
      if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : NaN;
    }

    function validate() {
      const answered = state.ersterBrief !== null && state.bereitsWidersprochen !== null && state.bereitsGezahlt !== null;
      const amountOk = state.bereitsGezahlt !== true || parseEur(amountInput && amountInput.value) > 0;
      continueBtn.disabled = !(answered && amountOk);
    }

    function selectInQuestion(q, val) {
      q.querySelectorAll('.onb-opt').forEach((b) => {
        b.className = b.dataset.val === String(val) ? OPT_ON : OPT_OFF;
      });
    }

    document.querySelectorAll('.onb-q').forEach((q) => {
      const key = q.dataset.key;
      q.querySelectorAll('.onb-opt').forEach((btn) => {
        btn.addEventListener('click', () => {
          const val = btn.dataset.val === 'true';
          selectInQuestion(q, btn.dataset.val);
          if (key === 'bereitsGezahlt') {
            state.bereitsGezahlt = val;
            if (amountWrap) {
              amountWrap.classList.toggle('hidden', !val);
              if (val) { if (amountInput) amountInput.focus(); }
              else if (amountInput) amountInput.value = '';
            }
          } else {
            state[key] = val;
          }
          validate();
        });
      });
    });

    if (amountInput) amountInput.addEventListener('input', validate);

    try {
      const prev = JSON.parse(sessionStorage.getItem('inkassoOnboarding') || 'null');
      if (prev) {
        state.ersterBrief = prev.ersterBrief !== false;
        state.bereitsWidersprochen = prev.bereitsWidersprochen === true;
        state.bereitsGezahlt = Number(prev.bereitsGezahltEur) > 0;
        document.querySelectorAll('.onb-q').forEach((q) => {
          const k = q.dataset.key;
          if (k === 'bereitsGezahlt') selectInQuestion(q, state.bereitsGezahlt);
          else selectInQuestion(q, state[k]);
        });
        if (state.bereitsGezahlt && amountWrap) {
          amountWrap.classList.remove('hidden');
          if (amountInput) amountInput.value = String(prev.bereitsGezahltEur).replace('.', ',');
        }
        validate();
      }
    } catch (_) {}

    continueBtn.addEventListener('click', () => {
      const onboarding = {
        ersterBrief: state.ersterBrief,
        bereitsWidersprochen: state.bereitsWidersprochen,
        bereitsGezahltEur: state.bereitsGezahlt ? Math.round(parseEur(amountInput.value) * 100) / 100 : 0,
      };
      try { sessionStorage.setItem('inkassoOnboarding', JSON.stringify(onboarding)); } catch (_) {}

      onbSection.classList.add('hidden');
      if (uploadSection) {
        uploadSection.classList.remove('hidden');
        uploadSection.classList.add('reveal');
        if (typeof reveal === 'function') reveal(uploadSection);
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  })();

  /* ============================================================
   * 4) Upload-Zone (Drag & Drop + API + Lade-Choreografie)
   * ============================================================ */
  (function initUpload() {
    const form = document.getElementById('upload-form');
    const dropzone = document.getElementById('dropzone');
    const input = document.getElementById('file-input');
    const pill = document.getElementById('file-pill');
    const nameEl = document.getElementById('file-name');
    const btn = document.getElementById('analyze-btn');
    if (!form || !dropzone || !input) return;

    const MAX = 10 * 1024 * 1024;
    const OK = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    const label = btn.querySelector('span');
    const loader = createLoader();
    let file = null;

    // Handy-Fotos vor dem Upload verkleinern: hält die Anfrage unter Vercels
    // 4,5-MB-Body-Limit und spart Vision-Tokens. PDFs bleiben unverändert.
    async function maybeDownscale(f) {
      if (!f.type || !f.type.startsWith('image/')) return f;
      if (f.size < 0.4 * 1024 * 1024) return f;
      try {
        const bmp = await createImageBitmap(f);
        const maxEdge = 1600; // reicht fürs OCR, spart Vision-Tokens & Zeit
        const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
        const w = Math.round(bmp.width * scale);
        const h = Math.round(bmp.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
        if (bmp.close) bmp.close();
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
        if (!blob) return f;
        return new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
      } catch (_) {
        return f;
      }
    }

    function setFile(f) {
      if (!f) return;
      if (f.size > MAX) { alert('Die Datei ist zu groß (max. 10 MB).'); return; }
      if (f.type && !OK.includes(f.type)) { alert('Bitte ein Foto (JPG/PNG) oder PDF hochladen.'); return; }
      file = f;
      nameEl.textContent = f.name;
      pill.classList.remove('hidden'); pill.classList.add('inline-flex');
      btn.disabled = false;
    }

    input.addEventListener('change', (e) => setFile(e.target.files[0]));
    ['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('is-dragover'); }));
    ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('is-dragover'); }));
    dropzone.addEventListener('drop', (e) => setFile(e.dataTransfer && e.dataTransfer.files[0]));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!file) return;
      btn.disabled = true;
      label.textContent = 'Analysiere Forderung …';
      if (loader) loader.start();
      try {
        const toSend = await maybeDownscale(file);
        if (toSend.size > 4.4 * 1024 * 1024) {
          throw new Error('Die Datei ist nach der Komprimierung noch zu groß (max. ~4 MB). Bitte ein kleineres Foto oder ein komprimiertes PDF hochladen.');
        }
        const fd = new FormData(); fd.append('file', toSend);
        try { const onb = sessionStorage.getItem('inkassoOnboarding'); if (onb) fd.append('onboarding', onb); } catch (_) {}
        const res = await fetch('/api/analyze', { method: 'POST', body: fd });

        // Robust: Body als Text lesen und tolerant parsen. Verhindert den kryptischen
        // "The string did not match the expected pattern"-Fehler (iOS/WebKit), falls
        // die Plattform bei Timeout/Fehler HTML/Text statt JSON zurückgibt.
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (_) { data = null; }

        if (!res.ok || !data || data.ok !== true || !data.data) {
          const msg = (data && data.error)
            || (res.status === 413 ? 'Die Datei ist zu groß. Bitte kleiner hochladen.'
              : res.status === 504 ? 'Die Analyse hat zu lange gedauert. Bitte mit einem kleineren, scharfen Bild erneut versuchen.'
              : `Die Analyse ist fehlgeschlagen (Status ${res.status || '–'}). Bitte erneut versuchen.`);
          throw new Error(msg);
        }
        sessionStorage.setItem('inkassoResult', JSON.stringify(data.data));
        const go = () => { window.location.href = 'dashboard.html'; };
        if (loader) loader.finish(go); else go();
      } catch (err) {
        if (loader) loader.stop();
        alert(err.message || 'Es ist ein Fehler aufgetreten. Bitte erneut versuchen.');
        btn.disabled = false;
        label.textContent = 'Forderung jetzt analysieren';
      }
    });
  })();

  /* ============================================================
   * 5) Dashboard – Ergebnis rendern (Schema: stammdaten/berechnung/…)
   * ============================================================ */
  (function initDashboard() {
    const root = document.getElementById('dashboard');
    if (!root) return;

    const raw = sessionStorage.getItem('inkassoResult');
    if (!raw) { window.location.href = 'index.html'; return; }
    let d; try { d = JSON.parse(raw); } catch (_) { window.location.href = 'index.html'; return; }

    // Server-Hinweise transparent anzeigen
    const hinweise = Array.isArray(d.hinweise) ? d.hinweise : [];
    const hbox = document.getElementById('hinweise-box');
    const hlist = document.getElementById('hinweise-list');
    if (hbox && hlist && hinweise.length) {
      hlist.innerHTML = hinweise
        .map((h) => `<li class="flex gap-2"><span aria-hidden="true">•</span><span>${esc(h)}</span></li>`)
        .join('');
      hbox.classList.remove('hidden');
      if (typeof reveal === 'function') reveal(hbox);
    }

    const stamm = d.stammdaten || {};
    const ber = d.berechnung || {};
    const posten = Array.isArray(d.posten) ? d.posten : [];

    const nf = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
    const fmt = (n) => nf.format(Number(n) || 0);
    const $ = (id) => document.getElementById(id);
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };

    const orig = Number(stamm.originalSumme) || 0;
    const fair = Number(ber.fairerKern) || 0;
    const saving = ber.ersparnis != null ? Number(ber.ersparnis) : Math.max(0, orig - fair);

    function countUp(id, target) {
      const el = $(id); if (!el) return;
      target = Number(target) || 0;
      if (REDUCED) { el.textContent = fmt(target); return; }
      const dur = 950; let start = null;
      function frame(ts) {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        el.textContent = fmt(target * EASE_OUT(p));
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    // Kopf
    set('meta-glaeubiger', stamm.inkassoName || stamm.glaeubiger || 'Unbekannter Gläubiger');
    const az = stamm.aktenzeichen && String(stamm.aktenzeichen).toLowerCase() !== 'unbekannt' ? stamm.aktenzeichen : '';
    set('meta-az', az ? `Az. ${az}` : '');

    // Kennzahlen
    countUp('val-fair', fair);
    countUp('val-original', orig);
    countUp('val-saving', saving);
    const pct = orig > 0 ? Math.round((saving / orig) * 100) : 0;
    set('val-saving-pct', `−${pct}%`);

    const bar = $('fair-bar');
    if (bar) {
      const ratio = orig > 0 ? Math.max(0.04, Math.min(fair / orig, 1)) : 0;
      requestAnimationFrame(() => { bar.style.transform = `scaleX(${ratio})`; });
    }

    // Posten
    const STATUS = {
      RECHTENS: { label: 'Rechtens', cls: 'bg-mint/15 text-mint-dark dark:text-mint-light' },
      GEKUERZT: { label: 'Gekürzt', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300' },
      NICHT_RECHTENS: { label: 'Nicht rechtens', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300' },
    };
    const list = $('posten-list');
    if (list) {
      list.innerHTML = '';
      posten.forEach((p, i) => {
        const s = STATUS[p.status] || STATUS.GEKUERZT;
        const card = document.createElement('div');
        card.className = 'reveal rounded-4xl border border-white/70 bg-white/85 p-5 bezel-soft dark:border-white/10 dark:bg-night-surface';
        card.style.setProperty('--reveal-delay', `${Math.min(i * 60, 360)}ms`);

        let betragHtml;
        if (p.status === 'NICHT_RECHTENS') {
          betragHtml = `<span class="text-ink-700/40 line-through dark:text-slate-500">${fmt(p.betrag)}</span>
            <svg class="h-3.5 w-3.5 text-mint-dark dark:text-mint-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6l6 6-6 6"/></svg>
            <span class="font-bold text-ink-950 dark:text-white">${fmt(0)}</span>`;
        } else if (p.status === 'GEKUERZT') {
          betragHtml = `<span class="font-bold text-ink-950 dark:text-white">${fmt(p.betrag)}</span>
            <span class="text-xs font-semibold text-amber-700 dark:text-amber-300">wird gekürzt</span>`;
        } else {
          betragHtml = `<span class="font-bold text-ink-950 dark:text-white">${fmt(p.betrag)}</span>`;
        }

        card.innerHTML = `
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-bold text-ink-950 dark:text-white">${esc(p.name)}</p>
              ${p.paragraph ? `<p class="mt-0.5 text-xs font-medium text-ink-700/45 dark:text-slate-400">${esc(p.paragraph)}</p>` : ''}
            </div>
            <span class="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.cls}">${s.label}</span>
          </div>
          <div class="tabular mt-2 flex items-baseline gap-2">${betragHtml}</div>
          <p class="mt-2 text-sm leading-relaxed text-ink-700/80 dark:text-slate-300">${esc(p.wieso)}</p>`;
        list.appendChild(card);
        reveal(card);
      });
    }

    // Wieso / Weshalb / Warum – aus den Daten abgeleitet (nicht erfunden)
    const total = posten.length;
    const beanstandet = posten.filter((p) => p.status !== 'RECHTENS').length;
    set('exp-wieso', total === 0
      ? 'Es konnten keine Einzelposten erkannt werden.'
      : (beanstandet > 0
        ? `Von ${total} geprüften Posten ${beanstandet === 1 ? 'ist 1 Posten' : `sind ${beanstandet} Posten`} nicht rechtens oder überhöht. Statt ${fmt(orig)} musst du nur ${fmt(fair)} zahlen.`
        : `Alle ${total} Posten halten der rechtlichen Prüfung stand.`));

    const paras = Array.from(new Set(posten.filter((p) => p.status !== 'RECHTENS').map((p) => p.paragraph).filter(Boolean)));
    set('exp-weshalb', paras.length
      ? `Maßgeblich sind u. a.: ${paras.join(' · ')}.`
      : 'Die geforderten Beträge sind rechtlich nicht zu beanstanden.');

    set('exp-warum', 'Mit einem sofortigen Teilwiderspruch zahlst du nur den unstrittigen fairen Kern. Die fertige E-Mail enthält eine Tilgungsbestimmung (§ 366 Abs. 1 BGB) und widerspricht der Übermittlung der bestrittenen Forderung an die SCHUFA (§ 31 BDSG) – so vermeidest du einen negativen Eintrag.');

    // E-Mail
    const subject = az ? `Teilwiderspruch – Aktenzeichen ${az}` : 'Teilwiderspruch gegen Ihre Forderung';
    const body = d.emailTemplate || '';
    set('mail-subject', subject);
    const mailEl = $('mail-text');
    if (mailEl) mailEl.value = body;

    const copyBtn = $('copy-mail');
    if (copyBtn) {
      const span = copyBtn.querySelector('span');
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(`Betreff: ${subject}\n\n${body}`);
          const prev = span.textContent; span.textContent = 'Kopiert ✓';
          setTimeout(() => { span.textContent = prev; }, 1800);
        } catch (_) { if (mailEl) { mailEl.focus(); mailEl.select(); } }
      });
    }

    // Raten-Slider (mit KI-Vorschlag vorbelegt)
    const slider = $('rate-slider');
    if (slider) {
      const seed = Math.max(1, Math.min(Number(ber.laufzeitMonate) || 3, 12));
      slider.value = String(seed);
      const update = () => {
        const m = Number(slider.value);
        const min = Number(slider.min) || 1, max = Number(slider.max) || 12;
        slider.style.setProperty('--fill', `${((m - min) / (max - min)) * 100}%`);
        set('rate-months', `${m} ${m === 1 ? 'Monat' : 'Monate'}`);
        set('rate-amount', fmt(fair / m));
      };
      slider.addEventListener('input', update);
      update();
      if (ber.vorgeschlageneRate) {
        set('rate-suggest', `KI-Vorschlag: ${fmt(ber.vorgeschlageneRate)} pro Monat über ${seed} ${seed === 1 ? 'Monat' : 'Monate'}`);
      } else {
        const el = $('rate-suggest'); if (el) el.style.display = 'none';
      }
    }

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  })();
})();
