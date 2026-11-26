// =========================================================
// Custom cursor: a dot that follows the mouse exactly and a
// ring that glides after it.
//   • links / buttons  → ring grows with a soft pink tint
//   • artworks / cards → pink circle labelled "View"
//   • text fields / videos → normal cursor
// Only runs on devices with a real mouse (not phones/tablets).
// =========================================================
(() => {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const html = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const dot = document.createElement("div");
  dot.className = "cur-dot";
  dot.innerHTML = "<i></i>";
  const ring = document.createElement("div");
  ring.className = "cur-ring";
  ring.innerHTML = '<i><span class="cur-label">View</span></i>';
  dot.setAttribute("aria-hidden", "true");
  ring.setAttribute("aria-hidden", "true");
  document.body.append(ring, dot);
  html.classList.add("has-cursor");

  // What counts as clickable / an artwork / a typing area
  const VIEW = ".tile, .ar-card, .md-quote[href], .hm-work";
  const HOVER = "a[href], button:not(:disabled), [role='button'], label, select, summary, .md-chip, .ex-chip, .faq-q, .row";
  const TEXT = "input, textarea, select, [contenteditable='true'], iframe";

  let x = -100, y = -100, rx = -100, ry = -100, visible = false;

  addEventListener("mousemove", (e) => {
    x = e.clientX;
    y = e.clientY;
    if (!visible) {
      rx = x; ry = y;
      visible = true;
      html.classList.add("cur-on");
    }
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, { passive: true });

  // Ring follows with easing (instant if the user prefers less motion)
  (function loop() {
    const ease = reduce ? 1 : 0.17;
    rx += (x - rx) * ease;
    ry += (y - ry) * ease;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(loop);
  })();

  // Hover states
  document.addEventListener("mouseover", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const view = t.closest(VIEW);
    html.classList.toggle("cur-text", !!t.closest(TEXT));
    html.classList.toggle("cur-view", !!view);
    html.classList.toggle("cur-hover", !view && !!t.closest(HOVER));
    if (view) ring.querySelector(".cur-label").textContent = view.dataset.cursor || "View";
  });

  addEventListener("mousedown", () => html.classList.add("cur-down"));
  addEventListener("mouseup", () => html.classList.remove("cur-down"));

  // Hide when the mouse leaves the window
  document.addEventListener("mouseleave", () => { html.classList.remove("cur-on"); visible = false; });
  document.addEventListener("mouseout", (e) => { if (!e.relatedTarget) { html.classList.remove("cur-on"); visible = false; } });

  // Content added later (galleries, pop-ups) is covered automatically,
  // because hover is detected from whatever element is under the mouse.
})();
