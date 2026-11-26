// =========================================================
// About page: everything comes from /api/about (data/about.json),
// edited in Admin → About Page.
// =========================================================
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const paras = (list) => (list || []).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
  const setText = (id, v) => { if (v) $(id).textContent = v; };
  const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  const ICONS = [
    // spark, open eye, links, seedling, people, award
    '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>',
    '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.6 10.6 15.4 7.4M8.6 13.4l6.8 3.2"/>',
    '<path d="M12 21v-8"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 15c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>',
    '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 20a4.5 4.5 0 0 1 7.5-3.4"/>',
    '<circle cx="12" cy="9" r="6"/><path d="M8.5 13.8 7 22l5-3 5 3-1.5-8.2"/>',
  ];

  fetch("/api/about")
    .then((r) => r.json())
    .then((a) => {
      // About
      const intro = a.intro || {};
      const ip = (intro.paragraphs || []).filter(Boolean);
      setText("introTitle", intro.title);
      if (intro.title) document.title = `${intro.title.replace(/^About\s+/i, "About – ")}`;
      $("introLead").textContent = ip[0] || "";
      $("introBody").innerHTML = paras(ip.slice(1));
      $("statement").textContent = intro.statement || "";
      $("statementSection").hidden = !intro.statement;

      // Mission + vision
      const m = a.mission || {}, v = a.vision || {};
      setText("missionTitle", m.title);
      $("missionBody").innerHTML = paras(m.paragraphs);
      setText("visionTitle", v.title);
      $("visionBody").innerHTML = paras(v.paragraphs);

      // Objectives
      const o = a.objectives || {};
      setText("objectivesTitle", o.title);
      $("objectives").innerHTML = (o.items || [])
        .map((it, i) => `
          <article class="ab-obj reveal" style="transition-delay:${(i % 3) * 0.08}s">
            <div class="ab-obj-top">
              <span class="ab-obj-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[i % ICONS.length]}</svg></span>
              <span class="ab-obj-num">${String(i + 1).padStart(2, "0")}</span>
            </div>
            <h3>${esc(it.title)}</h3>
            <p>${esc(it.text)}</p>
          </article>`)
        .join("");

      // Founder
      const f = a.founder || {};
      setText("founderHeading", f.heading);
      setText("founderName", f.name);
      setText("founderRole", f.role);
      $("founderBody").innerHTML = paras(f.paragraphs);
      const photo = $("founderPhoto");
      if (f.photo) {
        photo.innerHTML = `<img src="${esc(f.photo)}" alt="${esc(f.name || "")}" />`;
        photo.removeAttribute("aria-hidden");
      } else {
        photo.textContent = initials(f.name) || "";
      }

      // Founder's message
      const msg = a.message || {};
      setText("messageHeading", msg.heading);
      $("messageBody").innerHTML = paras(msg.paragraphs);
      setText("signature", msg.signature);
      setText("signatureRole", msg.signatureRole);

      window.revealAll?.();
    })
    .catch(() => {});
})();
