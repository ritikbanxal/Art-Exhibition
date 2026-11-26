// =========================================================
// Media Coverage page: builds featured quotes + the year-by-year
// archive from /api/media (data/media.json).
//
// Each entry:  outlet, title, url, year,
//              type: "article" | "video" | "audio" | "pdf",
//              featured: true/false, quote: "..." (shown if featured)
// =========================================================
const $ = (id) => document.getElementById(id);
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const TYPES = {
  article: {
    label: "Article",
    icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h8M8 8h4"/></svg>`,
  },
  video: {
    label: "Video",
    icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>`,
  },
  audio: {
    label: "Audio",
    icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`,
  },
  pdf: {
    label: "PDF",
    icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><path d="M8.5 16v-4h1.2a1.2 1.2 0 0 1 0 2.4H8.5M13 12v4h1a2 2 0 0 0 0-4z"/></svg>`,
  },
};
const typeOf = (t) => TYPES[t] || TYPES.article;
const arrow = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M8 7h9v9"/></svg>`;

// A link opens in a new tab; entries without a URL render as plain rows
const linkAttrs = (url) => (url ? `href="${esc(url)}" target="_blank" rel="noopener"` : "");

let all = [];
let activeYear = "all";

async function load() {
  all = await fetch("/api/media").then((r) => r.json());

  // Featured quotes
  const featured = all.filter((m) => m.featured && m.quote);
  $("featuredSection").hidden = !featured.length;
  $("quotes").innerHTML = featured
    .map((m, i) => {
      const tag = m.url ? "a" : "div";
      return `
      <${tag} class="md-quote reveal" ${linkAttrs(m.url)} style="transition-delay:${i * 0.08}s">
        <blockquote>${esc(m.quote)}</blockquote>
        <div class="md-quote-foot">
          <span class="md-quote-src"><span class="md-quote-outlet">${esc(m.outlet)}</span><span class="md-quote-year">${esc(m.year)}</span></span>
          ${m.url ? `<span class="md-quote-link">Read &rarr;</span>` : ""}
        </div>
      </${tag}>`;
    })
    .join("");

  // Year filter chips
  const years = [...new Set(all.map((m) => m.year))].sort((a, b) => b - a);
  $("filters").innerHTML = ["all", ...years]
    .map(
      (y) => `<button class="md-chip${y === activeYear ? " active" : ""}" data-year="${y}" role="tab">
                ${y === "all" ? "All years" : y}
              </button>`
    )
    .join("");

  renderArchive();
  window.revealAll?.();
}

function renderArchive() {
  const list = activeYear === "all" ? all : all.filter((m) => String(m.year) === String(activeYear));
  const years = [...new Set(list.map((m) => m.year))].sort((a, b) => b - a);

  $("archive").innerHTML = years
    .map((y) => {
      const items = list.filter((m) => m.year === y);
      return `
      <div class="md-year-block">
        <div class="md-year">
          <strong>${esc(y)}</strong>
          <span>${items.length} ${items.length === 1 ? "feature" : "features"}</span>
        </div>
        <ul class="md-list">
          ${items
            .map((m) => {
              const t = typeOf(m.type);
              const tag = m.url ? "a" : "div";
              return `
              <li>
                <${tag} class="md-row" ${linkAttrs(m.url)}>
                  <span class="md-icon" aria-hidden="true">${t.icon}</span>
                  <span class="md-text">
                    <span class="md-outlet">${esc(m.outlet)}</span>
                    ${m.title ? `<span class="md-title">${esc(m.title)}</span>` : ""}
                  </span>
                  <span class="md-type">${t.label}</span>
                  <span class="md-arrow" aria-hidden="true">${m.url ? arrow : ""}</span>
                </${tag}>
              </li>`;
            })
            .join("")}
        </ul>
      </div>`;
    })
    .join("");

  $("count").textContent = `${list.length} ${list.length === 1 ? "feature" : "features"}`;
  $("empty").hidden = list.length > 0;
}

$("filters").addEventListener("click", (e) => {
  const chip = e.target.closest(".md-chip");
  if (!chip) return;
  activeYear = chip.dataset.year === "all" ? "all" : Number(chip.dataset.year);
  document.querySelectorAll(".md-chip").forEach((c) => c.classList.toggle("active", c === chip));
  renderArchive();
});

load();
