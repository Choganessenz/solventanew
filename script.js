/* ═══════════════════════════════════════════════════════════
   Navbar, directional slide animations
   ════════════════════════════════════════════════════════ */
(() => {
  const navMenu = document.querySelector('.nav-menu');
  const items   = Array.from(document.querySelectorAll('.nav-item'));

  let activeIndex   = -1;
  let activeContent = null;

  const ANIM_CLASSES = [
    'anim-enter-right', 'anim-enter-left',
    'anim-exit-left',   'anim-exit-right',
    'anim-zoom-in',     'anim-zoom-out',
  ];

  function clearAnim(el) {
    el.classList.remove(...ANIM_CLASSES, 'is-exiting');
  }

  function runAnim(el, cls, onEnd) {
    clearAnim(el);
    void el.offsetWidth;
    el.classList.add(cls);
    el.addEventListener('animationend', () => {
      el.classList.remove(cls);
      onEnd?.();
    }, { once: true });
  }

  function closePanel(content, exitCls) {
    if (!content) return;
    const item = content.closest('.nav-item');
    if (exitCls) {
      content.classList.add('is-exiting');
      runAnim(content, exitCls, () => {
        content.classList.remove('is-exiting');
        item?.classList.remove('is-open');
      });
    } else {
      clearAnim(content);
      item?.classList.remove('is-open');
    }
  }

  function openPanel(content, item, enterCls) {
    item.classList.add('is-open');
    runAnim(content, enterCls ?? 'anim-zoom-in', null);
  }

  let closeTimer = null;

  function cancelClose() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  }

  items.forEach((item, index) => {
    item.addEventListener('mouseenter', () => {
      cancelClose();
      const content = item.querySelector('.nav-content');
      if (activeIndex === index) return;

      // Plain link (no dropdown), keep current dropdown open, just track position
      if (!content) {
        activeIndex = index;
        return;
      }

      if (activeContent && activeIndex !== -1) {
        // Find the index of the item that owns the currently open dropdown
        const openIdx = items.findIndex(i => i.classList.contains('is-open'));
        const goingRight = index > (openIdx !== -1 ? openIdx : activeIndex);
        closePanel(activeContent, goingRight ? 'anim-exit-left' : 'anim-exit-right');
        openPanel(content, item, goingRight ? 'anim-enter-right' : 'anim-enter-left');
        activeContent = content;
      } else {
        openPanel(content, item, null);
        activeContent = content;
      }
      activeIndex = index;
    });
  });

  navMenu.addEventListener('mouseleave', () => {
    // Small delay prevents snap-close when the cursor briefly leaves while
    // moving from the trigger button toward the dropdown panel below.
    closeTimer = setTimeout(() => {
      if (activeContent) {
        const item = activeContent.closest('.nav-item');
        activeContent.classList.add('is-exiting');
        runAnim(activeContent, 'anim-zoom-out', () => {
          activeContent?.classList.remove('is-exiting');
          item?.classList.remove('is-open');
          activeContent = null;
          activeIndex   = -1;
        });
      } else {
        items.forEach(i => i.classList.remove('is-open'));
        activeIndex = -1;
      }
    }, 120);
  });

  navMenu.addEventListener('mouseenter', cancelClose);
})();

/* ═══════════════════════════════════════════════════════════
   LandingHero, Floating Parallax + TextRotate
   ════════════════════════════════════════════════════════ */
(() => {
  // ── 1. Floating parallax images (optional, only if present) ──
  // Matches Floating component: sensitivity=-0.5, easingFactor=0.05
  const floatingContainer = document.getElementById('lheroFloating');
  if (floatingContainer) {
    const SENSITIVITY   = -0.5;
    const EASING_FACTOR = 0.05;
    const floatEls      = [];
    let   mouseX = 0, mouseY = 0;

    let visibleCount = 0;
    document.querySelectorAll('.lhero-float').forEach((el) => {
      const depth = parseFloat(el.dataset.depth ?? '1');
      floatEls.push({ el, depth, x: 0, y: 0 });

      // Only stagger-fade visible elements (xl-only images are display:none on regular screens)
      const isVisible = getComputedStyle(el).display !== 'none';
      if (isVisible) {
        const delay = 500 + visibleCount * 200;
        setTimeout(() => { el.style.opacity = '1'; }, delay);
        visibleCount++;
      }
    });

    window.addEventListener('mousemove', (e) => {
      const rect = floatingContainer.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });

    (function animateFloat() {
      floatEls.forEach((data) => {
        const rect = floatingContainer.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const offsetX = (mouseX - centerX) / centerX;
        const offsetY = (mouseY - centerY) / centerY;
        const strength = (data.depth * SENSITIVITY) / 20;
        const tx = offsetX * strength * 100;
        const ty = offsetY * strength * 100;
        data.x += (tx - data.x) * EASING_FACTOR;
        data.y += (ty - data.y) * EASING_FACTOR;
        data.el.style.transform = `translate3d(${data.x}px,${data.y}px,0)`;
      });
      requestAnimationFrame(animateFloat);
    })();
  }

  // ── 2. Staggered content entrance ────────────────────────
  // animate {opacity:1, y:0} initial {opacity:0, y:20} delays 0.3/0.5/0.7 s
  setTimeout(() => document.getElementById('lheroTitle')?.classList.add('is-visible'),   300);
  setTimeout(() => document.getElementById('lheroSub')?.classList.add('is-visible'),     500);
  setTimeout(() => document.getElementById('lheroButtons')?.classList.add('is-visible'), 700);

  // ── 3. TextRotate ─────────────────────────────────────────
  // Props: staggerFrom="last", staggerDuration=0.03,
  //        rotationInterval=3000
  //        exit  { y: "-120%", opacity: 0 }
  //        initial { y: "100%", opacity: 0 }
  const rotateEl = document.getElementById('lheroRotate');
  if (!rotateEl) return;

  const TEXTS    = ['mehr Kunden', 'erfolgreich', 'einzigartig', 'sichtbar'];
  const INTERVAL = 3000;
  const STAGGER  = 30;   // ms, staggerDuration 0.03 s
  let   currentIdx = 0;
  let   rotating   = false;

  function splitChars(text) {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
      return Array.from(seg.segment(text), s => s.segment);
    }
    return [...text];
  }

  function buildSpans(text) {
    // Capture width BEFORE DOM changes so we can animate from it
    const oldW = rotateEl.offsetWidth;

    rotateEl.innerHTML = '';
    splitChars(text).forEach((ch, i) => {
      const s = document.createElement('span');
      s.className   = 'tr-char';
      // spaces collapse inside inline-block spans → keep them visible
      if (ch === ' ') { s.classList.add('tr-space'); s.innerHTML = '&nbsp;'; }
      else { s.textContent = ch; }
      s.dataset.i   = String(i);
      rotateEl.appendChild(s);
    });

    // Natural width of the new text (transforms don't affect layout, so this is accurate)
    const newW = rotateEl.offsetWidth;

    // Smoothly animate width so "wird " repositions fluidly instead of jumping
    if (Math.abs(newW - oldW) > 1) {
      rotateEl.style.transition = 'none';
      rotateEl.style.width      = `${oldW}px`;
      void rotateEl.offsetWidth;                               // force reflow, pin old width
      rotateEl.style.transition = 'width 300ms cubic-bezier(0.22,1,0.36,1)';
      rotateEl.style.width      = `${newW}px`;
      setTimeout(() => {
        rotateEl.style.removeProperty('width');
        rotateEl.style.removeProperty('transition');
      }, 320);
    }

    return Array.from(rotateEl.querySelectorAll('.tr-char'));
  }

  // staggerFrom="last" → last char has delay 0, first has max delay
  const staggerDelay = (i, total) => (total - 1 - i) * STAGGER;

  function setBelow(spans) {
    spans.forEach(s => {
      s.style.transition = 'none';
      s.style.transform  = 'translateY(100%)';
      s.style.opacity    = '0';
    });
  }

  function animateIn(spans) {
    const total = spans.length;
    spans.forEach((s, i) => {
      setTimeout(() => {
        s.style.transition = 'transform 300ms cubic-bezier(0.22,1,0.36,1), opacity 250ms ease';
        s.style.transform  = 'translateY(0)';
        s.style.opacity    = '1';
      }, staggerDelay(i, total));
    });
  }

  function animateOut(spans, onDone) {
    const total = spans.length;
    spans.forEach((s, i) => {
      setTimeout(() => {
        s.style.transition = 'transform 200ms ease, opacity 150ms ease';
        s.style.transform  = 'translateY(-120%)';
        s.style.opacity    = '0';
      }, staggerDelay(i, total));
    });
    setTimeout(onDone, (total - 1) * STAGGER + 250);
  }

  // Initial render, enter after title appears
  const initSpans = buildSpans(TEXTS[0]);
  setBelow(initSpans);
  setTimeout(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => animateIn(initSpans)));
  }, 400);

  // Auto-rotation loop
  setInterval(() => {
    if (rotating) return;
    rotating = true;
    const outSpans = Array.from(rotateEl.querySelectorAll('.tr-char'));
    animateOut(outSpans, () => {
      currentIdx = (currentIdx + 1) % TEXTS.length;
      const inSpans = buildSpans(TEXTS[currentIdx]);
      setBelow(inSpans);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        animateIn(inSpans);
        setTimeout(() => { rotating = false; }, (inSpans.length - 1) * STAGGER + 350);
      }));
    });
  }, INTERVAL);
})();

/* ═══════════════════════════════════════════════════════════
   Reviews, 3D Testimonials (reui/3d-testimonails)
   ════════════════════════════════════════════════════════ */
(() => {
  // ── Review data (9 entries, invented for demo) ──────────
  const REVIEWS = [
    {
      name: 'Thomas Bergmann',
      service: 'Website-Projekt',
      initials: 'TB',
      color: { bg: '#020d7c', fg: '#fff' },
      text: 'Solventa hat unsere Website komplett neu gestaltet. Das Ergebnis ist modern, schnell und wir bekommen deutlich mehr Anfragen. Absolute Empfehlung!',
    },
    {
      name: 'Sandra Keller',
      service: 'Webdesign',
      initials: 'SK',
      color: { bg: '#39ceff', fg: '#020d7c' },
      text: 'Sehr professionelle Zusammenarbeit. Die neue Website lädt blitzschnell und sieht auf dem Handy genauso gut aus wie am PC.',
    },
    {
      name: 'Markus Vogt',
      service: 'Digitales System',
      initials: 'MV',
      color: { bg: '#6366f1', fg: '#fff' },
      text: 'Wir brauchten ein internes Mitarbeiterportal, Solventa hat es genau nach unseren Vorstellungen umgesetzt. Schnelle Reaktionszeiten!',
    },
    {
      name: 'Julia Schneider',
      service: 'Logo & Branding',
      initials: 'JS',
      color: { bg: '#ec4899', fg: '#fff' },
      text: 'Das neue Logo und die Corporate Identity sind genau das, was wir uns vorgestellt haben. Kreativ, klar und professionell. Danke!',
    },
    {
      name: 'Peter Hoffmann',
      service: 'Webdesign & SEO',
      initials: 'PH',
      color: { bg: '#10b981', fg: '#fff' },
      text: 'Faire Preise und ein tolles Ergebnis. Unsere neue Website ist seit dem Launch deutlich besser bei Google zu finden.',
    },
    {
      name: 'Nina Braun',
      service: 'Website-Projekt',
      initials: 'NB',
      color: { bg: '#f59e0b', fg: '#fff' },
      text: 'Super schnelle Umsetzung! Innerhalb von 3 Wochen hatten wir eine komplett neue Website. Design und Technik stimmen einfach.',
    },
    {
      name: 'Andreas Koch',
      service: 'Webdesign',
      initials: 'AK',
      color: { bg: '#ef4444', fg: '#fff' },
      text: 'Das Team von Solventa hat uns bei unserem Online-Auftritt wirklich geholfen. Endlich werden wir bei Google gefunden!',
    },
    {
      name: 'Laura Meyer',
      service: 'Buchungssystem',
      initials: 'LM',
      color: { bg: '#8b5cf6', fg: '#fff' },
      text: 'Wir haben ein maßgeschneidertes Buchungssystem bekommen, das perfekt zu unseren Abläufen passt. Jede Anforderung wurde umgesetzt.',
    },
    {
      name: 'Felix Wagner',
      service: 'Website-Projekt',
      initials: 'FW',
      color: { bg: '#0ea5e9', fg: '#fff' },
      text: 'Tolle Erfahrung von der ersten Anfrage bis zur fertigen Website. Freundlich, kompetent und die Deadlines wurden eingehalten.',
    },
  ];

  // Google G SVG (multicolor, exact brand colors)
  const GOOGLE_G = `<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>`;

  // ── Build a single review card ────────────────────────────
  function createCard(r) {
    const card = document.createElement('div');
    card.className = 'rev-card';
    card.innerHTML = `
      <div class="rev-card-top">
        <span class="rev-stars" aria-label="5 Sterne">★★★★★</span>
        ${GOOGLE_G}
      </div>
      <div class="rev-author">
        <div class="rev-avatar" style="background:${r.color.bg};color:${r.color.fg}">${r.initials}</div>
        <div>
          <div class="rev-name">${r.name}</div>
          <div class="rev-service">${r.service}</div>
        </div>
      </div>
      <blockquote class="rev-text">„${r.text}"</blockquote>
    `;
    return card;
  }

  // ── Fill one column with `repeat` copies of all reviews ──
  // Matches Marquee repeat=3: 3 inner divs → seamless vertical loop
  function fillCol(id, repeat) {
    const col = document.getElementById(id);
    if (!col) return;
    for (let r = 0; r < repeat; r++) {
      const inner = document.createElement('div');
      inner.className = 'marquee-inner';
      REVIEWS.forEach(review => inner.appendChild(createCard(review)));
      col.appendChild(inner);
    }
  }

  fillCol('revCol1', 3);
  fillCol('revCol2', 3);
  fillCol('revCol3', 3);
  fillCol('revCol4', 3);
})();

/* ═══════════════════════════════════════════════════════════
   Gallery4, Leistungen carousel
   ════════════════════════════════════════════════════════ */
(() => {
  const track    = document.getElementById('g4Track');
  const prevBtn  = document.getElementById('g4Prev');
  const nextBtn  = document.getElementById('g4Next');
  const dotsWrap = document.getElementById('g4Dots');
  if (!track) return;

  const items = Array.from(track.querySelectorAll('.g4-item'));
  const count = items.length;
  let current  = 0;

  // ── Create dot buttons ────────────────────────────────────
  items.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'g4-dot';
    dot.setAttribute('aria-label', `Leistung ${i + 1} anzeigen`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });

  // ── Helpers ───────────────────────────────────────────────
  function itemWidth() {
    // card width + gap (20px)
    return (items[0]?.getBoundingClientRect().width ?? 320) + 20;
  }

  function visibleCount() {
    const containerWidth = track.parentElement?.getBoundingClientRect().width ?? window.innerWidth;
    const paddingLeft    = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    return Math.max(1, Math.floor((containerWidth - paddingLeft) / itemWidth()));
  }

  function maxSlide() {
    return Math.max(0, count - visibleCount());
  }

  // ── Navigate ──────────────────────────────────────────────
  function goTo(index) {
    current = Math.max(0, Math.min(index, maxSlide()));

    track.style.transform = `translateX(-${current * itemWidth()}px)`;

    // dots
    dotsWrap.querySelectorAll('.g4-dot').forEach((d, i) => {
      d.classList.toggle('is-active', i === current);
    });

    // arrows
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current >= maxSlide();
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // recalculate on resize (item width is responsive 320→360px)
  window.addEventListener('resize', () => goTo(current), { passive: true });

  // ── Touch swipe (dragFree on mobile from demo) ────────────
  let touchStartX = 0;
  track.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 48) goTo(diff > 0 ? current + 1 : current - 1);
  }, { passive: true });

  // ── Init ──────────────────────────────────────────────────
  goTo(0);
})();

/* ═══════════════════════════════════════════════════════════
   Erfolge, Sticky Scroll Showcase (pinned stage, scenes swap)
   ════════════════════════════════════════════════════════ */
(() => {
  const section = document.querySelector('.showcase');
  if (!section) return;

  const track  = section.querySelector('.sc-track');
  const scenes = Array.from(section.querySelectorAll('.sc-scene'));
  const dots   = Array.from(section.querySelectorAll('.sc-dot'));
  const glow   = section.querySelector('.sc-glow');
  if (!track || scenes.length === 0) return;

  const counted = new Set();   // scene indices whose counters already ran

  // ── Counter animation (German comma, optional prefix/suffix) ──
  function animateCounter(el) {
    const target   = parseFloat(el.dataset.target);
    const prefix   = el.dataset.prefix || '';
    const suffix   = el.dataset.suffix || '';
    const decimals = (el.dataset.target || '').includes('.') ? 1 : 0;

    const start = performance.now();
    const duration = 1400;

    function frame(time) {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);          // easeOutCubic
      const value = target * eased;
      const display = decimals
        ? value.toFixed(1).replace('.', ',')
        : String(Math.round(value));
      el.textContent = prefix + display + suffix;
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function runCounters(index) {
    if (counted.has(index)) return;
    counted.add(index);
    const stats = scenes[index].querySelectorAll('.stat-value');
    stats.forEach((stat, i) => setTimeout(() => animateCounter(stat), i * 160));
  }

  // ── Activate a given scene (toggle classes, play its video) ──
  let activeIndex = -1;
  function setActive(index) {
    if (index === activeIndex) return;
    activeIndex = index;

    scenes.forEach((scene, i) => {
      const on = i === index;
      scene.classList.toggle('is-active', on);
      const video = scene.querySelector('.sc-video');
      if (video) {
        if (on) video.play?.().catch(() => {});
        else    video.pause?.();
      }
    });
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));

    runCounters(index);
  }

  // ── Desktop: scroll-driven pinned stage ──
  const mq = window.matchMedia('(max-width: 767px)');

  function onScroll() {
    if (mq.matches) return;   // mobile handled separately

    const rect = track.getBoundingClientRect();
    const distance = track.offsetHeight - window.innerHeight;
    const progress = distance > 0
      ? Math.min(Math.max(-rect.top / distance, 0), 1)
      : 0;

    // Split progress evenly across scenes
    const index = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));
    setActive(index);

    // Parallax the ambient glow
    if (glow) {
      const drift = (progress - 0.5) * 120;          // px
      glow.style.transform = `translate(calc(-50% + ${drift}px), calc(-50% + ${drift * 0.4}px))`;
    }
  }

  // ── Mobile: each scene animates as it scrolls into view ──
  function initMobile() {
    if (!('IntersectionObserver' in window)) {
      scenes.forEach((_, i) => runCounters(i));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const i = scenes.indexOf(e.target);
        runCounters(i);
        e.target.querySelector('.sc-video')?.play?.().catch(() => {});
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    scenes.forEach((s) => io.observe(s));
  }

  // ── Boot ──
  if (mq.matches) {
    initMobile();
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Re-evaluate if the user crosses the breakpoint
  mq.addEventListener?.('change', (e) => {
    if (e.matches) initMobile();
    else { activeIndex = -1; onScroll(); }
  });
})();

/* ═══════════════════════════════════════════════════════════
   Scroll reveal, fade/slide elements in as they enter view
   ════════════════════════════════════════════════════════ */
(() => {
  const els = Array.from(document.querySelectorAll('.reveal'));
  if (els.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  els.forEach(el => io.observe(el));
})();

/* ═══════════════════════════════════════════════════════════
   So arbeiten wir, timeline: draw line + light up nodes in sequence
   ════════════════════════════════════════════════════════ */
(() => {
  const section = document.querySelector('.proc');
  if (!section) return;

  const lineFill = document.getElementById('procLineFill');
  const mobile   = () => window.matchMedia('(max-width: 767px)').matches;

  let played = false;

  function play() {
    if (played) return;
    played = true;

    // 1) cards/nodes fade+slide in (CSS handles the stagger via --i)
    section.classList.add('is-animated');

    // 2) draw the connecting line to full
    if (lineFill) {
      requestAnimationFrame(() => {
        if (mobile()) lineFill.style.height = '100%';
        else          lineFill.style.width  = '100%';
      });
    }
  }

  if (!('IntersectionObserver' in window)) { play(); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { play(); io.disconnect(); }
    });
  }, { threshold: 0.35 });
  io.observe(section);
})();

/* ═══════════════════════════════════════════════════════════
   FAQ, accordion (one open at a time)
   ════════════════════════════════════════════════════════ */
(() => {
  const items = Array.from(document.querySelectorAll('.faq-item'));
  if (items.length === 0) return;

  function close(item) {
    const ans = item.querySelector('.faq-a');
    const btn = item.querySelector('.faq-q');
    item.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    ans.style.maxHeight = '0px';
  }

  function open(item) {
    const ans = item.querySelector('.faq-a');
    const btn = item.querySelector('.faq-q');
    item.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    ans.style.maxHeight = ans.scrollHeight + 'px';
  }

  items.forEach((item) => {
    const btn = item.querySelector('.faq-q');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      // close all, then open clicked (single-open accordion)
      items.forEach(close);
      if (!isOpen) open(item);
    });
  });

  // Keep an open answer correctly sized on resize
  window.addEventListener('resize', () => {
    const openItem = items.find(i => i.classList.contains('is-open'));
    if (openItem) {
      const ans = openItem.querySelector('.faq-a');
      ans.style.maxHeight = ans.scrollHeight + 'px';
    }
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════
   CTA Text-Marquee, fade items by distance from center
   ════════════════════════════════════════════════════════ */
(() => {
  const marquee = document.getElementById('mctaMarquee');
  if (!marquee) return;

  const items = Array.from(marquee.querySelectorAll('.mcta-item'));
  if (items.length === 0) return;

  let running = false;

  function updateOpacity() {
    const box = marquee.getBoundingClientRect();
    const centerY = box.top + box.height / 2;
    const maxDistance = box.height / 2;

    items.forEach((item) => {
      const r = item.getBoundingClientRect();
      const itemCenter = r.top + r.height / 2;
      const dist = Math.abs(centerY - itemCenter);
      const norm = Math.min(dist / maxDistance, 1);
      item.style.opacity = (1 - norm * 0.78).toFixed(3);
    });

    requestAnimationFrame(updateOpacity);
  }

  // Only run the per-frame loop while the marquee is on screen
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !running) {
          running = true;
          requestAnimationFrame(updateOpacity);
        }
      });
    }, { threshold: 0 });
    io.observe(marquee);
  } else {
    requestAnimationFrame(updateOpacity);
  }
})();

/* ═══════════════════════════════════════════════════════════
   Projekte (Features-7), reference carousel (slide + counters + video/img)
   ════════════════════════════════════════════════════════ */
(() => {
  const section  = document.querySelector('.feat7');
  const swap     = document.getElementById('feat7Swap');
  const media    = document.getElementById('feat7Media');
  const project  = document.getElementById('feat7Project');
  const prevBtn  = document.getElementById('feat7Prev');
  const nextBtn  = document.getElementById('feat7Next');
  const dotsWrap = document.getElementById('feat7Dots');
  if (!section || !swap || !media || !project) return;

  const NB = ' ';   // non-breaking space (figures never wrap)

  const PROJECTS = [
    {
      name: 'Bautrocknung OWL',
      media: {
        type: 'video',
        webm: 'material/bautrocknung.webm',
        mp4:  'material/bautrocknung.mp4',
        poster: 'material/bautrocknung_poster.jpg',
        label: 'Scroll-Aufnahme der Website von Bautrocknung OWL',
      },
      stats: [
        { target: 212, prefix: '+', suffix: NB + '%' },
        { target: 180, prefix: '+', suffix: NB + '%' },
        { static: '#1' },
      ],
    },
    {
      name: 'Grünwerk Galabau',
      media: {
        type: 'video',
        webm: 'material/gruenwerk.webm',
        mp4:  'material/gruenwerk.mp4',
        poster: 'material/gruenwerk_poster.jpg',
        label: 'Scroll-Aufnahme der Website des Garten- und Landschaftsbauers Grünwerk',
      },
      stats: [
        { target: 165, prefix: '+', suffix: NB + '%' },
        { target: 140, prefix: '+', suffix: NB + '%' },
        { static: '#3' },
      ],
    },
    {
      name: 'Koya',
      media: {
        type: 'video',
        webm: 'material/koya.webm',
        mp4:  'material/koya.mp4',
        poster: 'material/koya_poster.jpg',
        label: 'Scroll-Aufnahme der Website von Koya',
      },
      stats: [
        { target: 190, prefix: '+', suffix: NB + '%' },
        { target: 220, prefix: '+', suffix: NB + '%' },
        { static: '#2' },
      ],
    },
  ];

  // Register the project media that isn't in the DOM yet so the global
  // preloader fetches it in order (chronological, after this section).
  // Skip index 0, it's already in the DOM and preloads itself.
  window.__preloadQueue = window.__preloadQueue || [];
  PROJECTS.slice(1).forEach((p) => {
    const m = p.media;
    if (m.type === 'video') {
      if (m.poster) window.__preloadQueue.push(m.poster);
      if (m.webm)   window.__preloadQueue.push(m.webm);
      if (m.mp4)    window.__preloadQueue.push(m.mp4);
    } else if (m.src) {
      window.__preloadQueue.push(m.src);
    }
  });

  const fvals = Array.from(swap.querySelectorAll('.feat7-fval'));
  let current = 0;

  // ── Play the active video only while the frame is on screen ──
  let inView = false;
  const frame = section.querySelector('.feat7-frame');
  if (frame && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      const v = media.querySelector('video');
      if (v) { if (inView) v.play().catch(() => {}); else v.pause(); }
    }, { threshold: 0.25 }).observe(frame);
  } else {
    inView = true;
  }

  // ── Dots ──
  PROJECTS.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'feat7-dot' + (i === 0 ? ' is-active' : '');
    dot.setAttribute('aria-label', `Referenz ${i + 1} anzeigen`);
    dot.addEventListener('click', () => goTo(i > current ? 1 : -1, i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.querySelectorAll('.feat7-dot'));

  // ── Counter (German decimal comma) ──
  function animateCounter(el) {
    const target   = parseFloat(el.dataset.target);
    const prefix   = el.dataset.prefix || '';
    const suffix   = el.dataset.suffix || '';
    const decimals = (el.dataset.target || '').includes('.') ? 1 : 0;
    const start = performance.now();
    const duration = 1100;
    function frame(t) {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = target * eased;
      const disp = decimals ? v.toFixed(1).replace('.', ',') : String(Math.round(v));
      el.textContent = prefix + disp + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function runCounters() {
    fvals.forEach((el) => {
      if (el.dataset.target != null && el.dataset.target !== '') animateCounter(el);
    });
  }

  // ── Build the media element (video or image) for a project ──
  function setMedia(m) {
    if (m.type === 'video') {
      media.innerHTML =
        `<video class="feat7-img" muted loop playsinline preload="auto" ` +
        `poster="${m.poster || ''}" aria-label="${m.label || ''}">` +
        (m.webm ? `<source src="${m.webm}" type="video/webm">` : '') +
        `<source src="${m.mp4}" type="video/mp4"></video>`;
      if (inView) media.querySelector('video')?.play?.().catch(() => {});
    } else {
      media.innerHTML = `<img class="feat7-img" src="${m.src}" alt="${m.alt || ''}">`;
    }
  }

  // ── Apply a project's data to the DOM ──
  function render(i) {
    const p = PROJECTS[i];
    project.textContent = p.name;
    setMedia(p.media);
    p.stats.forEach((s, idx) => {
      const el = fvals[idx];
      if (!el) return;
      if (s.static != null) {
        delete el.dataset.target;
        delete el.dataset.prefix;
        delete el.dataset.suffix;
        el.textContent = s.static;
      } else {
        el.dataset.target = String(s.target);
        el.dataset.prefix = s.prefix || '';
        el.dataset.suffix = s.suffix || '';
        el.textContent = (s.prefix || '') + '0' + (s.suffix || '');   // reset → counts up
      }
    });
    dots.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
  }

  const OFFSET = 56;   // px slide distance
  let busy = false;

  // ── Navigate with a directional slide (like the navbar dropdowns) ──
  function goTo(dir, explicitIndex) {
    const next = explicitIndex != null
      ? explicitIndex
      : (current + dir + PROJECTS.length) % PROJECTS.length;
    if (busy || next === current) return;
    busy = true;
    current = next;

    swap.style.transition = 'transform 200ms ease, opacity 200ms ease';
    swap.style.transform  = `translateX(${dir > 0 ? -OFFSET : OFFSET}px)`;
    swap.style.opacity    = '0';

    setTimeout(() => {
      render(current);
      swap.style.transition = 'none';
      swap.style.transform  = `translateX(${dir > 0 ? OFFSET : -OFFSET}px)`;
      swap.style.opacity    = '0';
      void swap.offsetWidth;                       // force reflow
      swap.style.transition = 'transform 360ms cubic-bezier(0.22,1,0.36,1), opacity 320ms ease';
      swap.style.transform  = 'translateX(0)';
      swap.style.opacity    = '1';
      setTimeout(runCounters, 180);                // count up, slightly delayed
      setTimeout(() => { busy = false; }, 380);
    }, 200);
  }

  prevBtn?.addEventListener('click', () => goTo(-1));
  nextBtn?.addEventListener('click', () => goTo(1));

  // ── First view: render project 0, count up once scrolled into view ──
  render(0);
  let counted = false;
  function firstCount() {
    if (counted) return;
    counted = true;
    setTimeout(runCounters, 180);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { firstCount(); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(section);
  } else {
    firstCount();
  }
})();

/* ═══════════════════════════════════════════════════════════
   Video playback, play only while on screen (data may load earlier)
   Handles static videos (hero); the feat7 carousel manages its own.
   ════════════════════════════════════════════════════════ */
(() => {
  if (!('IntersectionObserver' in window)) return;
  // threshold 0 → intersecting while any pixel is visible; pause only once fully off-screen
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.play?.().catch(() => {});
      else e.target.pause?.();
    });
  }, { threshold: 0 });

  document.querySelectorAll('video').forEach((v) => {
    // skip feat7 carousel (own module) and any video that manages its own playback
    if (!v.closest('.feat7') && !v.hasAttribute('data-manual')) io.observe(v);
  });
})();

/* ═══════════════════════════════════════════════════════════
   Media preloader, warm images & videos in chronological order
   (document order top→bottom, then JS-deferred project media)
   ════════════════════════════════════════════════════════ */
(() => {
  function run() {
    const seen = new Set();
    const urls = [];
    const add = (u) => { if (u && !seen.has(u)) { seen.add(u); urls.push(u); } };

    // Document order: every image; for videos only the poster
    // (the <video preload="auto"> loads its own sources itself).
    document.querySelectorAll('img, video').forEach((el) => {
      if (el.tagName === 'IMG') add(el.currentSrc || el.getAttribute('src'));
      else { const ps = el.getAttribute('poster'); if (ps) add(ps); }
    });

    // Then media that JS swaps in later (registered by the carousel)
    (window.__preloadQueue || []).forEach(add);

    let i = 0;
    const step = () => {
      if (i >= urls.length) return;
      const url = urls[i++];
      const done = () => setTimeout(step, 40);   // strict order: next after current
      if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)) {
        fetch(url).then((r) => r.blob()).then(done).catch(done);   // warm HTTP cache
      } else {
        const im = new Image();
        im.decoding = 'async';
        im.onload = im.onerror = done;
        im.src = url;
      }
    };
    step();
  }

  // Start after the page's own critical load so we don't compete with it
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run);
})();
