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

  const isMobileNav = () => window.matchMedia('(max-width: 860px)').matches;

  items.forEach((item, index) => {
    item.addEventListener('mouseenter', () => {
      if (isMobileNav()) return;            // mobil: kein Hover, Burger übernimmt
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
    if (isMobileNav()) return;
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
   Navbar, hide on scroll-down / slide back in on scroll-up
   ════════════════════════════════════════════════════════ */
(() => {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  // overflow-x:hidden on html/body (mobile) can move scrolling onto the
  // document element, so read whichever source actually reports a position.
  const scrollY = () =>
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop || 0;

  let lastY = scrollY();
  const REVEAL_AT_TOP = 8;     // always show within this many px of the top
  const DELTA = 6;             // ignore tiny jitter

  let ticking = false;
  function update() {
    ticking = false;
    const y = scrollY();

    // while the mobile menu panel is open, keep the bar pinned & visible
    if (navbar.classList.contains('nav-open')) {
      navbar.classList.remove('is-hidden');
      lastY = y;
      return;
    }

    // shadow once scrolled away from the very top
    navbar.classList.toggle('is-stuck', y > REVEAL_AT_TOP);

    // near the top → always visible
    if (y <= REVEAL_AT_TOP) {
      navbar.classList.remove('is-hidden');
      lastY = y;
      return;
    }

    const diff = y - lastY;
    if (Math.abs(diff) < DELTA) return;   // too small to act on

    // keep an open dropdown from lingering when the bar hides
    if (diff > 0) {
      navbar.classList.add('is-hidden');                 // scrolling down → hide
      document.querySelectorAll('.nav-item.is-open').forEach(i => i.classList.remove('is-open'));
    } else {
      navbar.classList.remove('is-hidden');              // scrolling up → reveal
    }
    lastY = y;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════
   Mobile navbar — Burger toggle + Inline-Accordion
   ════════════════════════════════════════════════════════ */
(() => {
  const navbar      = document.querySelector('.navbar');
  const navbarInner = document.querySelector('.navbar-inner');
  const navMenu     = document.querySelector('.nav-menu');
  if (!navbar || !navbarInner || !navMenu) return;

  const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

  // Burger-Button erzeugen
  const btn = document.createElement('button');
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-label', 'Menü öffnen');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span></span><span></span><span></span>';
  navbarInner.appendChild(btn);

  let savedScrollY = 0;

  function openMenu() {
    // lock scrolling reliably (incl. iOS Safari) by fixing the body in place
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    navbar.classList.add('nav-open');
    document.body.classList.add('nav-open');
    document.body.style.top = `-${savedScrollY}px`;
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Menü schließen');
  }
  function closeMenu() {
    navbar.classList.remove('nav-open');
    document.body.classList.remove('nav-open');
    document.body.style.top = '';
    // jump back to the saved position INSTANTLY (bypass scroll-behavior:smooth
    // so it doesn't visibly animate from the top back down)
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, savedScrollY);
    document.documentElement.style.scrollBehavior = prev;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Menü öffnen');
    navMenu.querySelectorAll('.nav-item.is-open').forEach(i => i.classList.remove('is-open'));
  }

  btn.addEventListener('click', () => {
    navbar.classList.contains('nav-open') ? closeMenu() : openMenu();
  });

  // ── Accordion: reines Klassen-Toggle, Höhe animiert die CSS-Grid-Zeile (flüssig) ──
  function toggleAcc(item) {
    const open = item.classList.contains('is-open');
    navMenu.querySelectorAll('.nav-item.is-open').forEach(i => { if (i !== item) i.classList.remove('is-open'); });
    item.classList.toggle('is-open', !open);
  }

  navMenu.querySelectorAll('.nav-trigger').forEach(trigger => {
    const isHome  = trigger.textContent.trim().toLowerCase().startsWith('home');
    const item    = trigger.closest('.nav-item');
    const content = item && item.querySelector('.nav-content');

    trigger.addEventListener('click', (e) => {
      if (isHome) {
        // Mobil: nur der Pfeil klappt auf/zu, der restliche Button führt zur Startseite
        if (isMobile() && content && e.target.closest('.chevron')) {
          e.preventDefault();
          toggleAcc(item);
          return;
        }
        window.location.href = '/';
        return;
      }
      // Leistungen u. a. Dropdowns: nur mobil als Accordion
      if (!isMobile()) return;
      if (!content) return;            // einfacher Link (Kontakt): normal navigieren
      e.preventDefault();
      toggleAcc(item);
    });
  });

  // Tap auf einen echten Link im Menü → Menü schließen (und navigieren)
  navMenu.querySelectorAll('a[href]').forEach(a => {
    a.addEventListener('click', () => { if (isMobile()) closeMenu(); });
  });

  // Beim Wechsel zurück auf Desktop Menü zurücksetzen
  window.addEventListener('resize', () => { if (!isMobile()) closeMenu(); }, { passive: true });
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

  const TEXTS    = ['Webdesign', 'Grafikdesign', 'SEO', 'Digitale Systeme'];
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
  // Auto-tag common content blocks that should fade in but weren't marked
  // with .reveal by hand (review cards, service cards, footer, etc.).
  const AUTO = [
    '.reviews-header', '.rev-card',
  ];
  document.querySelectorAll(AUTO.join(',')).forEach((el) => {
    // skip if it (or an ancestor) is already a reveal target
    if (!el.classList.contains('reveal') && !el.closest('.reveal')) {
      el.classList.add('reveal');
    }
  });

  const els = Array.from(document.querySelectorAll('.reveal'));
  if (els.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }

  // threshold 0 + slight negative bottom margin: the fade starts as soon as
  // the element's top edge enters the viewport (a touch early), so large
  // blocks (CTA, FAQ) ease in instead of being already on-screen when they fade.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

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
      name: 'Bautrocknung in NRW',
      media: {
        type: 'video',
        mp4:  'material/bautrocknung.mp4',
        poster: 'material/bautrocknung_poster.jpg',
        label: 'Scroll-Aufnahme der Website von Bautrocknung OWL',
      },
      stats: [
        { target: 212, prefix: '×', suffix: NB + '%' },
        { target: 180, prefix: '×', suffix: NB + '%' },
        { static: '#1' },
      ],
    },
    {
      name: 'Gala Bau in Baden-Württemberg',
      media: {
        type: 'video',
        mp4:  'material/gruenwerk.mp4',
        poster: 'material/gruenwerk_poster.jpg',
        label: 'Scroll-Aufnahme der Website des Garten- und Landschaftsbauers Grünwerk',
      },
      stats: [
        { target: 165, prefix: '×', suffix: NB + '%' },
        { target: 140, prefix: '×', suffix: NB + '%' },
        { static: '#3' },
      ],
    },
  ];

  // Only warm the small POSTER images ahead of time, not the heavy video files.
  // The actual webm/mp4 are fetched on demand when the user reaches that slide
  // (see prefetchNext below) — saves ~10 MB of speculative downloads.
  window.__preloadQueue = window.__preloadQueue || [];
  PROJECTS.slice(1).forEach((p) => {
    const m = p.media;
    if (m.type === 'video' && m.poster) window.__preloadQueue.push(m.poster);
    else if (m.src) window.__preloadQueue.push(m.src);
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

  // Quietly warm the neighbouring slide's video (MP4) so the next click is instant.
  const prefetched = new Set();
  function prefetchAdjacent() {
    [ (current + 1) % PROJECTS.length, (current - 1 + PROJECTS.length) % PROJECTS.length ]
      .forEach((idx) => {
        const m = PROJECTS[idx].media;
        if (!m || m.type !== 'video') return;
        const url = m.mp4;
        if (!url || prefetched.has(url)) return;
        prefetched.add(url);
        const l = document.createElement('link');
        l.rel = 'prefetch';      // low-priority, idle-time fetch
        l.as = 'video';
        l.href = url;
        document.head.appendChild(l);
      });
  }

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
      prefetchAdjacent();                          // warm the next neighbours
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
        if (e.isIntersecting) { firstCount(); prefetchAdjacent(); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(section);
  } else {
    firstCount();
    prefetchAdjacent();
  }
})();

/* ═══════════════════════════════════════════════════════════
   Video playback, play only while on screen (data may load earlier)
   Handles static videos (hero); the feat7 carousel manages its own.
   ════════════════════════════════════════════════════════ */
(() => {
  // Helper: set the right source for data-src videos (hero) by viewport width
  function pickSrc(v) {
    if (v.dataset.srcMobile && v.dataset.srcDesktop && !v.src) {
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      v.src = mobile ? v.dataset.srcMobile : v.dataset.srcDesktop;
    }
  }

  if (!('IntersectionObserver' in window)) {
    // no observer: pick source + load directly
    document.querySelectorAll('video').forEach(v => {
      pickSrc(v);
      try { v.load(); v.play?.().catch(() => {}); } catch (_) {}
    });
    return;
  }

  // Videos use preload="none" so nothing downloads until needed. When a video
  // is about to enter the viewport we kick off the load; when visible we play,
  // when fully off-screen we pause (saves CPU/battery + bandwidth).
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (v.preload === 'none' && !v.dataset.loaded) {
          v.dataset.loaded = '1';
          pickSrc(v);             // one file only, chosen by viewport width
          v.preload = 'auto';
          try { v.load(); } catch (_) {}
        }
        v.play?.().catch(() => {});
      } else {
        v.pause?.();
      }
    });
  }, { threshold: 0, rootMargin: '200px 0px 200px 0px' });  // start ~200px early

  document.querySelectorAll('video').forEach((v) => {
    // skip feat7 carousel (own module) and any video that manages its own playback
    if (!v.closest('.feat7') && !v.hasAttribute('data-manual')) io.observe(v);
  });

  // Hero: reveal the video only once it's truly playing, so the poster
  // (exact frame 0) covers the gap and the swap is invisible.
  const hero = document.querySelector('.lhero-video');
  if (hero) {
    hero.addEventListener('playing', () => hero.classList.add('is-playing'));
    // if it stalls/ends up paused while off-screen, drop back to the poster
    hero.addEventListener('emptied', () => hero.classList.remove('is-playing'));
  }
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

    // Only warm the small swap-in media registered by the carousel (posters +
    // image-only slides). Regular <img> use loading="lazy"; heavy videos load
    // on demand. This keeps the idle preloader lightweight.
    (window.__preloadQueue || []).forEach(add);

    let i = 0;
    const step = () => {
      if (i >= urls.length) return;
      const url = urls[i++];
      const done = () => setTimeout(step, 60);   // gentle, one at a time
      const im = new Image();
      im.decoding = 'async';
      im.onload = im.onerror = done;
      im.src = url;
    };
    step();
  }

  // Run when the browser is idle, after the page's own critical load
  const start = () => ('requestIdleCallback' in window)
    ? requestIdleCallback(run, { timeout: 2000 })
    : setTimeout(run, 600);
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();

/* ═══════════════════════════════════════════════════════════
   Cookie-Consent: Banner + Einstellungen
   Speichert die Auswahl in localStorage. Funktionale Kategorien:
   notwendig (immer an), statistik, marketing. Andere Skripte können
   window.solventaConsent lesen oder auf 'solventa:consent' lauschen.
   ═══════════════════════════════════════════════════════════ */
(() => {
  const KEY = 'solventa_cookie_consent';
  const VERSION = 1;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.v !== VERSION) return null;
      return data;
    } catch (_) { return null; }
  }
  function save(consent) {
    const data = { v: VERSION, date: new Date().toISOString(), ...consent };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
    window.solventaConsent = data;
    window.dispatchEvent(new CustomEvent('solventa:consent', { detail: data }));
    return data;
  }

  const ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>';

  let bannerEl, modalEl, modalStat, modalMark;

  function buildBanner() {
    const b = document.createElement('div');
    b.className = 'cc-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Cookie-Hinweis');
    b.hidden = true;
    b.innerHTML =
      '<div class="cc-ico">' + ICON + '</div>' +
      '<div class="cc-title">Wir respektieren Ihre Privatsphäre</div>' +
      '<p class="cc-text">Wir verwenden Cookies, um diese Website bereitzustellen und Ihr Erlebnis zu verbessern. ' +
      'Notwendige Cookies sind für den Betrieb erforderlich. Optionale Cookies setzen wir nur mit Ihrer Einwilligung. ' +
      'Mehr dazu in unserer <a href="/datenschutz">Datenschutzerklärung</a>.</p>' +
      '<div class="cc-actions">' +
        '<button class="cc-btn cc-btn--ghost" data-cc="necessary">Nur notwendige</button>' +
        '<button class="cc-btn cc-btn--accept" data-cc="all">Alle akzeptieren</button>' +
        '<button class="cc-btn cc-btn--text" data-cc="settings">Einstellungen</button>' +
      '</div>';
    document.body.appendChild(b);
    b.querySelector('[data-cc="all"]').addEventListener('click', () => acceptAll());
    b.querySelector('[data-cc="necessary"]').addEventListener('click', () => acceptNecessary());
    b.querySelector('[data-cc="settings"]').addEventListener('click', () => openModal());
    return b;
  }

  function buildModal() {
    const m = document.createElement('div');
    m.className = 'cc-modal';
    m.hidden = true;
    m.innerHTML =
      '<div class="cc-modal-card" role="dialog" aria-modal="true" aria-label="Cookie-Einstellungen">' +
        '<div class="cc-modal-title">Cookie-Einstellungen</div>' +
        '<p class="cc-modal-sub">Entscheiden Sie selbst, welche Cookies wir verwenden dürfen. Sie können Ihre Auswahl jederzeit anpassen.</p>' +
        '<div class="cc-cat">' +
          '<label class="cc-switch"><input type="checkbox" checked disabled><span class="cc-switch-track"></span></label>' +
          '<div class="cc-cat-body"><div class="cc-cat-t">Notwendig</div>' +
          '<div class="cc-cat-d">Für den Betrieb der Website unverzichtbar, z. B. Sicherheit und Ihre Cookie-Auswahl. Immer aktiv.</div></div>' +
        '</div>' +
        '<div class="cc-cat">' +
          '<label class="cc-switch"><input type="checkbox" id="ccStat"><span class="cc-switch-track"></span></label>' +
          '<div class="cc-cat-body"><div class="cc-cat-t">Statistik</div>' +
          '<div class="cc-cat-d">Helfen uns anonym zu verstehen, wie die Website genutzt wird, damit wir sie verbessern können.</div></div>' +
        '</div>' +
        '<div class="cc-cat">' +
          '<label class="cc-switch"><input type="checkbox" id="ccMark"><span class="cc-switch-track"></span></label>' +
          '<div class="cc-cat-body"><div class="cc-cat-t">Marketing</div>' +
          '<div class="cc-cat-d">Ermöglichen relevantere Inhalte und das Messen von Kampagnen.</div></div>' +
        '</div>' +
        '<div class="cc-modal-actions">' +
          '<button class="cc-btn cc-btn--ghost" data-cc="save">Auswahl speichern</button>' +
          '<button class="cc-btn cc-btn--accept" data-cc="all">Alle akzeptieren</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    modalStat = m.querySelector('#ccStat');
    modalMark = m.querySelector('#ccMark');
    m.querySelector('[data-cc="save"]').addEventListener('click', () => {
      finish({ necessary: true, statistik: !!modalStat.checked, marketing: !!modalMark.checked });
    });
    m.querySelector('[data-cc="all"]').addEventListener('click', () => acceptAll());
    m.addEventListener('click', e => { if (e.target === m) closeModal(); });
    return m;
  }

  function showBanner() {
    if (!bannerEl) bannerEl = buildBanner();
    bannerEl.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => bannerEl.classList.add('is-in')));
  }
  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove('is-in');
    setTimeout(() => { if (bannerEl) bannerEl.hidden = true; }, 500);
  }
  function openModal() {
    if (!modalEl) modalEl = buildModal();
    const c = load();
    modalStat.checked = c ? !!c.statistik : false;
    modalMark.checked = c ? !!c.marketing : false;
    modalEl.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => modalEl.classList.add('is-in')));
  }
  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('is-in');
    setTimeout(() => { if (modalEl) modalEl.hidden = true; }, 320);
  }
  function finish(consent) { save(consent); hideBanner(); closeModal(); }
  function acceptAll() { finish({ necessary: true, statistik: true, marketing: true }); }
  function acceptNecessary() { finish({ necessary: true, statistik: false, marketing: false }); }

  // Footer-Link "Cookie-Einstellungen" überall einfügen
  function injectFooterLink() {
    document.querySelectorAll('.ft-legal').forEach(ul => {
      if (ul.querySelector('.cc-reopen')) return;
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cc-reopen';
      btn.textContent = 'Cookie-Einstellungen';
      btn.addEventListener('click', openModal);
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function init() {
    const existing = load();
    if (existing) window.solventaConsent = existing;
    injectFooterLink();
    if (!existing) showBanner();
    // global zugänglich machen (z. B. für andere Skripte)
    window.openCookieSettings = openModal;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ═══════════════════════════════════════════════════════════
   Lange Bewertungstexte langsam auf-/abscrollen lassen
   (nur wenn der Text höher ist als die Box; Hover pausiert via CSS)
   ═══════════════════════════════════════════════════════════ */
(() => {
  const boxes = Array.from(document.querySelectorAll('.rev-text--scroll'));
  if (!boxes.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SPEED = 16; // Pixel pro Sekunde, je kleiner desto langsamer

  function setup(box) {
    const track = box.querySelector('.rev-scroll-track');
    if (!track) return;
    box.classList.remove('is-scrolling');
    box.style.removeProperty('--rev-shift');
    // im nächsten Frame messen, damit Layout/Schrift fertig ist
    requestAnimationFrame(() => {
      const overflow = track.scrollHeight - box.clientHeight;
      if (overflow > 6) {
        box.style.setProperty('--rev-shift', (-overflow) + 'px');
        box.style.setProperty('--rev-dur', Math.max(8, overflow / SPEED).toFixed(1) + 's');
        box.classList.add('is-scrolling');
      }
    });
  }

  function setupAll() { boxes.forEach(setup); }

  // Nach vollständigem Laden (Schriftgrößen stehen) initialisieren
  if (document.readyState === 'complete') setupAll();
  else window.addEventListener('load', setupAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setupAll);

  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(setupAll, 200); });
})();

/* ═══════════════════════════════════════════════════════════
   Smooth scroll for in-page anchor clicks only.
   Replaces the global CSS `scroll-behavior: smooth`, which could
   amplify the browser's scroll-anchoring into a jump-to-top while
   the page was still loading lazy media.
   ════════════════════════════════════════════════════════ */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const OFFSET = 76;   // matches scroll-padding-top (navbar height + gap)

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;

    e.preventDefault();
    const y = target.getBoundingClientRect().top + window.scrollY - OFFSET;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    // keep the URL hash without an extra jump
    history.pushState(null, '', id);
  });
})();

/* ═══════════════════════════════════════════════════════════
   Google Ads / GA4 — Conversion-Tracking + Consent Mode v2
   IDs sind Platzhalter (G-… / AW-… / Labels) und werden später
   in index <head> (Schritt 1) und hier unten eingetragen.
   ════════════════════════════════════════════════════════ */
(() => {
  // === IDs aus Google Ads hier eintragen ===
  const ADS_ID     = 'AW-18263876791';       // Google Ads Conversion-ID
  const LABEL_LEAD = 'BQ3ZCOfrtsQcELfJ8oRE'; // Conversion "Lead – Kontaktformular"
  const LABEL_TEL  = 'qmUFCOrrtsQcELfJ8oRE'; // Conversion "Telefon-Klick"
  const LABEL_MAIL = 'XXXXXXXXXXXXXXXXXX';   // Conversion "E-Mail-Klick" (noch nicht angelegt)

  function fire(adsLabel, gaEvent, params, convExtra) {
    if (typeof gtag !== 'function') return;
    if (adsLabel && adsLabel.indexOf('X') === -1) {           // nur feuern, wenn echtes Label gesetzt
      gtag('event', 'conversion',
        Object.assign({ 'send_to': ADS_ID + '/' + adsLabel }, convExtra || {}));
    }
    gtag('event', gaEvent, params || {});                     // GA4 (zur Analyse)
  }

  // 1) LEAD — vom Kontaktformular aufgerufen (kontakt.html, nach Erfolg).
  //    Hier NUR das GA4-Event feuern: Die Google-Ads-Lead-Conversion würde vom
  //    anschließenden Redirect auf /danke abgebrochen ("keine Treffer gesendet"),
  //    deshalb feuert sie stattdessen beim Laden der /danke-Seite (siehe danke.html).
  window.trackSolventaLead = function () {
    if (window.__solventaLeadFired) return;
    window.__solventaLeadFired = true;
    if (typeof gtag === 'function') gtag('event', 'generate_lead', { form: 'kontakt' });
  };

  // 2) Telefon- & E-Mail-Klicks — automatisch für alle tel:/mailto:-Links
  document.addEventListener('click', (e) => {
    if (!e.target.closest) return;
    const tel = e.target.closest('a[href^="tel:"]');
    if (tel)  fire(LABEL_TEL,  'click_phone', { link: tel.getAttribute('href') },
                   { 'value': 20.0, 'currency': 'EUR' });
    const mail = e.target.closest('a[href^="mailto:"]');
    if (mail) fire(LABEL_MAIL, 'click_email', { link: mail.getAttribute('href') });
  });

  // 3) Consent Mode v2 — an den bestehenden Cookie-Banner koppeln.
  //    Banner liefert { necessary, statistik, marketing } via 'solventa:consent'.
  function applyConsent(c) {
    if (typeof gtag !== 'function' || !c) return;
    gtag('consent', 'update', {
      'analytics_storage':  c.statistik ? 'granted' : 'denied',
      'ad_storage':         c.marketing ? 'granted' : 'denied',
      'ad_user_data':       c.marketing ? 'granted' : 'denied',
      'ad_personalization': c.marketing ? 'granted' : 'denied'
    });
  }
  // auf neue Einwilligung reagieren (Banner feuert dieses Event)
  window.addEventListener('solventa:consent', (e) => applyConsent(e.detail));
  // bereits gespeicherte Einwilligung beim Laden anwenden — nach DOM-ready,
  // da der Cookie-Banner window.solventaConsent erst in seinem init() setzt.
  function applyStored() { if (window.solventaConsent) applyConsent(window.solventaConsent); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStored);
  } else {
    applyStored();
  }
})();
