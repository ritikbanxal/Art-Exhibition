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

function tileHTML(a, i) {
  return `
    <button class="tile" data-index="${i}" aria-label="${esc(a.title)}${a.award ? " – " + esc(a.award) : ""}">
      <img src="${esc(coverOf(a))}" alt="${esc(a.title)}" loading="lazy" />
      ${a.award ? `<span class="tile-ribbon" title="${esc(a.award)}">${ribbonIcon}</span>` : ""}
      ${a.type === "video" ? '<span class="tile-play">&#9654;</span>' : ""}
      <span class="tile-cover">
        ${a.award ? `<span class="tile-award">${esc(a.award)}</span>` : ""}
        <span class="tile-title">${esc(a.title)}</span>
        <span class="tile-artists">${esc(a.artists)}</span>
      </span>
    </button>`;
}

async function load() {
  const years = await fetch("/api/years").then((r) => r.json());
  const year = Number(new URLSearchParams(location.search).get("year")) || years[0] || new Date().getFullYear();

  const [info, list] = await Promise.all([
    fetch(`/api/exhibitions/${year}`).then((r) => r.json()),
    fetch(`/api/artworks?year=${year}`).then((r) => r.json()),
  ]);
  allWorks = list;

  // ---- Banner ----
  $("pageTitle").textContent = `${year} Exhibition`;
  document.title = `${year} Exhibition – ${window.SITE?.name || ""}`;
  $("pageSub").textContent = info.subtitle || "";

  // Cover image: the year's "cover", else the first artwork
  const cover = info.cover || list.map(coverOf).find(Boolean);
  if (cover) {
    const css = `url("${cover.replace(/"/g, "%22")}")`;
    $("exBanner").style.setProperty("--ex-cover", css);
    $("introBand").style.setProperty("--ex-cover", css);
  }

  // ---- Intro + visit card ----
  const stills = list.filter((a) => a.type !== "video");
  const videos = list.filter((a) => a.type === "video");
  const creators = countCreators(list);
  $("introEyebrow").textContent = `The ${year} exhibition`;
  $("introCount").innerHTML =
    `The ${year} exhibition features <strong>${plural(stills.length, "still image")}</strong>` +
    (videos.length ? ` and <strong>${plural(videos.length, "video")} and animations</strong>` : "") +
    (creators ? ` from <strong>${plural(creators, "creator")}</strong>.` : ".");
  $("introParas").innerHTML = (info.intro || []).map((p) => `<p>${esc(p)}</p>`).join("");

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
  $("essayTitle").textContent = `${year} ${info.essayTitle || "Exhibition text"}`;
  $("essay").innerHTML = essay.map((p) => `<p>${esc(p)}</p>`).join("");

  // ---- Works ----
  $("galleryHeading").textContent = `${year} Awardees & Finalists`;
  $("filters").hidden = !list.some((a) => a.award) || list.every((a) => a.award);
  renderWorks();

  // ---- Other years ----
  const others = years.filter((y) => y !== year);
  $("yearsSection").hidden = !others.length;
  $("yearsList").innerHTML = others
    .map((y) => `<a class="ex-year-link" href="/exhibition?year=${y}">${y}<small>Exhibition</small></a>`)
    .join("");

  window.revealAll?.();
}

function renderWorks() {
  const shown = filter === "awards" ? allWorks.filter((a) => a.award) : allWorks;
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
  if (embed) {
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
  $("lbTitle").textContent = a.title;
  $("lbArtists").textContent = a.artists || "";
  $("lbDept").textContent = a.department || "";
  $("lbDeptRow").hidden = !a.department;
  $("lbYear").textContent = a.year || "";
  $("lbType").textContent = a.type === "video" ? "Video / Animation" : "Still Image";
  $("lbDesc").textContent = a.description || "";
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
