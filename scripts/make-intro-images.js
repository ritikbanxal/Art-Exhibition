// Generates 5 minimal, science-inspired images for the intro animation
// and sets them in data/site.json → introImages.
// Run:  node scripts/make-intro-images.js
// (Replace them any time in Admin → Settings → Intro animation.)
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "public", "uploads");
const SITE = path.join(__dirname, "..", "data", "site.json");
fs.mkdirSync(OUT, { recursive: true });

const f = (n) => Number(n.toFixed(1));
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// 1 — ORBIT: tilted orbital ellipses around a dark planet, on warm cream
function orbit() {
  const W = 1200, H = 1600, cx = 600, cy = 800;
  let rings = "";
  for (let i = 0; i < 9; i++) {
    const rx = 140 + i * 52;
    rings += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${f(rx * 0.36)}" fill="none" stroke="#2a2a2e" stroke-opacity="${f(0.8 - i * 0.06)}" stroke-width="2.2"/>`;
  }
  const a = 2.3, rx = 140 + 6 * 52, ry = rx * 0.36;
  const px = cx + rx * Math.cos(a), py = cy + ry * Math.sin(a);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1ece5"/><stop offset="1" stop-color="#ded4c7"/></linearGradient>
  <radialGradient id="pl" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="#4a4a52"/><stop offset="1" stop-color="#121215"/></radialGradient>
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
<g transform="rotate(-18 ${cx} ${cy})">${rings}
  <circle cx="${f(px)}" cy="${f(py)}" r="16" fill="#d7345d"/>
</g>
<circle cx="${cx}" cy="${cy}" r="64" fill="url(#pl)"/>
</svg>`;
}

// 2 — INTERFERENCE: two sets of concentric rings forming a moiré, cream on charcoal
function interference() {
  const W = 1200, H = 1600;
  const set = (cx, cy) => {
    let s = "";
    for (let r = 18; r < 1150; r += 26) s += `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    return s;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><radialGradient id="bg" cx="50%" cy="50%" r="75%"><stop offset="0" stop-color="#1c1c21"/><stop offset="1" stop-color="#09090b"/></radialGradient></defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
<g fill="none" stroke="#f1ebe3" stroke-width="2" stroke-opacity=".38">
  ${set(500, 700)}
  ${set(720, 930)}
</g>
<circle cx="610" cy="815" r="12" fill="#d7345d"/>
</svg>`;
}

// 3 — FLOW: silky field lines rippling through deep teal
function flow() {
  const W = 1200, H = 1600;
  let lines = "";
  for (let i = 0; i < 46; i++) {
    const y0 = 140 + i * 29;
    let d = "";
    for (let x = 0; x <= W; x += 12) {
      const bump = Math.exp(-((x - 600) ** 2) / (2 * 260 ** 2)) * Math.exp(-((y0 - 800) ** 2) / (2 * 460 ** 2));
      const y = y0 + bump * 120 * Math.sin(x * 0.01 + i * 0.24);
      d += `${x === 0 ? "M" : "L"}${x} ${f(y)} `;
    }
    lines += `<path d="${d}" stroke-opacity="${f(0.3 + 0.55 * Math.exp(-((y0 - 800) ** 2) / (2 * 380 ** 2)))}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#123236"/><stop offset="1" stop-color="#071618"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
<g fill="none" stroke="#e9f2ee" stroke-width="2">${lines}</g>
</svg>`;
}

// 4 — CELLS: soft translucent cells floating on warm sand
function cells() {
  const W = 1200, H = 1600;
  seed = 11;
  let out = "";
  const placed = [];
  let tries = 0;
  while (placed.length < 15 && tries++ < 2000) {
    const r = 50 + rnd() * 150;
    const x = r + rnd() * (W - 2 * r), y = r + rnd() * (H - 2 * r);
    if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + r - 30)) continue;
    placed.push({ x, y, r });
  }
  for (const [i, p] of placed.entries()) {
    const fill = i % 4 === 0 ? "url(#c2)" : "url(#c1)";
    out += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(p.r)}" fill="${fill}" stroke="#b5475f" stroke-opacity=".35" stroke-width="1.2"/>`;
    out += `<circle cx="${f(p.x + p.r * 0.18)}" cy="${f(p.y - p.r * 0.12)}" r="${f(p.r * 0.17)}" fill="#b5475f" fill-opacity=".35"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe6db"/><stop offset="1" stop-color="#e3d3c2"/></linearGradient>
  <radialGradient id="c1" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="#fff6f0" stop-opacity=".9"/><stop offset="1" stop-color="#e9a9a9" stop-opacity=".45"/></radialGradient>
  <radialGradient id="c2" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="#f6d0d6" stop-opacity=".9"/><stop offset="1" stop-color="#d7345d" stop-opacity=".45"/></radialGradient>
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
${out}
</svg>`;
}

// 5 — ECLIPSE (the final, full-screen image): a glowing corona around a dark disc
function eclipse() {
  const W = 1920, H = 1920, cx = 960, cy = 960;
  let rings = "";
  for (let r = 520; r < 1400; r += 46) rings += `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="bg" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#22121f"/><stop offset=".55" stop-color="#0d0a10"/><stop offset="1" stop-color="#050507"/></radialGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset=".62" stop-color="#d7345d" stop-opacity=".95"/>
    <stop offset=".75" stop-color="#a02a6a" stop-opacity=".45"/>
    <stop offset="1" stop-color="#3b1640" stop-opacity="0"/>
  </radialGradient>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
<g fill="none" stroke="#ffffff" stroke-opacity=".05" stroke-width="1.2">${rings}</g>
<circle cx="${cx}" cy="${cy}" r="560" fill="url(#glow)" filter="url(#blur)"/>
<circle cx="${cx}" cy="${cy}" r="352" fill="#050506"/>
<circle cx="${cx}" cy="${cy}" r="352" fill="none" stroke="#ffd9c7" stroke-opacity=".85" stroke-width="2.5"/>
<circle cx="${cx - 228}" cy="${cy - 262}" r="9" fill="#fff1e8"/>
</svg>`;
}

const images = [
  ["intro-1-orbit.svg", orbit()],
  ["intro-2-interference.svg", interference()],
  ["intro-3-flow.svg", flow()],
  ["intro-4-cells.svg", cells()],
  ["intro-5-eclipse.svg", eclipse()],
];
for (const [name, svg] of images) {
  fs.writeFileSync(path.join(OUT, name), svg);
  console.log(`${name}  ${(svg.length / 1024).toFixed(1)} KB`);
}

const site = JSON.parse(fs.readFileSync(SITE, "utf8"));
site.introImages = images.map(([name]) => ({ image: `/uploads/${name}` }));
fs.writeFileSync(SITE, JSON.stringify(site, null, 2));
console.log("Added to data/site.json → introImages");
