// Generates placeholder "science art" SVGs + sample artworks.json.
// Run once with: node scripts/make-samples.js
// (Safe to delete later — real artworks will come from the admin panel.)
const fs = require("fs");
const path = require("path");

const uploads = path.join(__dirname, "..", "public", "uploads");
const dataFile = path.join(__dirname, "..", "data", "artworks.json");
fs.mkdirSync(uploads, { recursive: true });

const palettes = [
  ["#1b0d2e", "#d7345d", "#f5c26b"],
  ["#06141b", "#1fa3a3", "#c8f0e0"],
  ["#120a05", "#c76b2b", "#f4e1c1"],
  ["#0a0f2a", "#5b5bd6", "#e3d7ff"],
  ["#0d1a0d", "#5aa55a", "#e8f5c8"],
  ["#1a0a14", "#a83279", "#ffd1e8"],
];

function svg(i, w, h) {
  const [bg, a, b] = palettes[i % palettes.length];
  let shapes = "";
  let seed = i * 9301 + 49297;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let k = 0; k < 40; k++) {
    const r = 10 + rnd() * (w / 4);
    shapes += `<circle cx="${(rnd() * w).toFixed(0)}" cy="${(rnd() * h).toFixed(0)}" r="${r.toFixed(0)}" fill="${rnd() > 0.5 ? a : b}" opacity="${(0.08 + rnd() * 0.3).toFixed(2)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><radialGradient id="g" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="${a}" stop-opacity=".55"/><stop offset="1" stop-color="${bg}"/></radialGradient>
<filter id="f"><feGaussianBlur stdDeviation="6"/></filter></defs>
<rect width="100%" height="100%" fill="${bg}"/><rect width="100%" height="100%" fill="url(#g)"/>
<g filter="url(#f)">${shapes}</g></svg>`;
}

const sizes = [[800, 1000], [1000, 750], [800, 800], [750, 1000], [1000, 700], [800, 1000]];
const titles = [
  ["Cell Bloom", "A. Researcher", "Molecular Biology", "Jury Award"],
  ["Turbulent Light", "B. Student", "Mechanical Engineering", "People's Choice"],
  ["Crystal Garden", "C. Scientist", "Chemistry", ""],
  ["Neural Weave", "D. Fellow", "Neuroscience", ""],
  ["Orbit Study", "E. Alumna", "Astrophysics", "Honorable Mention"],
  ["Pollen Constellation", "F. Staff", "Ecology & Evolutionary Biology", ""],
];

const artworks = titles.map(([title, artist, department, award], i) => {
  const file = `sample-${i + 1}.svg`;
  fs.writeFileSync(path.join(uploads, file), svg(i, ...sizes[i]));
  return {
    id: `sample-${i + 1}`,
    title,
    artists: artist,
    department,
    award,
    year: i < 4 ? 2025 : 2024,
    type: "image",
    image: `/uploads/${file}`,
    videoUrl: "",
    description:
      "Replace this with the story behind the artwork: what the image shows, how it was made (instrument, technique, scale) and what drew the artist to it.",
    order: i,
    createdAt: new Date().toISOString(),
  };
});

fs.mkdirSync(path.dirname(dataFile), { recursive: true });
fs.writeFileSync(dataFile, JSON.stringify(artworks, null, 2));
console.log(`Wrote ${artworks.length} sample artworks.`);
