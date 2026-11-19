// Tushar Khan personal site: pinwheel canvas, text scramble, reveal on scroll,
// copy email, work detail view, lab portal progress, dark chrome over the lab.
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- text scramble ---------- */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&@$!?';

  function scramble(el, text) {
    if (reduceMotion || !el) { if (el) el.textContent = text; return; }
    if (el.children.length) return;
    var len = text.length, start = null, dur = 700;
    function frame(ts) {
      if (!start) start = ts;
      var t = Math.min(1, (ts - start) / dur);
      var reveal = Math.floor(t * len);
      var out = text.slice(0, reveal);
      for (var i = reveal; i < len; i++) {
        out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = text;
    }
    requestAnimationFrame(frame);
  }

  /* store original text before anything observes */
  var scrambleEls = document.querySelectorAll('[data-scramble]');
  scrambleEls.forEach(function (el) {
    el.setAttribute('data-text', el.textContent);
  });

  /* ---------- reveal + scramble on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.hasAttribute('data-scramble')) {
        scramble(e.target, e.target.getAttribute('data-text'));
      }
      io.unobserve(e.target);
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal, [data-scramble]').forEach(function (el) {
    io.observe(el);
  });

  /* stack list fade in one by one */
  var stackIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        stackIo.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  var stacklist = document.querySelector('.stacklist');
  if (stacklist) stackIo.observe(stacklist);

  /* ---------- cycling role line ---------- */
  var cycleRole = document.getElementById('cycleRole');
  if (cycleRole) {
    var phrases = cycleRole.getAttribute('data-cycle').split('|');
    var ci = 0;
    setTimeout(function () { scramble(cycleRole, phrases[0]); }, 1200);
    setInterval(function () {
      ci = (ci + 1) % phrases.length;
      scramble(cycleRole, phrases[ci]);
    }, 4500);
  }

  /* ---------- pinwheel canvas ---------- */
  var canvas = document.getElementById('pinwheel');
  var ctx = canvas && canvas.getContext('2d');
  if (ctx) {
    var W = 0, H = 0, DPR = 1, angle = 0;

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    /* grain pattern, drawn once */
    var grain = document.createElement('canvas');
    grain.width = grain.height = 128;
    var gctx = grain.getContext('2d');
    var img = gctx.createImageData(128, 128);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = (Math.random() * 255) | 0;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 26;
    }
    gctx.putImageData(img, 0, 0);
    var grainPat = ctx.createPattern(grain, 'repeat');

    /* palette follows the lab: teal everywhere, deep teal to black only while
       the lab covers the viewport, teal again at contact */
    var labEl = document.getElementById('lab');
    var smoothCover = 0;

    function labCover() {
      if (!labEl) return 0;
      var r = labEl.getBoundingClientRect();
      var vh = window.innerHeight;
      var top = Math.max(r.top, 0), bottom = Math.min(r.bottom, vh);
      return Math.min(1, Math.max(0, (bottom - top) / vh));
    }

    function hexRgb(h) {
      return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    }

    function lerpColor(a, b, t) {
      var A = hexRgb(a), B = hexRgb(b);
      return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' +
        Math.round(A[1] + (B[1] - A[1]) * t) + ',' +
        Math.round(A[2] + (B[2] - A[2]) * t) + ')';
    }

    function baseColor(c) {
      if (c < 0.5) return lerpColor('#50b0a8', '#0d3a36', c * 2);
      return lerpColor('#0d3a36', '#000000', (c - 0.5) * 2);
    }

    function draw() {
      var p = smoothCover;
      ctx.fillStyle = baseColor(p);
      ctx.fillRect(0, 0, W, H);

      /* soft light, brighter toward the lower right */
      var g = ctx.createRadialGradient(W * 0.75, H * 0.85, 0, W * 0.75, H * 0.85, Math.max(W, H) * 0.9);
      g.addColorStop(0, 'rgba(255,255,255,0.10)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      /* six tapered beams from the viewport centre, slowly rotating */
      var cx = W / 2, cy = H / 2, R = Math.max(W, H) * 0.75;
      var pink = 0.26 + 0.34 * p;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      for (var i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI / 3);
        var bg = ctx.createLinearGradient(0, 0, R, 0);
        bg.addColorStop(0, 'rgba(162,89,95,' + pink + ')');
        bg.addColorStop(0.6, 'rgba(135,120,120,' + (pink * 0.6) + ')');
        bg.addColorStop(1, 'rgba(135,120,120,0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(R, -R * 0.10);
        ctx.lineTo(R, R * 0.10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      /* film grain, jittered each frame */
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.translate(((Math.random() * 128) | 0), ((Math.random() * 128) | 0));
      ctx.fillStyle = grainPat;
      ctx.fillRect(-128, -128, W + 256, H + 256);
      ctx.restore();
    }

    function tick() {
      if (!reduceMotion) angle += 0.00035;
      var cover = labCover();
      smoothCover += (cover - smoothCover) * 0.08;
      draw();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- copy email ---------- */
  document.querySelectorAll('.copy-email').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var email = btn.getAttribute('data-email');
      var original = btn.innerHTML;
      function done() {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.innerHTML = original; }, 1500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, function () { fallbackCopy(email, done); });
      } else {
        fallbackCopy(email, done);
      }
    });
  });

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    done();
  }

  /* ---------- work detail overlay ---------- */
  var rows = Array.prototype.slice.call(document.querySelectorAll('.workrow'));
  var detail = document.getElementById('detail');
  var current = 0;

  function openDetail(i) {
    current = i;
    var r = rows[i];
    var name = r.getAttribute('data-name');
    document.getElementById('detailCount').textContent = '0' + (i + 1) + ' of 06';
    document.getElementById('detailName').textContent = name;
    scramble(document.getElementById('detailName'), name);
    document.getElementById('detailName2').textContent = name;
    document.getElementById('detailType').textContent = r.getAttribute('data-type');
    document.getElementById('detailStack').textContent = r.getAttribute('data-stack');
    document.getElementById('detailDesc').textContent = r.getAttribute('data-desc');
    document.getElementById('detailOpen').href = r.getAttribute('data-link');
    var live = r.getAttribute('data-live');
    var liveEl = document.getElementById('detailLive');
    if (live) { liveEl.href = live; liveEl.style.display = ''; }
    else { liveEl.style.display = 'none'; }
    detail.hidden = false;
    document.body.classList.add('detail-open');
    window.scrollTo(0, 0);
  }

  function closeDetail() {
    detail.hidden = true;
    document.body.classList.remove('detail-open');
  }

  rows.forEach(function (r, i) {
    r.addEventListener('click', function () { openDetail(i); });
    r.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(i); }
    });
  });

  document.getElementById('detailNext').addEventListener('click', function () {
    openDetail((current + 1) % rows.length);
  });
  document.getElementById('detailClose').addEventListener('click', closeDetail);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !detail.hidden) closeDetail();
  });

  /* ---------- lab portal: scroll progress + click to contact ---------- */
  var lab = document.getElementById('lab');
  var labPct = document.getElementById('labPct');
  var portal = document.getElementById('portal');

  function updateLabPct() {
    if (!lab || !labPct) return;
    var rect = lab.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = (vh - rect.top) / (rect.height + vh);
    p = Math.min(1, Math.max(0, p));
    labPct.textContent = Math.round(p * 100) + '%';
  }
  window.addEventListener('scroll', updateLabPct, { passive: true });
  updateLabPct();

  if (portal) {
    portal.addEventListener('click', function () {
      var contact = document.getElementById('contact');
      if (contact) contact.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- dark chrome over the black lab stretch ---------- */
  var labObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) document.body.classList.add('dark-chrome');
    });
  }, { threshold: 0.2 });
  var contactObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) document.body.classList.remove('dark-chrome');
    });
  }, { threshold: 0.2 });
  if (lab) labObs.observe(lab);
  var contact = document.getElementById('contact');
  if (contact) contactObs.observe(contact);

  /* ---------- glimpses card tilt ---------- */
  var glimpse = document.querySelector('.glimpse');
  var glimpseCard = document.getElementById('glimpseCard');
  /* ---------- giant word fades out as it nears the fixed header ---------- */
  var giantEl = document.querySelector('.giant');
  function updateGiantFade() {
    if (!giantEl) return;
    var r = giantEl.getBoundingClientRect();
    var op = 1;
    if (r.top < 180) op = Math.max(0, Math.min(1, r.top / 180));
    giantEl.style.opacity = op;
  }
  window.addEventListener('scroll', updateGiantFade, { passive: true });
  window.addEventListener('resize', updateGiantFade);
  updateGiantFade();
})();
