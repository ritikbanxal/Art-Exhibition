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

  // ---------- Numbers strip (counts up when it scrolls into view) ----------
  Promise.all([json("/api/stats", {}), json("/api/about", {})]).then(([stats, about]) => {
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

  // ---------- Featured works: newest year, award winners first ----------
  json("/api/artworks", []).then((list) => {
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
