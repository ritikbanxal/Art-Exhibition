// =========================================================
// Homepage data: numbers strip, featured works, press quote.
// (The 3D scenes live in home-3d.js.)
// =========================================================
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const json = (url, fallback) => fetch(url).then((r) => r.json()).catch(() => fallback);
  const ytThumb = (url = "") => {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
  };

  // ---------- About section + numbers strip ----------
  Promise.all([json("/api/stats", {}), json("/api/about", {})]).then(([stats, about]) => {
    // About text comes from Admin → About Page (mission + "What we look for")
    const m = about.mission || {};
    const paras = (m.paragraphs || []).filter(Boolean);
    if (m.headline) $("aboutHeadline").textContent = m.headline;
    if (paras[0]) $("aboutLead").textContent = paras[0];
    $("aboutBody").textContent = paras[1] || "";
    const pillars = (about.pillars || []).slice(0, 3);
    if (pillars.length) {
      $("aboutPillars").innerHTML = pillars
        .map((p, i) => `<li class="reveal" style="transition-delay:${i * 0.1}s"><span>0${i + 1}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></li>`)
        .join("");
      window.revealAll?.();
    }
    if (about.founded) $("aboutYears").textContent = `${new Date().getFullYear() - about.founded}+`;

    const values = {
      years: about.founded ? new Date().getFullYear() - about.founded : 0,
      exhibitions: stats.exhibitions || 0,
      artworks: stats.artworks || 0,
      creators: stats.creators || 0,
    };
    document.querySelectorAll("[data-count]").forEach((el) => {
      el.dataset.target = values[el.dataset.count] || 0;
      if (el.dataset.count === "years") el.dataset.suffix = "+";
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target, target = Number(el.dataset.target);
        const start = performance.now(), dur = 1400;
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        setTimeout(() => (el.textContent = target), dur + 200); // safety net
      });
    }, { threshold: 0.4 });
    document.querySelectorAll("[data-count]").forEach((el) => io.observe(el));
  });

  // ---------- About collage: two artworks (different from the featured ones) ----------
  const coverOf = (a) => a.image || (a.type === "video" ? ytThumb(a.videoUrl) : "");
  function fillAboutImages(list) {
    const covers = list.map(coverOf).filter(Boolean);
    const intro = ((window.SITE && window.SITE.introImages) || []).map((x) => x && x.image).filter(Boolean);
    // Prefer artworks from older years (the featured row shows the newest year)
    const newest = Math.max(...list.map((a) => Number(a.year) || 0));
    const older = list.filter((a) => Number(a.year) !== newest).map(coverOf).filter(Boolean);
    const pool = [...older, ...covers, ...intro];
    const [a, b] = [...new Set(pool)];
    if (a) $("aboutImgA").src = a;
    if (b) $("aboutImgB").src = b;
    else $("aboutSmall").hidden = true;
  }

  // Small collage image drifts slightly as you scroll (subtle depth)
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const small = $("aboutSmall");
    const section = $("about");
    let ticking = false;
    addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r = section.getBoundingClientRect();
        const p = (innerHeight - r.top) / (innerHeight + r.height); // 0 → 1 while passing
        if (p > -0.2 && p < 1.2) small.style.transform = `translateY(${(0.5 - p) * 70}px)`;
        ticking = false;
      });
    }, { passive: true });
  }

  // ---------- Featured works: newest year, award winners first ----------
  json("/api/artworks", []).then((list) => {
    fillAboutImages(list);
    if (!list.length) return;
    const year = Math.max(...list.map((a) => Number(a.year) || 0));
    const pick = list
      .filter((a) => Number(a.year) === year)
      .sort((a, b) => (b.award ? 1 : 0) - (a.award ? 1 : 0) || (a.order ?? 0) - (b.order ?? 0))
      .slice(0, 3);
    if (!pick.length) return;
    const hasAwards = pick.some((a) => a.award);
    $("featuredEyebrow").textContent = `${year} Exhibition`;
    $("featuredTitle").textContent = hasAwards ? "Award winners & highlights" : "Highlights";
    $("featuredLink").href = `/exhibition?year=${year}`;
    $("featuredWorks").innerHTML = pick
      .map((a, i) => {
        const cover = a.image || (a.type === "video" ? ytThumb(a.videoUrl) : "");
        return `
        <a class="hm-work reveal" href="/exhibition?year=${year}" style="transition-delay:${i * 0.1}s">
          <span class="hm-work-img">${cover ? `<img src="${esc(cover)}" alt="${esc(a.title)}" loading="lazy" />` : ""}</span>
          <span class="hm-work-meta">
            ${a.award ? `<em>${esc(a.award)}</em>` : ""}
            <strong>${esc(a.title)}</strong>
            <small>${esc(a.artists || "")}</small>
          </span>
        </a>`;
      })
      .join("");
    $("featured").hidden = false;
    window.revealAll?.();
  });

  // ---------- Press quote band: first featured quote ----------
  json("/api/media", []).then((list) => {
    const q = list.find((m) => m.featured && m.quote);
    if (!q) return;
    $("homeQuote").textContent = `“${q.quote}”`;
    $("homeQuoteOutlet").textContent = `–${q.outlet}`;
  });
})();
