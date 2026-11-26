// =========================================================
// Exhibition page — one page per year: /exhibition?year=2025
//   • Year info (subtitle, intro, venue, dates, essay) ← /api/exhibitions/:year
//     (data/exhibitions.json)
//   • Artworks                                         ← /api/artworks?year=
//     (data/artworks.json)
// No year in the URL = the newest year.
// =========================================================

const $ = (id) => document.getElementById(id);
let allWorks = [];   // every artwork for this year
let artworks = [];   // what's currently shown (after filter), in pop-up order
let current = -1;    // index open in the pop-up
let lastFocus = null;
let filter = "all";

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function embedUrl(url = "") {
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}?autoplay=1`;
  return "";
}
const pad = (n) => String(n).padStart(2, "0");
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const countCreators = (list) =>
  new Set(list.flatMap((a) => String(a.artists || "").split(/,|&| and /i)).map((s) => s.trim()).filter(Boolean)).size;

const ribbonIcon = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 13.8 7 22l5-3 5 3-1.5-8.2"/></svg>`;

// Videos without an uploaded cover use their YouTube thumbnail
function coverOf(a) {
  if (a.image) return a.image;
  const m = String(a.videoUrl || "").match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
}

const isFileVideo = (url = "") => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

function tileHTML(a, i) {
  const sub = a.artists || a.name || "";
  return `
    <button class="tile" data-index="${i}" aria-label="${esc(a.title)}${a.award ? " – " + esc(a.award) : ""}">
      <img src="${esc(coverOf(a))}" alt="${esc(a.title)}" loading="lazy" />
      ${a.award ? `<span class="tile-ribbon" title="${esc(a.award)}">${ribbonIcon}</span>` : ""}
      ${a.type === "video" ? '<span class="tile-play">&#9654;</span>' : ""}
      ${a.number && collectionsMode ? `<span class="tile-num">${pad(a.number)}</span>` : ""}
      <span class="tile-cover">
        ${a.award ? `<span class="tile-award">${esc(a.award)}</span>` : ""}
        <span class="tile-title">${esc(a.title)}</span>
        ${sub && sub !== a.title ? `<span class="tile-artists">${esc(sub)}</span>` : ""}
      </span>
    </button>`;
}

let collectionsMode = false;
let collections = [];
let label = "";

async function load() {
  // Every exhibition year with its display label (e.g. 2025 → "2025–2026")
  const all = await fetch("/api/exhibitions").then((r) => r.json()).catch(() => []);
  const years = all.map((e) => e.year);
  const labelOf = (y) => (all.find((e) => e.year === y) || {}).label || String(y);
  const year = Number(new URLSearchParams(location.search).get("year")) || years[0] || new Date().getFullYear();

  const [info, list] = await Promise.all([
    fetch(`/api/exhibitions/${year}`).then((r) => r.json()),
    fetch(`/api/artworks?year=${year}`).then((r) => r.json()),
  ]);
  allWorks = list;
  label = info.label || labelOf(year);
  collections = (info.collections || []).filter((c) => c.title);
  collectionsMode = collections.length > 0;

  // ---- Hero: kicker, title and the exhibition's own intro text ----
  const title = info.title || `${label} Exhibition`;
  $("pageTitle").textContent = title;
  $("pageSub").textContent = info.title ? `${label} Exhibition` : window.SITE?.name || "";
  document.title = `${title} – ${window.SITE?.name || ""}`;

  const intro = (info.intro || []).filter(Boolean);
  $("introCount").textContent = intro[0] || info.subtitle || "";
  $("introCount").hidden = !$("introCount").textContent;
  $("introParas").innerHTML = intro.slice(1).map((p) => `<p>${esc(p)}</p>`).join("");

  // Key facts (counted from the works themselves)
  const videos = list.filter((a) => a.type === "video").length;
  const stills = list.length - videos;
  const facts = [
    collectionsMode && [pad(collections.length), "Collections"],
    [pad(list.length), "Works"],
    videos && [pad(videos), videos === 1 ? "Video" : "Videos & animations"],
  ].filter(Boolean);
  if (facts.length < 2 && stills) facts.push([pad(stills), stills === 1 ? "Still image" : "Still images"]);
  $("heroFacts").innerHTML = facts.map(([n, t]) => `<div><dt>${esc(n)}</dt><dd>${esc(t)}</dd></div>`).join("");

  // Collection index → jumps to each collection
  $("collIndex").hidden = !collectionsMode;
  $("collIndex").innerHTML = collections
    .map((c, i) => `<a href="#coll-${i + 1}"><span>${esc(c.number || pad(i + 1))}</span>${esc(c.title)}</a>`)
    .join("");

  const v = info.venue || {};
  const hasVisit = v.name || info.dates || info.hours;
  $("visitCard").hidden = !hasVisit;
  $("visitWhereRow").hidden = !v.name;
  $("visitName").textContent = v.name || "";
  $("visitAddress").textContent = v.address || "";
  $("visitDatesRow").hidden = !info.dates;
  $("visitDates").textContent = info.dates || "";
  $("visitHoursRow").hidden = !info.hours;
  $("visitHours").textContent = info.hours || "";
  $("visitMap").hidden = !v.mapUrl;
  if (v.mapUrl) $("visitMap").href = v.mapUrl;

  // ---- Exhibition text ----
  const essay = info.essay || [];
  $("essaySection").hidden = !essay.length;
  $("essayTitle").textContent = info.essayTitle || "Exhibition text";
  $("essay").innerHTML = essay.map((p) => `<p>${esc(p)}</p>`).join("");

  // ---- Works ----
  const hasAwards = list.some((a) => a.award);
  $("galleryHeading").textContent = "Awardees & Finalists";
  $("galleryHeading").hidden = !hasAwards;
  $("filters").hidden = !hasAwards || list.every((a) => a.award);
  renderWorks();

  // ---- Other years ----
  const others = years.filter((y) => y !== year);
  $("yearsSection").hidden = !others.length;
  $("yearsList").innerHTML = others
    .map((y) => `<a class="ex-year-link" href="/exhibition?year=${y}">${esc(labelOf(y))}<small>Exhibition</small></a>`)
    .join("");

  window.revealAll?.();
}

// Collection number for a work number ("01".."07"), used in the pop-up
const collectionOf = (a) => collections.find((c) => parseWorks(c.works).includes(Number(a.number)));
function parseWorks(v) {
  return String(v || "").split(/[^0-9]+/).filter(Boolean).map(Number);
}

function renderWorks() {
  const shown = filter === "awards" ? allWorks.filter((a) => a.award) : allWorks;

  // ---- Curated collections: each with its number, title, subtitle, text and works ----
  if (collectionsMode) {
    const byNum = new Map(shown.map((a) => [Number(a.number), a]));
    const used = new Set();
    artworks = [];
    const blocks = collections.map((c) => {
      const works = parseWorks(c.works).map((n) => byNum.get(n)).filter(Boolean);
      const start = artworks.length;
      works.forEach((a) => { artworks.push(a); used.add(a); });
      return `
        <section class="ex-coll reveal" id="coll-${collections.indexOf(c) + 1}">
          <header class="ex-coll-head">
            <span class="ex-coll-num">${esc(c.number || "")}</span>
            <div>
              <h3>${esc(c.title)}</h3>
              ${c.subtitle ? `<p class="ex-coll-sub">${esc(c.subtitle)}</p>` : ""}
            </div>
            ${c.text ? `<p class="ex-coll-text">${esc(c.text)}</p>` : ""}
          </header>
          <div class="ex-grid">${works.map((a, i) => tileHTML(a, start + i)).join("")}</div>
        </section>`;
    });
    // anything not placed in a collection still appears at the end
    const rest = shown.filter((a) => !used.has(a));
    if (rest.length) {
      const start = artworks.length;
      rest.forEach((a) => artworks.push(a));
      blocks.push(`<section class="ex-coll"><div class="ex-grid">${rest.map((a, i) => tileHTML(a, start + i)).join("")}</div></section>`);
    }
    $("collections").innerHTML = blocks.join("");
    $("stillsBlock").hidden = $("videosBlock").hidden = true;
    $("emptyMsg").hidden = shown.length > 0;
    window.revealAll?.();
    return;
  }
  $("collections").innerHTML = "";

  const stills = shown.filter((a) => a.type !== "video");
  const videos = shown.filter((a) => a.type === "video");
  artworks = [...stills, ...videos];

  $("stillsGrid").innerHTML = stills.map((a, i) => tileHTML(a, i)).join("");
  $("videosGrid").innerHTML = videos.map((a, i) => tileHTML(a, stills.length + i)).join("");
  $("stillsCount").textContent = stills.length ? `(${stills.length})` : "";
  $("videosCount").textContent = videos.length ? `(${videos.length})` : "";
  $("stillsBlock").hidden = !stills.length;
  $("videosBlock").hidden = !videos.length;
  $("emptyMsg").hidden = shown.length > 0;
}

$("filters").addEventListener("click", (e) => {
  const chip = e.target.closest(".ex-chip");
  if (!chip) return;
  filter = chip.dataset.filter;
  document.querySelectorAll(".ex-chip").forEach((c) => c.classList.toggle("active", c === chip));
  renderWorks();
});

// =========================================================
// Pop-up
// =========================================================
function fillPopup(a) {
  const embed = a.type === "video" ? embedUrl(a.videoUrl) : "";
  if (a.type === "video" && isFileVideo(a.videoUrl)) {
    // our own video file (e.g. /uploads/2025/26-cell-scan.mp4)
    $("lbMedia").innerHTML = `<video src="${esc(a.videoUrl)}" poster="${esc(coverOf(a))}" controls autoplay muted loop playsinline></video>`;
  } else if (embed) {
    $("lbMedia").innerHTML = `<iframe src="${esc(embed)}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  } else {
    const img = new Image();
    img.alt = a.title;
    img.onload = () => requestAnimationFrame(() => img.classList.add("loaded"));
    img.src = coverOf(a);
    $("lbMedia").replaceChildren(img);
    setTimeout(() => img.classList.add("loaded"), 700); // safety net
  }

  $("lbAward").textContent = a.award || "";
  $("lbKicker").textContent = [a.number && collectionsMode ? `No. ${pad(a.number)}` : "", a.name && a.name !== a.title ? a.name : ""].filter(Boolean).join(" · ");
  $("lbTitle").textContent = a.title;
  $("lbArtists").textContent = a.artists || "";
  $("lbLab").textContent = a.lab || "";
  const coll = collectionOf(a);
  $("lbColl").textContent = coll ? `${coll.number}. ${coll.title}` : "";
  $("lbCollRow").hidden = !coll;
  $("lbDept").textContent = a.department || "";
  $("lbDeptRow").hidden = !a.department;
  $("lbYear").textContent = label || a.year || "";
  $("lbType").textContent = a.type === "video" ? "Video / Animation" : "Still Image";

  // Text: "Scientific description" and "Lay summary" when both exist, otherwise just the text
  const block = (heading, text) =>
    text ? `${heading ? `<h4>${esc(heading)}</h4>` : ""}${String(text).split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join("")}` : "";
  $("lbText").innerHTML = a.scientific
    ? block("Scientific description", a.scientific) + block("Lay summary", a.description)
    : block(a.number && collectionsMode ? "Lay summary" : "", a.description);
  $("lbCount").textContent = `${pad(current + 1)} / ${pad(artworks.length)}`;
  $("lbInfo").scrollTop = 0;

  const single = artworks.length < 2;
  $("lbPrev").disabled = single;
  $("lbNext").disabled = single;
}

function openLightbox(i) {
  const wasOpen = current >= 0;
  current = (i + artworks.length) % artworks.length;
  const a = artworks[current];

  if (!wasOpen) {
    lastFocus = document.activeElement;
    fillPopup(a);
    $("lightbox").classList.add("open");
    $("lightbox").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.querySelector(".lb-close").focus({ preventScroll: true });
    return;
  }

  const info = $("lbInfo");
  info.classList.add("swap");
  setTimeout(() => {
    fillPopup(a);
    info.classList.remove("swap");
  }, 180);
}

function closeLightbox() {
  if (current < 0) return;
  $("lightbox").classList.remove("open");
  $("lightbox").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  current = -1;
  setTimeout(() => { if (current < 0) $("lbMedia").innerHTML = ""; }, 450);
  lastFocus?.focus?.({ preventScroll: true });
}

document.addEventListener("click", (e) => {
  const tile = e.target.closest(".tile");
  if (tile) return openLightbox(Number(tile.dataset.index));
  if (e.target.closest("[data-lb-close]")) closeLightbox();
});
$("lbPrev").addEventListener("click", () => openLightbox(current - 1));
$("lbNext").addEventListener("click", () => openLightbox(current + 1));
document.addEventListener("keydown", (e) => {
  if (current < 0) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") openLightbox(current - 1);
  if (e.key === "ArrowRight") openLightbox(current + 1);
});

load();
