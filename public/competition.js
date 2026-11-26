// =========================================================
// Competition page: text from /api/competition (Admin → Competition),
// sticky section menu, and animated judging bars.
// (3D visuals are in competition-3d.js.)
// =========================================================
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const paras = (list) => (list || []).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
  const set = (id, v) => { if (v != null && v !== "") $(id).textContent = v; };

  const CAT_ICONS = [
    // camera, microscope, film, chart, pen, palette, play
    '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    '<path d="M9 3h4l1 6h-6z"/><path d="M10 9l-2 6h6"/><path d="M5 21h14M12 15v6"/><circle cx="17" cy="13" r="3"/>',
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M3 15h18M7 5v14M17 5v14"/>',
    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="m14 7 3 3"/>',
    '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15 15h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
  ];
  const WHO_ICONS = [
    '<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11v5c3 2 7 2 10 0v-5"/>',
    '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c4 2.5 8 2.5 12 0v-5M22 9v6"/>',
    '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>',
    '<path d="M12 4v16M4 12h16"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
    '<path d="M4 20l4-1 11-11-3-3L5 16z"/>',
    '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  ];
  const svg = (path, size = 22) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

  fetch("/api/competition")
    .then((r) => r.json())
    .then((c) => {
      // ---- Overview ----
      const ov = c.overview || {};
      set("ovTitle", ov.title);
      set("ovHeading", ov.heading);
      set("ovHeading2", ov.heading);
      set("ovMotto", ov.motto);
      set("ctaMotto", ov.motto);
      $("ovText").innerHTML = paras(ov.paragraphs);
      for (const id of ["ovButton", "ctaButton"]) {
        if (ov.buttonLabel) $(id).textContent = ov.buttonLabel;
        if (ov.buttonLink) $(id).href = ov.buttonLink;
      }

      // ---- Divisions ----
      const dv = c.divisions || {};
      set("divTitle", dv.title);
      document.querySelectorAll("[data-div]").forEach((el) => {
        const item = (dv.items || [])[Number(el.dataset.div)] || {};
        el.textContent = item[el.dataset.field] || "";
      });

      // ---- Categories ----
      const ct = c.categories || {};
      set("catTitle", ct.title);
      $("catList").innerHTML = (ct.items || [])
        .map((it, i) => `
          <li class="cp-cat reveal" style="transition-delay:${(i % 4) * 0.06}s">
            <span class="cp-cat-num">${String(i + 1).padStart(2, "0")}</span>
            <span class="cp-cat-icon">${svg(CAT_ICONS[i % CAT_ICONS.length])}</span>
            <strong>${esc(it.name)}</strong>
            <span class="cp-cat-text">${esc(it.text)}</span>
          </li>`)
        .join("");

      // ---- Eligibility ----
      const el = c.eligibility || {};
      set("eligTitle", el.title);
      set("eligIntro", el.intro);
      $("eligGroups").innerHTML = (el.groups || [])
        .map((g, i) => `<li class="reveal" style="transition-delay:${i * 0.05}s"><span>${svg(WHO_ICONS[i % WHO_ICONS.length], 20)}</span>${esc(g)}</li>`)
        .join("");
      $("eligNotes").innerHTML = (el.notes || []).map((n) => `<p>${esc(n)}</p>`).join("");

      // ---- Guidelines ----
      const gl = c.guidelines || {};
      set("glTitle", gl.title);
      set("glIntro", gl.intro);
      set("reqTitle", gl.requirementsTitle);
      set("reqIntro", gl.requirementsIntro);
      $("reqList").innerHTML = (gl.requirements || [])
        .map((r) => `<li>${svg('<path d="m5 12 5 5 9-10"/>', 16)}<span>${esc(r)}</span></li>`)
        .join("");
      set("techTitle", gl.technicalTitle);
      $("techList").innerHTML = (gl.technical || [])
        .map((t) => `<div><dt>${esc(t.label)}</dt><dd>${esc(t.text)}</dd></div>`)
        .join("");
      set("integrityTitle", gl.integrityTitle);
      $("integrityText").innerHTML = paras(gl.integrity);
      set("selectionTitle", gl.selectionTitle);
      $("selectionText").innerHTML = paras(gl.selection);

      // ---- Judging (bars grow when scrolled into view) ----
      const jg = c.judging || {};
      set("judgeTitle", jg.title);
      $("judgeText").innerHTML = paras(jg.paragraphs);
      set("critLabel", jg.criteriaLabel);
      set("researchLabel", jg.researchLabel);
      set("artLabel", jg.artLabel);
      const max = Math.max(1, ...(jg.criteria || []).flatMap((r) => [Number(r.research) || 0, Number(r.art) || 0]));
      $("critRows").innerHTML = (jg.criteria || [])
        .map((r) => {
          const a = Number(r.research) || 0, b = Number(r.art) || 0;
          return `
          <div class="cp-row">
            <span class="cp-row-name">${esc(r.name)}</span>
            <div class="cp-bar k-research"><span class="cp-track"><i style="--w:${(a / max) * 100}%"></i></span><b>${a}%</b></div>
            <div class="cp-bar k-art"><span class="cp-track"><i style="--w:${(b / max) * 100}%"></i></span><b>${b}%</b></div>
          </div>`;
        })
        .join("");
      const table = $("judgeTable");
      new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) { table.classList.add("grow"); obs.disconnect(); }
      }, { threshold: 0.3 }).observe(table);
      setTimeout(() => table.classList.add("grow"), 6000); // safety net

      // ---- Awards ----
      const aw = c.awards || {};
      set("awardsTitle", aw.title);
      $("awardsText").innerHTML = paras(aw.paragraphs);
      const trophy = svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>', 24);
      $("awardList").innerHTML = (aw.items || [])
        .map((a, i) => `
          <article class="cp-award${a.featured ? " featured" : ""} reveal" style="transition-delay:${(i % 4) * 0.06}s">
            <span class="cp-award-icon">${trophy}</span>
            <h3>${esc(a.name)}</h3>
            <p>${esc(a.text)}</p>
          </article>`)
        .join("");

      window.revealAll?.();
    })
    .catch(() => {});

  // ---------- Sticky section menu: highlight the section in view ----------
  const links = [...document.querySelectorAll(".cp-subnav a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => {
        const on = a.getAttribute("href") === `#${e.target.id}`;
        a.classList.toggle("active", on);
        // on phones the menu scrolls sideways: keep the active link in view (without moving the page)
        if (on) {
          const bar = a.parentElement;
          bar.scrollTo({ left: a.offsetLeft - bar.clientWidth / 2 + a.offsetWidth / 2, behavior: "smooth" });
        }
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => spy.observe(s));
})();
