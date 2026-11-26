// =========================================================
// The Living Canvas — website + admin panel server
//
//   Public site ........ /            (files in /public)
//   Public data API .... /api/...     (read-only)
//   Admin panel ........ /admin       (password from .env → ADMIN_PASSWORD)
//   Admin API .......... /api/admin/... (login required)
//
// All content lives in /data/*.json. Every admin save also keeps
// a timestamped backup in /data/backups (last 30 per file).
// =========================================================
const express = require("express");
const compression = require("compression");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Load private settings from .env next to this file (works however the server is started)
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch {
  /* no .env file — fine, values can come from the host's environment instead */
}

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------
// Where content is stored
//
// Locally: /data and /public/uploads inside this project.
// On a host that replaces the app folder on every deploy (like
// Hostinger), set STORAGE_DIR to a folder OUTSIDE the app, e.g.
//   STORAGE_DIR=~/art-storage
// so admin edits and uploads survive new deployments. On first start
// it is filled with the content from this repo (existing files are
// never overwritten).
// ---------------------------------------------------------
const REPO_DATA = path.join(__dirname, "data");
const REPO_UPLOADS = path.join(__dirname, "public", "uploads");
const STORAGE = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR.replace(/^~(?=$|[\\/])/, os.homedir()))
  : null;
const DATA_DIR = STORAGE ? path.join(STORAGE, "data") : REPO_DATA;
const UPLOAD_DIR = STORAGE ? path.join(STORAGE, "uploads") : REPO_UPLOADS;
const BACKUP_DIR = path.join(DATA_DIR, "backups");
fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Copy starter content from the repo into storage, without overwriting anything
function seedStorage(from, to, filter = () => true) {
  if (!fs.existsSync(from)) return 0;
  let copied = 0;
  for (const name of fs.readdirSync(from)) {
    const src = path.join(from, name);
    const dest = path.join(to, name);
    if (!fs.statSync(src).isFile() || !filter(name) || fs.existsSync(dest)) continue;
    fs.copyFileSync(src, dest);
    copied++;
  }
  return copied;
}
if (STORAGE) {
  const d = seedStorage(REPO_DATA, DATA_DIR, (n) => n.endsWith(".json"));
  const u = seedStorage(REPO_UPLOADS, UPLOAD_DIR);
  console.log(`Storage: ${STORAGE}${d || u ? `  (added ${d} data files, ${u} images from the repo)` : ""}`);
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
// If no secret is set, a random one is used (you'll be logged out when the server restarts)
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_DAYS = 7;
const COOKIE = "aor_admin";

app.disable("x-powered-by");
// Hosts like Hostinger sit behind a proxy: trust it so HTTPS cookies and
// the login rate-limit see the real visitor
app.set("trust proxy", 1);
app.use(compression()); // gzip text files (three.js goes from ~2 MB to ~450 KB)
app.use(express.json({ limit: "2mb" }));

// =========================================================
// Data helpers
// =========================================================
// Which files the admin may edit, and what shape each must be
const DOCS = {
  artworks: "array",
  exhibitions: "array",
  media: "array",
  faq: "array",
  about: "object",
  site: "object",
  home: "object",
  competition: "object",
};

function readData(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), "utf8"));
  } catch {
    return fallback;
  }
}

function writeData(name, value) {
  const file = path.join(DATA_DIR, `${name}.json`);
  // 1) back up the current version
  if (fs.existsSync(file)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.copyFileSync(file, path.join(BACKUP_DIR, `${name}-${stamp}.json`));
    const old = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith(`${name}-`)).sort();
    old.slice(0, Math.max(0, old.length - 30)).forEach((f) => fs.unlinkSync(path.join(BACKUP_DIR, f)));
  }
  // 2) write to a temp file, then swap it in (so a crash never leaves half a file)
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

// Public site only sees published works ("draft" ones are still being prepared in the admin)
const readArtworks = () => readData("artworks", []).filter((a) => !a.draft);
const splitArtists = (s) => String(s || "").split(/,|&| and /i).map((x) => x.trim()).filter(Boolean);

// =========================================================
// Public, read-only API
// =========================================================
app.get("/api/artworks", (req, res) => {
  let list = readArtworks();
  if (req.query.year) list = list.filter((a) => String(a.year) === String(req.query.year));
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  res.json(list);
});

app.get("/api/artworks/:id", (req, res) => {
  const art = readArtworks().find((a) => a.id === req.params.id);
  if (!art) return res.status(404).json({ error: "Not found" });
  res.json(art);
});

app.get("/api/years", (req, res) => {
  const fromArt = readArtworks().map((a) => Number(a.year));
  const fromInfo = readData("exhibitions", []).map((e) => Number(e.year));
  res.json([...new Set([...fromArt, ...fromInfo])].filter(Boolean).sort((a, b) => b - a));
});

app.get("/api/exhibitions", (req, res) => {
  const art = readArtworks();
  const info = readData("exhibitions", []);
  const years = [...new Set([...art.map((a) => Number(a.year)), ...info.map((e) => Number(e.year))])]
    .filter(Boolean)
    .filter((y) => !req.query.before || y < Number(req.query.before))
    .sort((a, b) => b - a);
  res.json(
    years.map((year) => {
      const e = info.find((x) => Number(x.year) === year) || {};
      const works = art.filter((a) => Number(a.year) === year);
      return {
        year,
        label: e.label || String(year),
        title: e.title || "",
        subtitle: e.subtitle || "",
        dates: e.dates || "",
        cover: e.cover || works.find((a) => a.image)?.image || "",
        works: works.length,
        awards: works.filter((a) => a.award).length,
      };
    })
  );
});

app.get("/api/exhibitions/:year", (req, res) => {
  const year = Number(req.params.year);
  const info = readData("exhibitions", []).find((e) => Number(e.year) === year);
  res.json(info || { year, subtitle: "", intro: [], venue: {}, dates: "", essay: [] });
});

app.get("/api/faq", (req, res) => res.json(readData("faq", [])));
app.get("/api/about", (req, res) => res.json(readData("about", {})));
app.get("/api/home", (req, res) => res.json(readData("home", {})));
app.get("/api/competition", (req, res) => res.json(readData("competition", {})));

app.get("/api/media", (req, res) => {
  const list = readData("media", []);
  list.sort((a, b) => (b.year || 0) - (a.year || 0));
  res.json(list);
});

app.get("/api/stats", (req, res) => {
  const list = readArtworks();
  res.json({
    exhibitions: new Set(list.map((a) => a.year)).size,
    artworks: list.length,
    creators: new Set(list.flatMap((a) => splitArtists(a.artists))).size,
  });
});

// Site-wide settings (name, email, links…) as a script every page loads first
app.get("/site-config.js", (req, res) => {
  res.type("application/javascript").set("Cache-Control", "no-cache");
  res.send(`window.SITE = ${JSON.stringify(readData("site", {})).replace(/</g, "\\u003c")};`);
});

// =========================================================
// Admin login (signed cookie, no database needed)
// =========================================================
const sign = (value) => crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");

function makeToken() {
  const expires = Date.now() + SESSION_DAYS * 864e5;
  const payload = `${expires}.${crypto.randomBytes(8).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

function validToken(token = "") {
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const a = Buffer.from(token.slice(i + 1));
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(payload.split(".")[0]) > Date.now();
}

function getCookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

function setSessionCookie(req, res, value, maxAgeSec) {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secure}`
  );
}

const isAdmin = (req) => validToken(getCookie(req, COOKIE));

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: "Please log in." });
  // Extra protection against cross-site requests: the admin app always sends this header
  if (req.method !== "GET" && req.get("X-Admin-Request") !== "1") {
    return res.status(403).json({ error: "Blocked request." });
  }
  next();
}

// Simple brute-force protection: 10 wrong passwords per 15 minutes per IP
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60e3);
  attempts.set(ip, list);
  return list.length >= 10;
}

function passwordMatches(input) {
  const a = crypto.createHash("sha256").update(String(input)).digest();
  const b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

app.post("/api/admin/login", (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: "No admin password set. Add ADMIN_PASSWORD to the .env file and restart." });
  }
  if (tooManyAttempts(req.ip)) {
    return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  }
  if (!passwordMatches(req.body?.password || "")) {
    attempts.get(req.ip).push(Date.now());
    return res.status(401).json({ error: "Wrong password." });
  }
  attempts.delete(req.ip);
  setSessionCookie(req, res, makeToken(), SESSION_DAYS * 86400);
  res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  setSessionCookie(req, res, "", 0);
  res.json({ ok: true });
});

app.get("/api/admin/me", (req, res) => res.json({ loggedIn: isAdmin(req) }));

// =========================================================
// Admin: read & save any content file
// =========================================================
app.get("/api/admin/data/:name", requireAdmin, (req, res) => {
  const kind = DOCS[req.params.name];
  if (!kind) return res.status(404).json({ error: "Unknown content." });
  res.json(readData(req.params.name, kind === "array" ? [] : {}));
});

// =========================================================
// Feedback form (Contact page) → data/feedback.json → Admin → Messages
// =========================================================
const FEEDBACK_MAX = 2000; // keep at most this many messages (oldest dropped)
const feedbackHits = new Map();
function feedbackTooFast(ip) {
  const now = Date.now();
  const list = (feedbackHits.get(ip) || []).filter((t) => now - t < 10 * 60e3);
  list.push(now);
  feedbackHits.set(ip, list);
  return list.length > 5; // 5 messages per 10 minutes per visitor
}

app.post("/api/feedback", (req, res) => {
  const b = req.body || {};
  const clean = (v, max) => String(v ?? "").trim().slice(0, max);
  const name = clean(b.name, 100);
  const email = clean(b.email, 200);
  const message = clean(b.message, 5000);
  // Bots fill the hidden "website" field: pretend it worked, store nothing
  if (b.website) return res.json({ ok: true });
  if (!name || !message) return res.status(400).json({ error: "Please fill in your name, email and message." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Please enter a valid email address." });
  if (feedbackTooFast(req.ip)) return res.status(429).json({ error: "Too many messages — please try again in a few minutes." });

  const list = readData("feedback", []);
  list.unshift({ id: crypto.randomUUID(), name, email, message, date: new Date().toISOString(), read: false });
  const tmp = path.join(DATA_DIR, "feedback.json.tmp");
  fs.writeFileSync(tmp, JSON.stringify(list.slice(0, FEEDBACK_MAX), null, 2));
  fs.renameSync(tmp, path.join(DATA_DIR, "feedback.json"));
  res.json({ ok: true });
});

app.get("/api/admin/feedback", requireAdmin, (req, res) => res.json(readData("feedback", [])));

app.patch("/api/admin/feedback/:id", requireAdmin, (req, res) => {
  const list = readData("feedback", []);
  const item = list.find((m) => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Message not found." });
  item.read = !!req.body?.read;
  fs.writeFileSync(path.join(DATA_DIR, "feedback.json"), JSON.stringify(list, null, 2));
  res.json({ ok: true });
});

app.delete("/api/admin/feedback/:id", requireAdmin, (req, res) => {
  const list = readData("feedback", []);
  const next = list.filter((m) => m.id !== req.params.id);
  if (next.length === list.length) return res.status(404).json({ error: "Message not found." });
  fs.writeFileSync(path.join(DATA_DIR, "feedback.json"), JSON.stringify(next, null, 2));
  res.json({ ok: true });
});

// The version of a content file that ships with the code (data/ in the repo).
// On a host with STORAGE_DIR the live copy is separate, so the admin can
// pull new text from a deploy into the editor, review it, then Save.
app.get("/api/admin/code-data/:name", requireAdmin, (req, res) => {
  if (!DOCS[req.params.name]) return res.status(404).json({ error: "Unknown content." });
  try {
    res.json(JSON.parse(fs.readFileSync(path.join(REPO_DATA, `${req.params.name}.json`), "utf8")));
  } catch {
    res.status(404).json({ error: "This content isn't included in the website code." });
  }
});

app.put("/api/admin/data/:name", requireAdmin, (req, res) => {
  const name = req.params.name;
  const kind = DOCS[name];
  if (!kind) return res.status(404).json({ error: "Unknown content." });
  const body = req.body;
  const ok = kind === "array" ? Array.isArray(body) : body && typeof body === "object" && !Array.isArray(body);
  if (!ok) return res.status(400).json({ error: `Expected ${kind === "array" ? "a list" : "an object"}.` });

  const problem = validate(name, body);
  if (problem) return res.status(400).json({ error: problem });

  writeData(name, body);
  res.json({ ok: true });
});

// Light validation so a bad save can't break the public pages
const SAFE_URL = /^(https?:\/\/|mailto:|\/|#|$)/i;
function validate(name, body) {
  const badUrl = (u) => u && !SAFE_URL.test(String(u).trim());
  if (name === "artworks") {
    for (const a of body) {
      if (!a.id || !a.title) return "Every artwork needs a title.";
      if (!Number(a.year)) return `"${a.title}" needs a year.`;
      if (badUrl(a.image) || badUrl(a.videoUrl)) return `"${a.title}" has an invalid link.`;
    }
  }
  if (name === "media") {
    for (const m of body) {
      if (!m.outlet) return "Every media entry needs an outlet name.";
      if (badUrl(m.url)) return `"${m.outlet}" has an invalid link (must start with https://).`;
    }
  }
  if (name === "exhibitions") {
    const years = body.map((e) => Number(e.year));
    if (years.some((y) => !y)) return "Every exhibition needs a year.";
    if (new Set(years).size !== years.length) return "Two exhibitions have the same year.";
    for (const e of body) if (badUrl(e.cover) || badUrl(e.venue?.mapUrl)) return `${e.year} has an invalid link.`;
  }
  if (name === "competition" && badUrl(body.overview?.buttonLink)) return "The competition button has an invalid link.";
  if (name === "home") {
    const links = [body.hero?.primaryLink, body.hero?.secondaryLink, body.intro?.linkUrl, body.closing?.primaryLink, body.closing?.secondaryLink];
    if (links.some(badUrl)) return "A homepage button has an invalid link.";
  }
  if (name === "site") {
    for (const k of ["instagram", "youtube", "submissionForm"]) if (badUrl(body[k])) return `Invalid link for ${k}.`;
    if (body.introImages && !Array.isArray(body.introImages)) return "Intro images must be a list.";
    for (const x of body.introImages || []) if (badUrl(x?.image)) return "An intro image has an invalid link.";
  }
  return null;
}

// =========================================================
// Admin: image upload
// =========================================================
const IMAGE_TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
const VIDEO_TYPES = { "video/mp4": ".mp4", "video/webm": ".webm" };
const UPLOAD_TYPES = { ...IMAGE_TYPES, ...VIDEO_TYPES };
const MAX_IMAGE = 20 * 1024 * 1024, MAX_VIDEO = 200 * 1024 * 1024;
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const base = path
        .parse(file.originalname).name.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
      cb(null, `${base}-${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}${UPLOAD_TYPES[file.mimetype]}`);
    },
  }),
  limits: { fileSize: MAX_VIDEO },
  fileFilter: (req, file, cb) =>
    UPLOAD_TYPES[file.mimetype] ? cb(null, true) : cb(new Error("Only JPG, PNG, WebP or GIF images, or MP4 / WebM videos, are allowed.")),
});

app.post("/api/admin/upload", requireAdmin, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "File is too large (videos max 200 MB)." : err.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: "No file received." });
    if (IMAGE_TYPES[req.file.mimetype] && req.file.size > MAX_IMAGE) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: "Image is too large (max 20 MB)." });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// =========================================================
// Pages
// =========================================================
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin", "index.html")));
// three.js for the homepage 3D scenes, served from node_modules (no outside CDN)
const THREE_DIR = path.join(__dirname, "node_modules", "three", "build");
app.get("/vendor/three/:file(three\\.module\\.js|three\\.core\\.js)", (req, res) => {
  res.set("Cache-Control", "public, max-age=604800");
  res.type("application/javascript").sendFile(path.join(THREE_DIR, req.params.file));
});
// Uploaded images (from storage when STORAGE_DIR is set)
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

app.listen(PORT, () => {
  console.log(`Site running at http://localhost:${PORT}`);
  console.log(`Admin panel at  http://localhost:${PORT}/admin`);
  if (!ADMIN_PASSWORD) console.warn("⚠  ADMIN_PASSWORD is not set — add it to .env to use the admin panel.");
});
