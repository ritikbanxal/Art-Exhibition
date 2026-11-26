// =========================================================
// About page: fills content from /api/about (data/about.json)
// and live numbers from /api/stats.
// =========================================================
const $ = (id) => document.getElementById(id);
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const pillarIcons = [
  // eye
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
  // flask
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 15h9"/></svg>`,
  // spark
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M19 17l.7 2 2 .7-2 .7L19 22l-.7-2-2-.7 2-.7z"/></svg>`,
];

async function load() {
  const [about, stats] = await Promise.all([
    fetch("/api/about").then((r) => r.json()),
    fetch("/api/stats").then((r) => r.json()).catch(() => ({})),
  ]);

  // Mission
  const m = about.mission || {};
  $("missionEyebrow").textContent = m.eyebrow || "Our mission";
  $("missionHeadline").textContent = m.headline || "";
  $("missionBody").innerHTML = (m.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("");

  // Pillars
  $("pillars").innerHTML = (about.pillars || [])
    .map(
      (p, i) => `
      <article class="ab-pillar reveal" style="transition-delay:${i * 0.08}s">
        <span class="ab-pillar-num">0${i + 1}</span>
        <span class="ab-pillar-icon">${pillarIcons[i % pillarIcons.length]}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.text)}</p>
      </article>`
    )
    .join("");

  // Statement
  $("statement").textContent = about.statement || "";

  // Timeline
  const tl = about.timeline || [];
  $("timeline").style.setProperty("--n", Math.max(tl.length, 1));
  $("timeline").innerHTML = tl
    .map(
      (t, i) => `
      <li class="reveal" style="transition-delay:${i * 0.08}s">
        <span class="ab-tl-year">${esc(t.year)}</span>
        <h4>${esc(t.title)}</h4>
        <p>${esc(t.text)}</p>
      </li>`
    )
    .join("");

  // Organizers — uses a photo if "photo" is set, otherwise initials
  $("organizers").innerHTML = (about.organizers || [])
    .map(
      (p, i) => `
      <div class="ab-person reveal" style="transition-delay:${i * 0.06}s">
        ${p.photo
          ? `<img class="ab-avatar" src="${esc(p.photo)}" alt="${esc(p.name)}" />`
          : `<div class="ab-avatar" aria-hidden="true">${esc(initials(p.name))}</div>`}
        <h4>${esc(p.name)}</h4>
        <p>${esc(p.role)}</p>
      </div>`
    )
    .join("");

  // Sponsors
  $("sponsors").innerHTML = (about.sponsors || [])
    .map((s) => `<div class="ab-sponsor">${esc(s)}</div>`)
    .join("");

  // Lists
  const listHTML = (arr = []) =>
    arr.map((p) => `<li><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span></li>`).join("");
  $("thanks").innerHTML = listHTML(about.thanks);
  $("credits").innerHTML = listHTML(about.credits);

  // Numbers
  const values = {
    years: about.founded ? new Date().getFullYear() - about.founded : 0,
    exhibitions: stats.exhibitions || 0,
    artworks: stats.artworks || 0,
    creators: stats.creators || 0,
  };
  document.querySelectorAll("[data-count]").forEach((el) => {
    el.dataset.target = values[el.dataset.count] || 0;
    el.dataset.suffix = el.dataset.count === "years" ? "+" : "";
  });
  watchCounters();

  window.revealAll?.();
}

// Count up from 0 when the numbers scroll into view
function watchCounters() {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        countUp(en.target);
      });
    },
    { threshold: 0.4 }
  );
  document.querySelectorAll("[data-count]").forEach((el) => obs.observe(el));
}
function countUp(el) {
  const target = Number(el.dataset.target) || 0;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || target === 0) return (el.textContent = target);
  const start = performance.now();
  const dur = 1400;
  // Safety net: always land on the final number, even if animation frames are paused
  setTimeout(() => (el.textContent = target), dur + 200);
  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

load();
