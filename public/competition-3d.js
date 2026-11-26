// =========================================================
// Competition page 3D (three.js)
//   • Hero: translucent glowing "cells" drifting in space, mouse parallax
//   • Division I (Science Through Research): a turning microscope-style
//     cell — point membrane, faint lattice and a glowing nucleus
//   • Division II (Science Through Art): flowing brush-stroke ribbons
// Each scene renders only while visible, respects "reduce motion",
// and the page still works without WebGL.
// =========================================================
import * as THREE from "three";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
const small = innerWidth < 700;

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Shared setup: renderer in `host`, resize handling, render-while-visible loop
function makeScene(host, { fov = 45, z = 6 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(DPR);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.z = z;
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  const run = (frame) => {
    const clock = new THREE.Clock();
    const draw = () => { frame(clock.getElapsedTime()); renderer.render(scene, camera); };
    draw();
    if (reduceMotion) return;
    let raf = 0, onScreen = false;
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    const update = () => {
      const go = onScreen && !document.hidden;
      if (go && !raf) raf = requestAnimationFrame(loop);
      if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }, { rootMargin: "80px" }).observe(host);
    document.addEventListener("visibilitychange", update);
  };
  return { renderer, scene, camera, run };
}

// Soap-bubble style glow: bright rim, see-through middle
const fresnelMaterial = (extra = "") =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color("#ffffff") }, uCore: { value: 0.06 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vC;
      void main() {
        #ifdef USE_INSTANCING
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        #else
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
        #endif
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #else
          vC = vec3(1.0);
        #endif
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uCore;
      varying vec3 vN; varying vec3 vV; varying vec3 vC;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
        vec3 col = uColor * vC;
        gl_FragColor = vec4(col * (f * 1.35 + uCore), f * 0.9 + uCore);
        ${extra}
      }`,
  });

// =========================================================
// 1. HERO — floating cells
// =========================================================
function heroCells() {
  const host = document.getElementById("cellsCanvas");
  if (!host) return;
  const { scene, camera, run } = makeScene(host, { fov: 50, z: 9 });

  const COUNT = small ? 22 : 42;
  const palette = ["#e0406a", "#8f4bd6", "#1fa3a3", "#e8893a", "#d7345d", "#6a3bb0"].map((c) => new THREE.Color(c));
  const mat = fresnelMaterial();
  const cells = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 40, 40), mat, COUNT);
  const nuclei = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 20), fresnelMaterial(), COUNT);
  nuclei.material.uniforms.uCore.value = 0.25;

  const data = [];
  for (let i = 0; i < COUNT; i++) {
    const r = 0.25 + Math.pow(Math.random(), 2.2) * 1.25;
    data.push({
      x: (Math.random() - 0.5) * 18,
      y: (Math.random() - 0.5) * 11,
      z: -Math.random() * 8 + 1.5,
      r,
      speed: 0.08 + Math.random() * 0.18,
      wob: Math.random() * Math.PI * 2,
      nx: (Math.random() - 0.5) * 0.4, ny: (Math.random() - 0.5) * 0.4,
    });
    const c = palette[i % palette.length];
    cells.setColorAt(i, c);
    nuclei.setColorAt(i, c);
  }
  scene.add(cells, nuclei);

  // Fine floating dust
  const DUST = small ? 400 : 900;
  const dp = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) dp.set([(Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, -Math.random() * 10 + 2], i * 3);
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: "#ffd6e2", size: 0.035, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(dust);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  run((t) => {
    for (let i = 0; i < COUNT; i++) {
      const d = data[i];
      let y = d.y + t * d.speed;
      y = ((y + 6.5) % 13) - 6.5; // drift upward and wrap around
      const x = d.x + Math.sin(t * 0.3 + d.wob) * 0.35;
      const sq = 1 + Math.sin(t * 0.9 + d.wob) * 0.04; // gentle "breathing"
      p.set(x, y, d.z);
      s.set(d.r * sq, d.r / sq, d.r);
      cells.setMatrixAt(i, m.compose(p, q, s));
      p.set(x + d.nx * d.r, y + d.ny * d.r, d.z);
      s.setScalar(d.r * 0.32);
      nuclei.setMatrixAt(i, m.compose(p, q, s));
    }
    cells.instanceMatrix.needsUpdate = true;
    nuclei.instanceMatrix.needsUpdate = true;
    dust.rotation.y = t * 0.01;
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    camera.position.x = mouse.x * 0.8;
    camera.position.y = -mouse.y * 0.5;
    camera.lookAt(0, 0, -2);
  });
}

// =========================================================
// 2. DIVISION I — microscope cell
// =========================================================
function researchCell() {
  const host = document.getElementById("researchCanvas");
  if (!host) return;
  const { scene, run } = makeScene(host, { fov: 40, z: 5 });
  const g = new THREE.Group();
  scene.add(g);

  // membrane made of points
  const ico = new THREE.IcosahedronGeometry(1.35, small ? 12 : 18);
  const pts = ico.getAttribute("position");
  const membrane = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", pts),
    new THREE.PointsMaterial({ color: "#5fe3d6", size: 0.022, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  g.add(membrane);

  // faint structural lattice
  const lattice = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.36, 2)),
    new THREE.LineBasicMaterial({ color: "#2aa9b5", transparent: true, opacity: 0.18 })
  );
  g.add(lattice);

  // glowing nucleus + soft shell
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.48, 40, 40), fresnelMaterial());
  nucleus.material.uniforms.uColor.value.set("#e0406a");
  nucleus.material.uniforms.uCore.value = 0.18;
  nucleus.position.set(0.18, 0.08, 0.1);
  g.add(nucleus);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.37, 48, 48), fresnelMaterial());
  shell.material.uniforms.uColor.value.set("#1fa3a3");
  shell.material.uniforms.uCore.value = 0.02;
  g.add(shell);

  // small organelles orbiting inside
  const orgs = [];
  for (let i = 0; i < 7; i++) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.07 + Math.random() * 0.06, 16, 16), fresnelMaterial());
    o.material.uniforms.uColor.value.set(i % 2 ? "#8f4bd6" : "#5fe3d6");
    o.material.uniforms.uCore.value = 0.3;
    o.userData = { r: 0.7 + Math.random() * 0.4, a: Math.random() * 6.28, s: 0.2 + Math.random() * 0.3, tilt: Math.random() * 1.2 };
    orgs.push(o);
    g.add(o);
  }

  g.rotation.x = 0.35;
  run((t) => {
    g.rotation.y = t * 0.22;
    membrane.scale.setScalar(1 + Math.sin(t * 1.3) * 0.012);
    for (const o of orgs) {
      const d = o.userData;
      const a = d.a + t * d.s;
      o.position.set(Math.cos(a) * d.r, Math.sin(a * 1.3) * d.r * 0.4 + Math.sin(d.tilt) * 0.2, Math.sin(a) * d.r * 0.8);
    }
  });
}

// =========================================================
// 3. DIVISION II — brush-stroke ribbons
// =========================================================
function artRibbons() {
  const host = document.getElementById("artCanvas");
  if (!host) return;
  const { scene, run } = makeScene(host, { fov: 40, z: 5 });

  const STRANDS = 9, PER = small ? 260 : 420;
  const N = STRANDS * PER;
  const pos = new Float32Array(N * 3), tAttr = new Float32Array(N), kAttr = new Float32Array(N), rnd = new Float32Array(N);
  for (let k = 0; k < STRANDS; k++) {
    for (let i = 0; i < PER; i++) {
      const n = k * PER + i;
      const t = i / (PER - 1);
      pos.set([(t - 0.5) * 5.2, (k - STRANDS / 2) * 0.055, (Math.random() - 0.5) * 0.08], n * 3);
      tAttr[n] = t; kAttr[n] = k / STRANDS; rnd[n] = Math.random();
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aT", new THREE.BufferAttribute(tAttr, 1));
  geo.setAttribute("aK", new THREE.BufferAttribute(kAttr, 1));
  geo.setAttribute("aR", new THREE.BufferAttribute(rnd, 1));

  const uniforms = { uTime: { value: 0 }, uPixel: { value: DPR } };
  const ribbons = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uPixel;
      attribute float aT, aK, aR;
      varying float vT; varying float vR;
      void main() {
        vec3 p = position;
        float w = aT * 6.2831;
        // sweeping S-curves, each strand slightly offset — like a loaded brush
        p.y += sin(w * 0.9 + uTime * 0.7 + aK * 1.4) * 0.75 + sin(w * 2.3 - uTime * 0.5) * 0.18;
        p.z += cos(w * 0.8 + uTime * 0.6 + aK * 2.0) * 0.6;
        p.y += (aK - 0.5) * (0.35 + 0.3 * sin(w + uTime));
        vT = aT; vR = aR;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float taper = sin(aT * 3.14159);
        gl_PointSize = (2.0 + taper * 7.0 * (0.4 + aR)) * uPixel * (3.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vT; varying float vR;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        vec3 pink = vec3(0.88, 0.25, 0.42), orange = vec3(0.95, 0.56, 0.24), violet = vec3(0.56, 0.3, 0.84);
        vec3 col = mix(mix(violet, pink, smoothstep(0.0, 0.5, vT)), orange, smoothstep(0.5, 1.0, vT));
        float a = smoothstep(0.5, 0.0, d) * (0.35 + 0.4 * sin(vT * 3.14159)) * (0.6 + vR * 0.4);
        gl_FragColor = vec4(col, a);
      }`,
  }));
  ribbons.rotation.z = -0.18;
  scene.add(ribbons);
  run((t) => { uniforms.uTime.value = t; ribbons.rotation.y = Math.sin(t * 0.25) * 0.35; });
}

// =========================================================
if (webglAvailable()) {
  heroCells();
  researchCell();
  artRibbons();
} else {
  document.documentElement.classList.add("no-webgl");
}
