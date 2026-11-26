// =========================================================
// Preloader + shutter page transitions
// Loaded as the FIRST thing inside <body> so the overlay covers
// the page before anything else is drawn.
//
//   • First visit of a session → full intro (~3 s):
//       letters rise, artworks flash in a frame with a 0→100 counter,
//       the last artwork grows to full screen, then splits into
//       vertical shutter panels that lift to reveal the page.
//   • Later page loads → quick shutter lift (~1 s).
//   • Clicking an internal link → panels drop to cover, then navigate.
//   • "Reduce motion" users → no animation at all.
// =========================================================
(() => {
  const html = document.documentElement;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
  };
  const full = store.get("pl-seen") !== "1";
  const COLS = innerWidth < 700 ? 4 : 6;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const cols = () => Array.from({ length: COLS }, (_, i) => `<span style="--i:${i}"></span>`).join("");

  html.classList.add("pl-active");

  // ---------- Build overlay ----------
  const pl = document.createElement("div");
  pl.className = "pl";
  pl.setAttribute("aria-hidden", "true");
  pl.innerHTML = `<div class="pl-cols">${cols()}</div>` + (full ? `
    <div class="pl-stage">
      <div class="pl-bar"><i></i></div>
      <div class="pl-name"></div>
      <div class="pl-frame"><div class="pl-imgs"></div></div>
      <div class="pl-caption"></div>
      <div class="pl-label">Loading exhibition</div>
      <div class="pl-count">000<sup>%</sup></div>
    </div>` : "");
  document.body.prepend(pl);

  // Hard safety net: never leave the overlay up for more than 7 s
  const safety = setTimeout(finish, 7000);

  function finish() {
    clearTimeout(safety);
    html.classList.add("pl-reveal");
    pl.classList.add("lift", "done");
    setTimeout(() => {
      pl.remove();
      html.classList.remove("pl-active");
      setTimeout(() => html.classList.remove("pl-reveal"), 1500);
    }, 1000 + COLS * 70);
  }

  setupLeave();

  // ---------- Quick version (every page after the first) ----------
  if (!full) {
    const go = () => setTimeout(finish, 150);
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
    return;
  }

  // ---------- Full intro ----------
  const $ = (s) => pl.querySelector(s);

  // Letters of the site name (site-config.js is loaded in <head>)
  const name = (window.SITE && window.SITE.name) || "Art of Rikk";
  $(".pl-name").innerHTML = [...name]
    .map((ch, i) => (ch === " " ? `<span class="sp" style="--i:${i}"></span>` : `<span style="--i:${i}">${ch.replace(/[<>&]/g, "")}</span>`))
    .join("");

  $(".pl-caption").textContent = (window.SITE && window.SITE.introCaption) || "Art · Science · Exhibition";

  // Images for the frame:
  //   1) the ones chosen in Admin → Settings → Intro animation
  //   2) otherwise the first artworks
  //   3) otherwise soft colour gradients
  const FALLBACK = ["#5a2236", "#1f4a52", "#4a2a20", "#3b2a5a", "#2a3b2a"];
  const chosen = ((window.SITE && window.SITE.introImages) || []).map((x) => x && x.image).filter(Boolean);
  const imagesReady = (chosen.length
    ? Promise.resolve(chosen)
    : fetch("/api/artworks").then((r) => r.json()).then((list) => list.map((a) => a.image).filter(Boolean)))
    .then((all) => {
      const urls = all.slice(0, 8);
      return Promise.all(
        urls.map((u) => new Promise((res) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = () => res(null);
          img.src = u;
        }))
      );
    })
    .then((imgs) => imgs.filter(Boolean))
    .catch(() => []);
  const timeout = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));

  // Progress bar + counter: time-based, but holds at 90 until the page has loaded
  let pageLoaded = document.readyState === "complete";
  addEventListener("load", () => (pageLoaded = true), { once: true });
  const counter = $(".pl-count");
  const bar = $(".pl-bar i");
  let shown = 0;
  const t0 = performance.now();
  const MIN = 2300; // minimum intro length (ms)
  let counterDone;
  const counterFinished = new Promise((r) => (counterDone = r));
  (function tick(now) {
    const timePct = Math.min((now - t0) / MIN, 1) * 100;
    const cap = pageLoaded ? 100 : 90;
    shown += (Math.min(timePct, cap) - shown) * 0.12;
    if (cap === 100 && timePct >= 100 && shown > 99.5) shown = 100;
    counter.firstChild.nodeValue = String(Math.round(shown)).padStart(3, "0");
    bar.style.width = `${shown}%`;
    shown < 100 ? requestAnimationFrame(tick) : counterDone();
  })(t0);

  (async () => {
    await wait(60);
    pl.classList.add("in"); // letters rise, frame opens

    const imgs = await Promise.race([imagesReady, timeout(1500, [])]);
    const box = $(".pl-imgs");
    const layers = imgs.length
      ? imgs.map((img) => { img.className = "pl-img"; img.alt = ""; return img; })
      : FALLBACK.map((c) => Object.assign(document.createElement("div"), { className: "pl-img", style: `background:radial-gradient(circle at 40% 40%, ${c}, #0e0e10)` }));
    box.append(...layers);

    // Flash the artworks one after another (shutter wipes)
    await wait(700);
    const step = Math.max(170, Math.min(300, 1300 / layers.length));
    for (const layer of layers) {
      layer.classList.add("show");
      await wait(step);
    }

    await counterFinished;
    await wait(250);

    // Grow the last artwork from the frame to full screen
    const last = layers[layers.length - 1];
    const r = box.getBoundingClientRect();
    const zoom = document.createElement("div");
    zoom.className = "pl-zoom";
    zoom.style.backgroundImage = last.src ? `url("${last.src}")` : last.style.background;
    zoom.style.clipPath = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px)`;
    pl.classList.add("out");
    $(".pl-stage").append(zoom);
    zoom.getBoundingClientRect(); // apply start state before animating
    zoom.style.clipPath = "inset(0px 0px 0px 0px)";
    await wait(1050);

    // Hand the image over to the shutter panels so it can split apart
    const spans = pl.querySelectorAll(".pl-cols span");
    const W = innerWidth, H = innerHeight;
    let bgW = W, bgH = H;
    if (last.naturalWidth) {
      const s = Math.max(W / last.naturalWidth, H / last.naturalHeight);
      bgW = last.naturalWidth * s;
      bgH = last.naturalHeight * s;
    }
    spans.forEach((sp) => {
      const left = sp.getBoundingClientRect().left;
      sp.style.backgroundImage = zoom.style.backgroundImage;
      sp.style.backgroundSize = `${bgW}px ${bgH}px`;
      sp.style.backgroundPosition = `${(W - bgW) / 2 - left}px ${(H - bgH) / 2}px`;
    });
    $(".pl-stage").remove();
    store.set("pl-seen", "1");
    await wait(80);
    finish();
  })().catch(finish);

  // ---------- Shutter when leaving the page ----------
  function setupLeave() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith("/admin")) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return; // same-page anchor
    if (/\.(jpg|jpeg|png|gif|webp|svg|pdf)$/i.test(url.pathname)) return;

    e.preventDefault();
    const leave = document.createElement("div");
    leave.className = "pl pl-leave";
    leave.innerHTML = `<div class="pl-cols">${cols()}</div>`;
    document.body.append(leave);
    leave.getBoundingClientRect();
    leave.classList.add("cover");
    setTimeout(() => (location.href = url.href), 600 + COLS * 45);
  });

  // Coming back with the browser's Back button can restore a covered page — uncover it
  addEventListener("pageshow", (e) => {
    if (e.persisted) document.querySelectorAll(".pl-leave").forEach((el) => el.remove());
  });
  }
})();
