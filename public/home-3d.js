// =========================================================
// Homepage 3D (three.js)
//   1. Hero: a living sphere of glowing particles with an orbital
//      ring. Follows the mouse, breathes with noise, scatters on scroll.
//   2. "Step inside the exhibition": a ring of real artworks floating
//      in space. Auto-rotates, drag to spin, hover for title, click
//      to open that year's exhibition.
// Both pause when off-screen, respect "reduce motion", and fall back
// to the plain design if WebGL isn't available.
// =========================================================
import * as THREE from "three";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
const isSmall = () => innerWidth < 700;

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Runs `frame` every animation frame, but only while `el` is on screen and the tab is visible
function animateWhileVisible(el, frame) {
  let onScreen = false, raf = 0;
  const loop = (t) => { frame(t); raf = requestAnimationFrame(loop); };
  const update = () => {
    const run = onScreen && !document.hidden && !reduceMotion;
    if (run && !raf) raf = requestAnimationFrame(loop);
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }, { rootMargin: "100px" }).observe(el);
  document.addEventListener("visibilitychange", update);
}

// 3D simplex noise (Ian McEwan, Ashima Arts — MIT licence)
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// =========================================================
// 1. HERO — particle sphere
// =========================================================
function initHero() {
  const host = document.getElementById("heroCanvas");
  if (!host) return;
  const hero = host.closest(".hero");

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(DPR);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  // Sphere points (evenly spread with a Fibonacci spiral) + a thin orbital ring
  const SPHERE = isSmall() ? 5000 : 11000;
  const RING = isSmall() ? 1600 : 3200;
  const total = SPHERE + RING;
  const pos = new Float32Array(total * 3);
  const rnd = new Float32Array(total);
  const ring = new Float32Array(total);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < SPHERE; i++) {
    const y = 1 - (i / (SPHERE - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const phi = i * golden;
    pos.set([Math.cos(phi) * r * 1.65, y * 1.65, Math.sin(phi) * r * 1.65], i * 3);
    rnd[i] = Math.random();
  }
  for (let i = SPHERE; i < total; i++) {
    const a = Math.random() * Math.PI * 2;
    const rad = 2.35 + Math.pow(Math.random(), 2) * 0.9;
    pos.set([Math.cos(a) * rad, (Math.random() - 0.5) * 0.06, Math.sin(a) * rad], i * 3);
    rnd[i] = Math.random();
    ring[i] = 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1));
  geo.setAttribute("aRing", new THREE.BufferAttribute(ring, 1));

  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uSize: { value: isSmall() ? 24 : 30 },
    uPixel: { value: DPR },
    uPink: { value: new THREE.Color("#e0406a") },
    uViolet: { value: new THREE.Color("#6a3bb0") },
    uCream: { value: new THREE.Color("#ffe7da") },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uScroll, uSize, uPixel;
      attribute float aRnd, aRing;
      varying float vNoise, vRnd, vAlpha, vRing;
      ${NOISE}
      void main() {
        vec3 p = position;
        float n = snoise(p * 0.85 + vec3(0.0, uTime * 0.12, uTime * 0.08));
        if (aRing < 0.5) {
          // sphere breathes with noise and bursts outward on scroll
          p += normalize(p) * (n * 0.32 + uScroll * (0.6 + aRnd * 3.2));
        } else {
          p.y += n * 0.08;
          p *= 1.0 + uScroll * (0.4 + aRnd * 1.2);
        }
        vNoise = n; vRnd = aRnd; vRing = aRing;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * uPixel * (0.45 + aRnd * 0.85) / -mv.z;
        vAlpha = smoothstep(10.0, 4.5, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uPink, uViolet, uCream;
      uniform float uScroll;
      varying float vNoise, vRnd, vAlpha, vRing;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float soft = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uViolet, uPink, smoothstep(-0.45, 0.55, vNoise));
        col = mix(col, uCream, step(0.965, vRnd) * 0.85 + vRing * 0.25);
        float a = soft * vAlpha * (0.78 + vRing * 0.1) * (1.0 - uScroll * 0.85);
        gl_FragColor = vec4(col, a);
      }`,
  });

  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);
  group.rotation.set(0.35, 0, -0.25); // tilt so the ring reads as an orbit
  scene.add(group);

  // Mouse parallax
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the sphere a pleasant size on tall (phone) screens
    camera.position.z = w / h < 0.8 ? 8.2 : 6.2;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  const clock = new THREE.Clock();
  const frame = () => {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uScroll.value = Math.min(Math.max(scrollY / (hero.offsetHeight * 0.9), 0), 1);
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    points.rotation.y = t * 0.06 + mouse.x * 0.45;
    group.rotation.x = 0.35 + mouse.y * 0.25;
    renderer.render(scene, camera);
  };
  frame();
  animateWhileVisible(hero, frame);
  hero.classList.add("has-3d");
}

// =========================================================
// 2. ARTWORK RING
// =========================================================
function ytThumb(url = "") {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
}

async function initRing() {
  const host = document.getElementById("ringCanvas");
  if (!host) return;
  const section = host.closest(".hm-ring");
  const caption = document.getElementById("ringCaption");

  let list = [];
  let labels = {};
  try {
    const [arts, exs] = await Promise.all([
      fetch("/api/artworks").then((r) => r.json()),
      fetch("/api/exhibitions").then((r) => r.json()).catch(() => []),
    ]);
    list = arts;
    labels = Object.fromEntries(exs.map((e) => [e.year, e.label || String(e.year)])); // 2025 → "2025–2026"
  } catch {}
  const works = list
    .map((a) => ({ ...a, cover: a.image || (a.type === "video" ? ytThumb(a.videoUrl) : ""), season: labels[a.year] || a.year }))
    .filter((a) => a.cover)
    .sort((a, b) => b.year - a.year || (b.award ? 1 : 0) - (a.award ? 1 : 0))
    .slice(0, 14);
  if (works.length < 2) { section.hidden = true; return; }

  // Make the ring feel full even with few works
  const items = [];
  while (items.length < Math.max(10, works.length)) items.push(...works);
  items.length = Math.max(10, works.length);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0c0c0e, 8.5, 17);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  const W = 1.5, H = 2.0, GAP = 0.45;
  const R = Math.max(3.2, (items.length * (W + GAP)) / (Math.PI * 2));
  const ringGroup = new THREE.Group();
  scene.add(ringGroup);

  const loader = new THREE.TextureLoader();
  const planes = items.map((art, i) => {
    const angle = (i / items.length) * Math.PI * 2;
    const mat = new THREE.MeshBasicMaterial({ color: 0x222226, side: THREE.DoubleSide, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
    mesh.position.set(Math.sin(angle) * R, 0, Math.cos(angle) * R);
    mesh.rotation.y = angle;
    mesh.userData = { art, scale: 1 };
    loader.load(art.cover, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      // "object-fit: cover" for the texture
      const img = tex.image;
      const imgAspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height) || 1;
      const planeAspect = W / H;
      if (imgAspect > planeAspect) {
        tex.repeat.set(planeAspect / imgAspect, 1);
        tex.offset.set((1 - tex.repeat.x) / 2, 0);
      } else {
        tex.repeat.set(1, imgAspect / planeAspect);
        tex.offset.set(0, (1 - tex.repeat.y) / 2);
      }
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    });
    // thin frame behind each artwork
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 0.08, H + 0.08),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
    );
    frame.position.z = -0.01;
    mesh.add(frame);
    ringGroup.add(mesh);
    return mesh;
  });

  // Soft glowing floor ellipse
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(R * 1.15, 64),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color("#d7345d") } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 uColor; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uColor, smoothstep(1.0, 0.0, d) * 0.16); }",
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -H / 2 - 0.35;
  scene.add(glow);

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = R + (w / h < 1 ? 10.5 : 8);
    camera.position.set(0, 1.25, dist);
    camera.lookAt(0, -0.75, 0); // frames the ring a little high, leaving room for the caption below
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  // Drag to spin (with inertia), otherwise slow auto-rotation
  let rot = 0, vel = 0, dragging = false, lastX = 0, moved = 0;
  const AUTO = reduceMotion ? 0 : 0.0016;
  const el = renderer.domElement;
  el.style.touchAction = "pan-y";
  el.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; moved = 0;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    pointer.x = (e.offsetX / el.clientWidth) * 2 - 1;
    pointer.y = -(e.offsetY / el.clientHeight) * 2 + 1;
    pointer.active = true;
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    vel = dx * 0.0045;
    rot += vel;
  });
  const end = () => { dragging = false; };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("pointerleave", () => { pointer.active = false; setHover(null); });

  // Hover + click
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(9, 9);
  let hovered = null;
  function setHover(mesh) {
    if (hovered === mesh) return;
    hovered = mesh;
    document.documentElement.classList.toggle("cur-view", !!mesh);
    el.style.cursor = mesh ? "pointer" : "grab";
  }
  el.addEventListener("click", () => {
    if (moved > 6 || !hovered) return;
    location.href = `/exhibition?year=${hovered.userData.art.year}`;
  });

  // Caption shows the hovered work, or the one facing the viewer
  let captionFor = null;
  function showCaption(art) {
    if (!caption || captionFor === art) return;
    captionFor = art;
    caption.classList.remove("show");
    setTimeout(() => {
      caption.querySelector("[data-title]").textContent = art.title;
      caption.querySelector("[data-meta]").textContent = [art.artists, art.season].filter(Boolean).join(" · ");
      caption.querySelector("[data-award]").textContent = art.award || "";
      caption.classList.add("show");
    }, 180);
  }

  const tmp = new THREE.Vector3();
  const frame = () => {
    if (!dragging) {
      vel *= 0.94;
      rot += vel + (Math.abs(vel) < AUTO ? AUTO : 0);
    }
    ringGroup.rotation.y = rot;

    if (pointer.active && !dragging) {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(planes, false)[0];
      setHover(hit ? hit.object : null);
    }

    // front-most artwork (closest to the camera)
    let front = planes[0], best = -Infinity;
    for (const p of planes) {
      p.getWorldPosition(tmp);
      if (tmp.z > best) { best = tmp.z; front = p; }
      const target = p === hovered ? 1.08 : 1;
      p.userData.scale += (target - p.userData.scale) * 0.12;
      p.scale.setScalar(p.userData.scale);
    }
    showCaption((hovered || front).userData.art);
    renderer.render(scene, camera);
  };
  frame();
  animateWhileVisible(section, frame);
  if (reduceMotion) setInterval(frame, 500); // still updates hover/caption, no spinning
}

// =========================================================
if (webglAvailable()) {
  initHero();
  initRing();
} else {
  document.documentElement.classList.add("no-webgl");
}
