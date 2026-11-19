// Tiny reveal-on-scroll: sections fade/slide in as they enter the viewport.
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach(function (el) { el.classList.add('visible'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(function (el) { io.observe(el); });
})();

// 3D hero background: rotating wireframe shapes + particles (Three.js).
(function () {
  var canvas = document.getElementById('bg3d');
  if (!canvas || typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 9;

  // Big wireframe torus knot — black, right side (sparse so it stays airy).
  var knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.9, 0.55, 80, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.3 })
  );
  knot.position.x = 2.6;
  scene.add(knot);

  // Small crimson icosahedron — floats on the left.
  var gem = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 0),
    new THREE.MeshBasicMaterial({ color: 0x2563eb, wireframe: true, transparent: true, opacity: 0.85 })
  );
  gem.position.set(-3.4, 1.6, 0);
  scene.add(gem);

  // Particle field.
  var count = 260;
  var pos = new Float32Array(count * 3);
  for (var i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 14;
  var pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var points = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0x000000, size: 0.07, transparent: true, opacity: 0.75 }));
  scene.add(points);

  // Mouse parallax.
  var mx = 0, my = 0;
  window.addEventListener('pointermove', function (e) {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  var gemBaseY = 1.6;
  function resize() {
    var w = canvas.parentElement.clientWidth;
    var h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    var mobile = w < 640;
    // On phones keep the 3D small and faint so the text stays readable.
    knot.scale.setScalar(mobile ? 0.55 : 1);
    knot.position.set(mobile ? 0 : 2.6, mobile ? -0.6 : 0, mobile ? -1 : 0);
    knot.material.opacity = mobile ? 0.14 : 0.3;
    gem.scale.setScalar(mobile ? 0.7 : 1);
    gem.position.set(mobile ? 0.85 : -3.4, mobile ? 2.6 : 1.6, 0);
    gem.material.opacity = mobile ? 0.5 : 0.85;
    gemBaseY = mobile ? 2.6 : 1.6;
    points.material.opacity = mobile ? 0.3 : 0.75;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('load', resize);
  resize();

  var clock = new THREE.Clock();
  (function tick() {
    requestAnimationFrame(tick);
    var t = clock.getElapsedTime();
    knot.rotation.x = t * 0.12;
    knot.rotation.y = t * 0.18;
    gem.rotation.x = -t * 0.25;
    gem.rotation.y = t * 0.3;
    gem.position.y = gemBaseY + Math.sin(t * 0.8) * 0.25;
    points.rotation.y = t * 0.02;
    camera.position.x += (mx * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (-my * 0.4 - camera.position.y) * 0.04;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
  })();
})();
