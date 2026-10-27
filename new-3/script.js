/* Shared behaviour: header, mobile menu, search, reveals, practice memory, patient form. */
(function () {
  var html = document.documentElement;
  html.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var top = document.getElementById('top');

  // header state
  if (top) {
    var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 12); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  // mobile menu
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');
  if (burger && menu) {
    var toggle = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      document.body.classList.toggle('menu-open', open);
    };
    burger.addEventListener('click', function () { toggle(burger.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { toggle(false); burger.focus(); } });
  }

  // search overlay with a static index
  var search = document.getElementById('search');
  var q = document.getElementById('q');
  var results = document.getElementById('search-results');
  var indexCache = null;
  var openSearch = function () {
    if (!search) return;
    search.hidden = false; document.body.classList.add('search-open');
    q.focus();
    if (!indexCache) fetch(q.getAttribute('data-index')).then(function (r) { return r.json(); }).then(function (d) { indexCache = d; render(q.value); });
  };
  var closeSearch = function () { if (!search) return; search.hidden = true; document.body.classList.remove('search-open'); };
  var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var render = function (value) {
    if (!indexCache) return;
    var v = norm(value.trim());
    results.innerHTML = '';
    if (!v) return;
    var hits = indexCache.filter(function (i) { return norm(i.t + ' ' + i.d).indexOf(v) !== -1; }).slice(0, 8);
    if (!hits.length) { results.innerHTML = '<li class="none">' + results.getAttribute('data-none') + '</li>'; return; }
    hits.forEach(function (i) {
      var li = document.createElement('li');
      li.innerHTML = '<a href="' + i.u + '"><b></b><span></span></a>';
      li.querySelector('b').textContent = i.t; li.querySelector('span').textContent = i.d;
      results.appendChild(li);
    });
  };
  document.querySelectorAll('[data-open-search]').forEach(function (b) { b.addEventListener('click', openSearch); });
  document.querySelectorAll('[data-close-search]').forEach(function (b) { b.addEventListener('click', closeSearch); });
  if (q) q.addEventListener('input', function () { render(q.value); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && search && !search.hidden) closeSearch();
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
  });

  // Legacy reveal classes paint in their final state at once.
  // No scroll effects. Three things arrive, each once, where motion carries meaning:
  // the hero text box rises as the page opens, step numbers come in one after the
  // other, and treatment illustrations settle into their tiles. Text, photos, cards
  // and buttons never move, and nothing moves at all with reduced motion.
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!still) {
    var cover = document.querySelector('.hero-cover .hero-txt');
    if (cover) { cover.classList.add('arrive'); requestAnimationFrame(function () { requestAnimationFrame(function () { cover.classList.add('in'); }); }); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -10% 0px' });
      [].slice.call(document.querySelectorAll('.steps .num, .vstep .num, .hfam-visual .ill, .icon-panel .ill')).forEach(function (el, i) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
        el.classList.add('arrive');
        el.style.transitionDelay = (el.closest('.steps, .vsteps') ? ([].indexOf.call(el.closest('li, .vstep').parentNode.children, el.closest('li, .vstep')) * 90) : 0) + 'ms';
        io.observe(el);
      });
    }
  }
  [].slice.call(document.querySelectorAll('.mask, .hero-pic, .hero-band, .loc, .quick-list li, .trust-item, .soin-row'))
    .forEach(function (el) { el.classList.add('in'); });

  // dropdown menus: click or keyboard on the small button, hover handled in CSS
  document.querySelectorAll('.has-sub').forEach(function (li) {
    var btn = li.querySelector('.sub-btn');
    btn.addEventListener('click', function () {
      var open = li.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      document.querySelectorAll('.has-sub').forEach(function (o) { if (o !== li) { o.classList.remove('open'); o.querySelector('.sub-btn').setAttribute('aria-expanded', 'false'); } });
    });
    li.addEventListener('focusout', function (e) { if (!li.contains(e.relatedTarget)) { li.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') document.querySelectorAll('.has-sub.open').forEach(function (o) { o.classList.remove('open'); o.querySelector('.sub-btn').setAttribute('aria-expanded', 'false'); }); });

  // remember the chosen practice
  document.querySelectorAll('[data-choose]').forEach(function (a) {
    a.addEventListener('click', function () { try { localStorage.setItem('cdm-cabinet', a.getAttribute('data-choose')); } catch (e) {} });
  });

  // simple contact form feedback
  var form = document.querySelector('.form');
  if (form) form.addEventListener('submit', function () { var ok = form.querySelector('.form-ok'); if (ok) ok.hidden = false; });

  // patient form
  var pf = document.getElementById('pform');
  if (pf) {
    var steps = [].slice.call(pf.querySelectorAll('.fstep'));
    var navItems = [].slice.call(document.querySelectorAll('.form-steps li'));
    var prev = pf.querySelector('[data-prev]'), next = pf.querySelector('[data-next]'), print = pf.querySelector('[data-print]'), send = pf.querySelector('[data-send]'), clear = pf.querySelector('[data-clear]');
    var status = pf.querySelector('.form-status'), progress = pf.querySelector('.form-progress');
    var KEY = 'cdm-patient-form';
    var cur = 0;
    var labelFor = function (el) {
      var id = el.id; var l = id ? pf.querySelector('label[for="' + id + '"]') : null;
      if (l) return l.textContent;
      var fl = el.closest('.field'); if (fl && fl.querySelector('.field-label')) return fl.querySelector('.field-label').textContent;
      var chk = el.closest('.chk'); if (chk) return chk.querySelector('span').textContent;
      return el.name;
    };
    var values = function () {
      var out = [];
      steps.slice(0, 5).forEach(function (st) {
        [].slice.call(st.querySelectorAll('input, select, textarea')).forEach(function (el) {
          if (el.type === 'radio' && !el.checked) return;
          if (el.type === 'checkbox') { if (el.checked) out.push([labelFor(el), pf.getAttribute('data-empty') === el.value ? '' : el.value]); return; }
          out.push([labelFor(el), el.value]);
        });
      });
      return out;
    };
    var save = function () {
      var data = {};
      [].slice.call(pf.querySelectorAll('input, select, textarea')).forEach(function (el) {
        if (el.type === 'checkbox') data[el.name] = el.checked; else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; } else data[el.name] = el.value;
      });
      try { localStorage.setItem(KEY, JSON.stringify(data)); status.textContent = pf.getAttribute('data-saved'); } catch (e) {}
    };
    var load = function () {
      try {
        var data = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!data) return;
        [].slice.call(pf.querySelectorAll('input, select, textarea')).forEach(function (el) {
          if (!(el.name in data)) return;
          if (el.type === 'checkbox') el.checked = !!data[el.name]; else if (el.type === 'radio') el.checked = data[el.name] === el.value; else el.value = data[el.name];
        });
      } catch (e) {}
    };
    var avsValid = function (raw) {
      var d = raw.replace(/\D/g, '');
      if (d.length !== 13 || d.slice(0, 3) !== '756') return false;
      var sum = 0;
      for (var i = 0; i < 12; i++) sum += parseInt(d[i], 10) * (i % 2 === 0 ? 1 : 3);
      return (10 - (sum % 10)) % 10 === parseInt(d[12], 10);
    };
    var avs = pf.querySelector('[data-avs]');
    if (avs) avs.addEventListener('input', function () {
      var chk = avs.closest('.field').querySelector('.avs-check');
      var d = avs.value.replace(/\D/g, '');
      if (!d) { chk.textContent = ''; avs.classList.remove('bad', 'good'); return; }
      var ok = avsValid(d);
      chk.textContent = ok ? pf.getAttribute('data-avs-ok') : pf.getAttribute('data-avs-bad');
      avs.classList.toggle('bad', !ok && d.length >= 13); avs.classList.toggle('good', ok);
      if (ok) avs.value = d.slice(0, 3) + '.' + d.slice(3, 7) + '.' + d.slice(7, 11) + '.' + d.slice(11);
    });
    var validate = function (st) {
      var ok = true;
      [].slice.call(st.querySelectorAll('[required]')).forEach(function (el) {
        var field = el.closest('.field') || el.closest('.chk');
        var bad = el.type === 'checkbox' ? !el.checked : !el.value.trim();
        if (!bad && el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value)) bad = true;
        var msg = field.querySelector('.err');
        if (bad) { if (!msg) { msg = document.createElement('p'); msg.className = 'err'; field.appendChild(msg); } msg.textContent = el.type === 'email' && el.value ? pf.getAttribute('data-email-bad') : pf.getAttribute('data-required'); ok = false; }
        else if (msg) msg.remove();
      });
      if (avs && st.contains(avs) && avs.value.replace(/\D/g, '') && !avsValid(avs.value)) { ok = false; avs.focus(); }
      return ok;
    };
    var recap = function () {
      var dl = document.getElementById('recap'); dl.innerHTML = '';
      values().forEach(function (kv) {
        var div = document.createElement('div');
        var dt = document.createElement('dt'); dt.textContent = kv[0];
        var dd = document.createElement('dd'); dd.textContent = kv[1] || pf.getAttribute('data-empty'); if (!kv[1]) dd.className = 'empty';
        div.appendChild(dt); div.appendChild(dd); dl.appendChild(div);
      });
    };
    var show = function (i) {
      cur = i;
      steps.forEach(function (st, k) { st.hidden = k !== i; });
      navItems.forEach(function (li, k) { if (k === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); li.classList.toggle('done', k < i); });
      prev.hidden = i === 0; next.hidden = i === steps.length - 1; print.hidden = i !== steps.length - 1; send.hidden = i !== steps.length - 1;
      progress.textContent = pf.getAttribute('data-step') + ' ' + (i + 1) + ' ' + pf.getAttribute('data-of') + ' ' + steps.length;
      if (i === steps.length - 1) { recap(); var dt = pf.querySelector('#p-date'); if (dt && !dt.value) dt.value = new Date().toISOString().slice(0, 10); }
      steps[i].querySelector('legend').setAttribute('tabindex', '-1'); steps[i].querySelector('legend').focus({ preventScroll: false });
      window.scrollTo({ top: pf.getBoundingClientRect().top + window.scrollY - 120, behavior: reduce ? 'auto' : 'smooth' });
    };
    next.addEventListener('click', function () { if (validate(steps[cur])) { save(); show(cur + 1); } });
    prev.addEventListener('click', function () { show(cur - 1); });
    navItems.forEach(function (li, k) { li.addEventListener('click', function () { if (k < cur) show(k); }); });
    pf.addEventListener('input', function () { clearTimeout(pf._t); pf._t = setTimeout(save, 400); });
    print.addEventListener('click', function () { if (validate(steps[cur])) { save(); window.print(); } });
    send.addEventListener('click', function () {
      if (!validate(steps[cur])) return;
      var body = values().map(function (kv) { return kv[0] + ': ' + (kv[1] || '-'); }).join('\n');
      window.location.href = 'mailto:' + pf.getAttribute('data-mail') + '?subject=' + encodeURIComponent('Formulaire patient') + '&body=' + encodeURIComponent(body);
    });
    clear.addEventListener('click', function () { try { localStorage.removeItem(KEY); } catch (e) {} pf.reset(); show(0); status.textContent = ''; });
    load();
    var want = new URLSearchParams(location.search).get('cabinet');
    if (want) { var r = pf.querySelector('input[name="cabinet"][value="' + (want.charAt(0).toUpperCase() + want.slice(1)) + '"]'); if (r) r.checked = true; }
    show(0);
  }
})();

/* The phone booking bar stays out of the way while the page's own buttons are on
   screen, so it never covers them, and slides in once they have scrolled away. */
(function () {
  var dock = document.querySelector('.dock');
  var acts = document.querySelector('.hero .acts, .phero .acts');
  if (!dock || !acts || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('dock-wait');
  new IntersectionObserver(function (es) {
    document.documentElement.classList.toggle('dock-on', !es[0].isIntersecting);
  }).observe(acts);
})();

/* Header height as a CSS variable, so the opening band can fill exactly the rest of
   the first screen whatever the version's header measures. */
(function () {
  var top = document.querySelector('.top');
  if (!top) return;
  var set = function () { document.documentElement.style.setProperty('--hh', top.offsetHeight + 'px'); };
  set();
  window.addEventListener('resize', set);
})();

/* The header headline is fitted on the page once the fonts are in: on home and team it
   reads on exactly three lines, elsewhere on three at most. The size starts from the CSS
   value and only steps down, never below 34px; the measure narrows only when a short
   title would otherwise sit on two lines. */
(function () {
  // The people's edge on the panorama, from the photo as it really renders (object-fit:
  // cover crops it to the header height): the first person starts at 40.5% of the photo.
  var edge = function () {
    document.querySelectorAll('.hero-full:not(.hx-side)').forEach(function (hero) {
      var img = hero.querySelector('.hero-bg img');
      if (!img || !img.naturalWidth) return;
      var r = img.getBoundingClientRect();
      // measured against the header's planned height (its min-height), not its current one:
      // a header that grows for a long introduction must not move the subject edge, or the
      // narrower column grows the header again and the two feed each other
      var planned = parseFloat(getComputedStyle(hero).minHeight) || r.height;
      var scale = Math.max(r.width / img.naturalWidth, Math.min(r.height, planned) / img.naturalHeight);
      var shown = img.naturalWidth * scale;
      var left = r.right - shown; // anchored right (object-position 100%)
      // the team panorama's first person stands at 40.5% of the photo; the wide interior crops
      // keep open wall to about 46% before their scene starts (client, 2026-10-27)
      var edgeAt = img.currentSrc.indexOf('equipe-panorama') > -1 ? 0.405 : 0.46;
      hero.style.setProperty('--px', (left + shown * edgeAt - hero.getBoundingClientRect().left) + 'px');
    });
  };
  var fit = function () {
    edge();
    document.querySelectorAll('.hero-full .hero-txt h1').forEach(function (h) {
      h.style.removeProperty('font-size'); h.style.removeProperty('max-width');
      if (window.innerWidth < 1100) return;
      h.style.setProperty('max-width', 'none', 'important');
      var lh = function () { return Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)); };
      var start = parseFloat(getComputedStyle(h).fontSize);
      var exact = !h.closest('.hx-page');
      // largest size, from the CSS value down, at which the title reads on three lines
      // (exactly three on home and team, three at most elsewhere)
      // a long title that cannot hold three lines at 40px or more takes four lines at the
      // largest size that allows them, rather than shrinking to a small size
      // (client, 2026-10-27) when four lines let the headline run at least 20% larger than
      // three lines would, it takes four lines at that larger size
      var largest = function (maxL, floor) {
        for (var s = start; s >= floor; s -= 1) {
          h.style.setProperty('font-size', s + 'px', 'important');
          if (lh() <= maxL) return s;
        }
        return 0;
      };
      var s3 = largest(3, 40), s4 = largest(4, 34);
      if (s4 && s4 >= s3 * 1.2) { h.style.setProperty('font-size', s4 + 'px', 'important'); return; }
      h.style.setProperty('font-size', start + 'px', 'important');
      var passes = [[3, 40], [4, 34], [3, 30]];
      for (var p = 0; p < passes.length; p++) {
        var maxL = passes[p][0], floor = passes[p][1];
        for (var size = start; size >= floor; size -= 1) {
          h.style.setProperty('font-size', size + 'px', 'important');
          h.style.setProperty('max-width', 'none', 'important');
          if (lh() > maxL) continue;
          if (exact && maxL === 3) { for (var em = 14; lh() < 3 && em > 4; em -= 0.25) h.style.setProperty('max-width', em + 'em', 'important'); }
          if (!exact || lh() >= maxL - (maxL === 4 ? 1 : 0)) return;
        }
      }
    });
  };
  var go = function () { requestAnimationFrame(function () { fit(); fit(); fit(); }); };
  // run once the heading font is really in: fonts.ready can resolve before a web font
  // starts loading, so the fit also reruns when fonts finish and when the page has loaded
  if (document.fonts) {
    var h1 = document.querySelector('.hero-full .hero-txt h1');
    if (h1) { var cs = getComputedStyle(h1); document.fonts.load(cs.fontWeight + ' 40px ' + cs.fontFamily, h1.textContent).then(go, go); }
    document.fonts.ready.then(go);
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', go);
  } else go();
  window.addEventListener('load', go);
  var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(go, 150); });
})();

/* Every page header ends on a solid 0.75cm band in the colour of the section that
   follows, so the eye reads that the page continues below (client, 2026-10-27). The
   colour is read from the next section, or from the page when that section has none. */
(function () {
  var bgOf = function (el) {
    while (el) {
      var c = getComputedStyle(el).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c)) return c;
      el = el.parentElement;
    }
    return '#FFFFFF';
  };
  document.querySelectorAll('main > .hero, main > .phero, main > header.phero, .hero.hero-cover, .phero').forEach(function (h) {
    if (h.querySelector(':scope > .next-fade')) return;
    var next = h.nextElementSibling;
    while (next && next.getBoundingClientRect().height < 4) next = next.nextElementSibling;
    var target = next ? next : document.body;
    var c = getComputedStyle(target).backgroundColor;
    if (!c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c)) c = bgOf(h.parentElement);
    var hc = bgOf(h);
    if (c === hc) return; // same colour below: nothing to bridge
    var f = document.createElement('span');
    f.className = 'next-fade'; f.setAttribute('aria-hidden', 'true');
    f.style.setProperty('--next-bg', c);
    h.appendChild(f);
  });
})();

/* Bands on a mid or dark background read in white (client, 2026-10-27): the luminance of each
   band's own background decides, so a tinted section in any palette keeps its text readable. */
(function () {
  var lum = function (c) {
    var m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    if (!m || (m[4] !== undefined && +m[4] < 0.5)) return null;
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]);
  };
  document.querySelectorAll('main > section, main > div, main > aside').forEach(function (b) {
    // a band that shows a photo is judged by its photo, not by the fallback colour under it
    if (b.matches('.hero, .phero, header') || b.querySelector('.hero-bg, .phero-feature-pic') || getComputedStyle(b).backgroundImage !== 'none') return;
    var L = lum(getComputedStyle(b).backgroundColor);
    if (L === null || L >= 0.3) return;
    b.classList.add('tone-dark');
    // a mid blue is too light for white text: deepen it toward the brand ink until white
    // reaches 4.5:1 (relative luminance 0.183 or lower)
    if (L > 0.18) {
      var m = getComputedStyle(b).backgroundColor.match(/[\d.]+/g).map(Number);
      var sc = getComputedStyle(b).backgroundColor.indexOf('color(') === 0 ? 255 : 1;
      var c = [m[0] * sc, m[1] * sc, m[2] * sc], ink = [18, 38, 58];
      for (var k = 0.1; k <= 0.9; k += 0.05) {
        var mix = c.map(function (v, i) { return Math.round(v * (1 - k) + ink[i] * k); });
        if (lum('rgb(' + mix.join(',') + ')') <= 0.18) { b.style.setProperty('background-color', 'rgb(' + mix.join(',') + ')', 'important'); break; }
      }
    }
  });
})();

/* Contrast safety net (client, 2026-10-27): any text that sits on a plain colour and falls
   under WCAG AA (4.5:1, or 3:1 for large text) is switched to the brand ink or to white,
   whichever reads better on that colour. Text over a photo is left to the header fades. */
(function () {
  var parse = function (c) {
    var m = c.match(/[\d.]+/g); if (!m) return null; m = m.map(Number);
    if (c.indexOf('color(') === 0) m = [m[0] * 255, m[1] * 255, m[2] * 255].concat(m.slice(3));
    return m;
  };
  var L = function (m) {
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]);
  };
  var ratio = function (a, b) { return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  var INK = [18, 38, 58], WHITE = [255, 255, 255];
  var run = function () {
    document.querySelectorAll('main h1, main h2, main h3, main h4, main p, main li, main dt, main dd, main a, main span, main summary, footer a, footer p, footer li').forEach(function (el) {
      if (!el.firstChild || ![].some.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); })) return;
      if (el.closest('.hero, .phero, .hero-bg, .fam-pic, .hfam-visual, .loc-tile-pic, .loc-pic, .blog-lead-pic')) return;
      var a = el, bg = null;
      while (a && a !== document.documentElement) {
        var cs = getComputedStyle(a);
        if (cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return; // over a photo
        if (a !== el && a.querySelector(':scope > picture, :scope > img')) return; // text laid over a photo
        var m = parse(cs.backgroundColor);
        if (m && (m.length < 4 || m[3] > 0.6)) { bg = m; break; }
        a = a.parentElement;
      }
      bg = bg || WHITE;
      var cs2 = getComputedStyle(el), fg = parse(cs2.color);
      if (!fg) return;
      var size = parseFloat(cs2.fontSize), bold = parseInt(cs2.fontWeight, 10) >= 700;
      var need = (size >= 24 || (bold && size >= 18.66)) ? 3 : 4.5;
      var lb = L(bg), op = parseFloat(cs2.opacity) || 1;
      var cr = ratio(L(fg), lb); if (op < 1) cr = 1 + (cr - 1) * op;
      if (cr >= need) return;
      var pick = ratio(L(INK), lb) >= ratio(L(WHITE), lb) ? INK : WHITE;
      el.style.setProperty('color', 'rgb(' + pick.join(',') + ')', 'important');
      if (op < 1) el.style.setProperty('opacity', '1', 'important');
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  window.addEventListener('load', run);
})();
