// =========================================================
// Exhibition archive
//   /archive              -> every year
//   /archive?before=2024  -> "Pre-2024": only years older than 2024
// =========================================================
const $ = (id) => document.getElementById(id);
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function load() {
  const before = Number(new URLSearchParams(location.search).get("before")) || 0;
  const list = await fetch(`/api/exhibitions${before ? `?before=${before}` : ""}`).then((r) => r.json());

  if (before) {
    $("arTitle").textContent = `Pre-${before}`;
    $("arSub").textContent = `Exhibitions before ${before}`;
    document.title = `Pre-${before} Exhibitions – ${window.SITE?.name || ""}`;
    $("arBack").hidden = false;
  }

  $("arCount").textContent = list.length ? `${list.length} exhibition${list.length === 1 ? "" : "s"}` : "";
  $("arEmpty").hidden = list.length > 0;

  $("arGrid").innerHTML = list
    .map(
      (e, i) => `
      <a class="ar-card" href="/exhibition?year=${e.year}" style="animation-delay:${i * 0.06}s">
        <div class="ar-media">
          ${e.cover ? `<img src="${esc(e.cover)}" alt="" loading="lazy" />` : ""}
          <span class="ar-year">${esc(e.label || String(e.year))}</span>
        </div>
        <div class="ar-body">
          <h3>${esc(e.title || `${e.label || e.year} Exhibition`)}</h3>
          ${e.title ? `<p class="ar-sub">${esc(`${e.label || e.year} Exhibition`)}</p>` : e.subtitle ? `<p class="ar-sub">${esc(e.subtitle)}</p>` : ""}
          <div class="ar-meta">
            <span><b>${e.works}</b> work${e.works === 1 ? "" : "s"}</span>
            ${e.awards ? `<span><b>${e.awards}</b> award${e.awards === 1 ? "" : "s"}</span>` : ""}
            ${e.dates ? `<span>${esc(e.dates)}</span>` : ""}
          </div>
          <span class="ar-link">View exhibition &rarr;</span>
        </div>
      </a>`
    )
    .join("");
}

load();
