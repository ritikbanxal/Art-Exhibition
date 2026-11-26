// =========================================================
// Shared layout for every page: navbar, search, footer, back-to-top.
// Site name, email, links and the Google Form link are edited in the
// admin panel (Settings) → saved to data/site.json → loaded by
// /site-config.js before this file. These are only fallbacks.
// =========================================================
window.SITE = Object.assign(
  {
    name: "The Living Canvas",
    tagline: "",
    email: "",
    location: "",
    instagram: "#",
    youtube: "#",
    submissionForm: "",
  },
  window.SITE || {}
);
// Escape admin-entered text before putting it into HTML
const escHTML = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SITE = Object.fromEntries(Object.entries(window.SITE).map(([k, v]) => [k, escHTML(v)]));

// ---------- Navbar + search overlay ----------
const headerHTML = `
  <nav class="navbar" id="navbar">
    <a href="/" class="logo"><span class="logo-text">${SITE.name}</span></a>
    <button class="menu-toggle" id="menuToggle" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-links" id="navLinks">
      <li><a href="/exhibition" data-current-year-link>Current Exhibition</a></li>
      <li class="has-dropdown">
        <a href="/archive">Exhibition Archive <span class="caret">&#8964;</span></a>
        <!-- Filled automatically: previous year + "Pre-<previous year>" (see below) -->
        <ul class="dropdown" data-year-menu></ul>
      </li>
      <li><a href="/about">About</a></li>
      <li><a href="/media">Media Coverage</a></li>
      <li><a href="/faq">FAQ</a></li>
      <li><a href="/contact">Contact</a></li>
      <li><button class="search-btn" id="searchBtn" aria-label="Search">&#9906;</button></li>
    </ul>
  </nav>
  <div class="search-overlay" id="searchOverlay">
    <button class="search-close" id="searchClose" aria-label="Close search">&times;</button>
    <input type="search" placeholder="Type and hit enter..." />
  </div>`;

// ---------- Footer ----------
const icon = {
  instagram: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.1V8.9l5.8 3.1-5.8 3.1z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
};

const footerHTML = `
  <footer class="site-footer">
    <div class="footer-top">
      <div class="f-brand">
        <a href="/" class="f-logo">${SITE.name}</a>
        <p>${SITE.tagline}</p>
        <div class="f-social">
          <a href="${SITE.instagram}" aria-label="Instagram">${icon.instagram}</a>
          <a href="${SITE.youtube}" aria-label="YouTube">${icon.youtube}</a>
          <a href="mailto:${SITE.email}" aria-label="Email">${icon.mail}</a>
        </div>
      </div>

      <div class="f-col">
        <h4>Explore</h4>
        <ul>
          <li><a href="/exhibition" data-current-year-link>Current Exhibition</a></li>
          <li><a href="/archive">Exhibition Archive</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </div>

      <div class="f-col">
        <h4>Information</h4>
        <ul>
          <li><a href="/media">Media Coverage</a></li>
          <li><a href="/faq">FAQ</a></li>
          <li><a href="/contact#submit">Submit Artwork</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>

      <div class="f-col">
        <h4>Visit</h4>
        <ul>
          <li>${SITE.location}</li>
          <li><a href="mailto:${SITE.email}">${SITE.email}</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <span>&copy; ${new Date().getFullYear()} ${SITE.name}. All rights reserved.</span>
      <span>${SITE.location}</span>
    </div>
  </footer>
  <button class="to-top" id="toTop" aria-label="Back to top">&#8963;</button>`;

// Put the header/footer into the page placeholders
document.getElementById("site-header")?.insertAdjacentHTML("afterend", headerHTML);
document.getElementById("site-header")?.remove();
document.getElementById("site-footer")?.insertAdjacentHTML("afterend", footerHTML);
document.getElementById("site-footer")?.remove();

// Fill site details anywhere on the page (name, email, links) + the browser tab title.
// These set text/attributes directly, so they use the raw (unescaped) values.
const RAW = window.SITE;
const fill = (sel, fn) => document.querySelectorAll(sel).forEach(fn);
fill("[data-site-name]", (el) => (el.textContent = RAW.name));
fill("[data-site-email]", (el) => (el.textContent = RAW.email));
fill("[data-site-email-link]", (el) => (el.href = `mailto:${RAW.email}`));
fill("[data-site-location]", (el) => (el.textContent = RAW.location));
fill("[data-site-instagram]", (el) => (el.href = RAW.instagram || "#"));
fill("[data-site-youtube]", (el) => (el.href = RAW.youtube || "#"));
fill("[data-submit-link]", (el) => {
  if (RAW.submissionForm) {
    el.href = RAW.submissionForm;
  } else {
    el.textContent = "Submissions Opening Soon";
    el.classList.add("is-disabled");
    el.removeAttribute("href");
  }
});
if (!RAW.submissionForm) fill("[data-submit-note]", (el) => (el.textContent = `Questions? Email ${RAW.email}`));
document.title = document.title.replace(/The Living Canvas/g, RAW.name);

// ---------- Menu: newest year on its own, archive dropdown for the rest ----------
//   2025 Exhibition  |  Exhibition Archive ▾  → 2024 Exhibition
//                                             → Pre-2024   (all older years)
fetch("/api/years")
  .then((r) => r.json())
  .then((years) => {
    const [, previous, ...older] = years;
    const items = [];
    if (previous) items.push(`<li><a href="/exhibition?year=${previous}">${previous} Exhibition</a></li>`);
    if (older.length) items.push(`<li><a href="/archive?before=${previous}">Pre-${previous}</a></li>`);
    document.querySelectorAll("[data-year-menu]").forEach((menu) => {
      menu.innerHTML = items.join("");
      menu.closest(".has-dropdown")?.classList.toggle("no-items", !items.length);
    });
    if (years.length) {
      document.querySelectorAll("[data-current-year-link]").forEach((a) => {
        a.href = `/exhibition?year=${years[0]}`;
        a.textContent = `${years[0]} Exhibition`;
      });
    }
  })
  .catch(() => {});

// ---------- Navbar turns white + back-to-top button after scrolling ----------
const navbar = document.getElementById("navbar");
const toTop = document.getElementById("toTop");

function onScroll() {
  const y = window.scrollY;
  navbar.classList.toggle("scrolled", y > 80);
  toTop.classList.toggle("show", y > 400);
}
window.addEventListener("scroll", onScroll);
onScroll();

const scrollUp = (e) => { e?.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); };
toTop.addEventListener("click", scrollUp);
document.querySelector("[data-to-top]")?.addEventListener("click", scrollUp);

// ---------- Fade-up on scroll for any .reveal element ----------
document.documentElement.classList.add("js");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      revealObserver.unobserve(en.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);
// Call again after a page adds new .reveal elements
window.revealAll = () =>
  document.querySelectorAll(".reveal:not(.in)").forEach((el) => revealObserver.observe(el));
window.revealAll();

// ---------- Mobile hamburger menu ----------
document.getElementById("menuToggle").addEventListener("click", () =>
  document.getElementById("navLinks").classList.toggle("open")
);

// ---------- Search overlay ----------
const searchOverlay = document.getElementById("searchOverlay");
document.getElementById("searchBtn").addEventListener("click", () => {
  searchOverlay.classList.add("open");
  searchOverlay.querySelector("input").focus();
});
document.getElementById("searchClose").addEventListener("click", () => searchOverlay.classList.remove("open"));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") searchOverlay.classList.remove("open");
});
