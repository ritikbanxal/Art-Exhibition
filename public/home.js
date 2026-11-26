// =========================================================
// Homepage data: hero, introduction and closing text (Admin → Homepage),
// numbers strip, collage images and press quote.
// (The 3D scenes live in home-3d.js.)
// =========================================================
(() => {
  const $ = (id) => document.getElementById(id);
  const json = (url, fallback) => fetch(url).then((r) => r.json()).catch(() => fallback);
  const ytThumb = (url = "") => {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
  };

  // Helpers: set text / fill paragraphs / set a button — only when there's content
  const setText = (id, value) => { if (value) $(id).textContent = value; };
  const setParas = (id, list) => {
    const paras = (list || []).filter(Boolean);
    if (!paras.length) return;
    $(id).replaceChildren(...paras.map((t) => Object.assign(document.createElement("p"), { textContent: t })));
  };
  const setButton = (id, label, link) => {
    const el = $(id);
    if (!label) { el.hidden = true; return; }
    el.textContent = label;
    if (link) el.href = link;
  };

  // ---------- Homepage text (Admin → Homepage) ----------
  json("/api/home", {}).then((home) => {
    const h = home.hero || {}, i = home.intro || {}, c = home.closing || {};
    setText("heroKicker", h.kicker);
    setText("heroTitle", h.title);
    setText("heroSub", h.subtitle);
    setParas("heroText", h.text);
    setButton("heroBtn1", h.primaryLabel, h.primaryLink);
    setButton("heroBtn2", h.secondaryLabel, h.secondaryLink);

    setText("introEyebrow", i.eyebrow);
    setText("aboutHeadline", i.headline);
    setText("aboutLead", i.lead);
    setParas("aboutBody", i.paragraphs);
    if (i.linkLabel) $("introLink").textContent = `${i.linkLabel} →`;
    if (i.linkUrl) $("introLink").href = i.linkUrl;

    setText("closingHeadline", c.headline);
    setParas("closingText", c.paragraphs);
    setText("closingMotto", c.motto);
    setButton("closingBtn1", c.primaryLabel, c.primaryLink);
    setButton("closingBtn2", c.secondaryLabel, c.secondaryLink);
  });

  // ---------- Numbers strip + years badge ----------
  Promise.all([json("/api/stats", {}), json("/api/about", {})]).then(([stats, about]) => {
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

  // ---------- About collage: two artworks (falls back to the intro images) ----------
  const coverOf = (a) => a.image || (a.type === "video" ? ytThumb(a.videoUrl) : "");
  function fillAboutImages(list) {
    const covers = list.map(coverOf).filter(Boolean);
    const intro = ((window.SITE && window.SITE.introImages) || []).map((x) => x && x.image).filter(Boolean);
    const [a, b] = [...new Set([...covers, ...intro])];
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

  json("/api/artworks", []).then(fillAboutImages);

  // ---------- Press quote band: first featured quote ----------
  json("/api/media", []).then((list) => {
    const q = list.find((m) => m.featured && m.quote);
    if (!q) return;
    $("homeQuote").textContent = `“${q.quote}”`;
    $("homeQuoteOutlet").textContent = `–${q.outlet}`;
  });
})();
