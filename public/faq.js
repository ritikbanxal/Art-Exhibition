// =========================================================
// FAQ page: builds the accordion from /api/faq (data/faq.json),
// plus search, topic menu, expand-all and deep links (#q-...)
// =========================================================
const $ = (id) => document.getElementById(id);

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const pad = (n) => String(n).padStart(2, "0");

// Answer text → paragraphs. "Contact page" becomes a link.
function answerHTML(text, term = "") {
  return text
    .split(/\n\s*\n/)
    .map((p) => `<p>${highlight(esc(p), term).replace(/Contact page/g, '<a href="/contact">Contact page</a>')}</p>`)
    .join("");
}
function highlight(html, term) {
  if (!term) return html;
  const re = new RegExp(`(${esc(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return html.replace(re, "<mark>$1</mark>");
}

let groups = [];
let total = 0;

async function load() {
  groups = await fetch("/api/faq").then((r) => r.json());
  total = groups.reduce((n, g) => n + g.items.length, 0);
  render();

  // Open the question in the URL (#q-...) or the very first one
  const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (target && target.classList.contains("faq-item")) {
    setOpen(target, true);
    setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  } else {
    const first = document.querySelector(".faq-item");
    if (first) setOpen(first, true);
  }
  watchActiveGroup();
}

function render(term = "") {
  const t = term.trim().toLowerCase();
  let shown = 0;

  $("faqList").innerHTML = groups
    .map((g, gi) => {
      const items = g.items.filter((it) => !t || (it.q + " " + it.a).toLowerCase().includes(t));
      shown += items.length;
      g._visible = items.length;
      if (!items.length) return "";
      return `
        <section class="faq-group" id="cat-${slug(g.category)}">
          <div class="faq-group-head">
            <span class="faq-group-num">${pad(gi + 1)}</span>
            <h2>${esc(g.category)}</h2>
          </div>
          ${items
            .map((it) => {
              const id = "q-" + slug(it.q);
              return `
              <div class="faq-item${t ? " open" : ""}" id="${id}">
                <button class="faq-q" aria-expanded="${t ? "true" : "false"}" aria-controls="${id}-a">
                  <span>${highlight(esc(it.q), term.trim())}</span>
                  <span class="faq-icon" aria-hidden="true"></span>
                </button>
                <div class="faq-a" id="${id}-a" role="region">
                  <div class="faq-a-inner"><div>${answerHTML(it.a, term.trim())}</div></div>
                </div>
              </div>`;
            })
            .join("")}
        </section>`;
    })
    .join("");

  // Topic menu with counts
  $("faqCats").innerHTML = groups
    .map(
      (g) => `<a href="#cat-${slug(g.category)}" class="${g._visible ? "" : "is-empty"}">
                ${esc(g.category)} <span class="count">${g._visible}</span>
              </a>`
    )
    .join("");

  $("faqCount").textContent = t
    ? `${shown} of ${total} questions match`
    : `${total} questions`;
  $("faqEmpty").hidden = shown > 0;
  $("faqEmpty").textContent = `No questions match “${term.trim()}”. Try another word, or email us.`;
  updateToggleLabel();
  watchActiveGroup();
}

// ---------- open / close ----------
function setOpen(item, open) {
  item.classList.toggle("open", open);
  item.querySelector(".faq-q").setAttribute("aria-expanded", String(open));
}

$("faqList").addEventListener("click", (e) => {
  const btn = e.target.closest(".faq-q");
  if (!btn) return;
  const item = btn.closest(".faq-item");
  setOpen(item, !item.classList.contains("open"));
  history.replaceState(null, "", item.classList.contains("open") ? `#${item.id}` : location.pathname);
  updateToggleLabel();
});

function updateToggleLabel() {
  const items = [...document.querySelectorAll(".faq-item")];
  const allOpen = items.length && items.every((i) => i.classList.contains("open"));
  $("toggleAll").textContent = allOpen ? "Collapse all" : "Expand all";
}
$("toggleAll").addEventListener("click", () => {
  const items = [...document.querySelectorAll(".faq-item")];
  const open = !items.every((i) => i.classList.contains("open"));
  items.forEach((i) => setOpen(i, open));
  updateToggleLabel();
});

// ---------- search ----------
let searchTimer;
$("faqSearch").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => render(e.target.value), 120);
});

// ---------- highlight the topic you're reading ----------
let observer;
function watchActiveGroup() {
  observer?.disconnect();
  const links = [...document.querySelectorAll(".faq-cats a")];
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${en.target.id}`));
      });
    },
    { rootMargin: "-120px 0px -65% 0px" }
  );
  document.querySelectorAll(".faq-group").forEach((g) => observer.observe(g));
}

load();
