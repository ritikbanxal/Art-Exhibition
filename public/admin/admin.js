// =========================================================
// Admin panel
//   • Login (password from .env)
//   • Sections: Dashboard, Artworks, Exhibition Years, Media,
//     FAQ, About page, Settings
//   • Every editor is built from a small "fields" description
//     (see renderForm) so adding a field = adding one line.
// =========================================================
"use strict";

const $ = (s, root = document) => root.querySelector(s);
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = (p = "id") => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clone = (v) => JSON.parse(JSON.stringify(v));
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

// Tiny element builder: h("div", {class: "x", onclick: fn}, child, "text")
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

const ICON = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  play: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z" fill="#fff"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
};
const iconBtn = (icon, title, onclick, extra = "") =>
  h("button", { type: "button", class: `icon-btn ${extra}`, title, "aria-label": title, html: ICON[icon], onclick });

// YouTube cover image when a video has no image
function ytThumb(url = "") {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
}
const coverOf = (a) => a.image || (a.type === "video" ? ytThumb(a.videoUrl) : "");

// =========================================================
// API
// =========================================================
async function api(url, { method = "GET", json } = {}) {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: { "X-Admin-Request": "1", ...(json !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.endsWith("/login")) {
    showLogin();
    throw new Error("Your session ended. Please sign in again.");
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
const load = (name) => api(`/api/admin/data/${name}`);
const save = (name, value) => api(`/api/admin/data/${name}`, { method: "PUT", json: value });

function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.setRequestHeader("X-Admin-Request", "1");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let d = {};
      try { d = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status === 401) { showLogin(); return reject(new Error("Please sign in again.")); }
      xhr.status < 300 ? resolve(d) : reject(new Error(d.error || "Upload failed."));
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your connection."));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

// =========================================================
// Toasts + confirm dialog
// =========================================================
function toast(msg, type = "ok") {
  const t = h("div", { class: `toast ${type === "error" ? "error" : ""}`, html: type === "error" ? ICON.alert : ICON.check });
  t.append(msg);
  $("#toasts").append(t);
  setTimeout(() => t.remove(), type === "error" ? 6000 : 3000);
}

function confirmDialog(text, yes = "Delete") {
  return new Promise((resolve) => {
    $("#confirmText").textContent = text;
    $("#confirmYes").textContent = yes;
    $("#confirm").hidden = false;
    $("#confirmYes").focus();
    const done = (v) => {
      $("#confirm").hidden = true;
      $("#confirmYes").onclick = $("#confirmNo").onclick = null;
      resolve(v);
    };
    $("#confirmYes").onclick = () => done(true);
    $("#confirmNo").onclick = () => done(false);
  });
}

// =========================================================
// Form builder
//
// A field is { key, label, type, ... }. Types:
//   text | url | email | number | textarea | select | checkbox
//   image       → upload with preview (stores "/uploads/…")
//   paragraphs  → textarea ⇄ array of paragraphs (blank line = new one)
//   lines       → textarea ⇄ array of lines
//   group       → nested object  (fields: [...])
//   list        → repeatable items (fields: [...], itemLabel, newItem)
// Options: required, half, help, placeholder, showIf(obj), rerender, tall,
//          suggestions (datalist), checkLabel
// =========================================================
let fieldSeq = 0;

function renderForm(fields, obj, onChange) {
  const form = h("div", { class: "form" });
  const draw = () =>
    form.replaceChildren(
      ...fields
        .filter((f) => !f.showIf || f.showIf(obj))
        .map((f) => renderField(f, obj, () => { onChange?.(); if (f.rerender) draw(); }))
    );
  draw();
  return form;
}

function wrapField(f, control, id) {
  return h(
    "div",
    { class: `f${f.half ? " half" : ""}`, "data-key": f.key },
    f.label && f.type !== "checkbox"
      ? h("label", { class: "f-label", for: id, html: `${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ""}` })
      : null,
    control,
    f.help ? h("span", { class: "f-help" }, f.help) : null
  );
}

function renderField(f, obj, changed) {
  const id = `f${++fieldSeq}`;
  const v = obj[f.key];

  switch (f.type) {
    case "textarea":
    case "paragraphs":
    case "lines": {
      const toText = f.type === "paragraphs" ? (a) => (a || []).join("\n\n") : f.type === "lines" ? (a) => (a || []).join("\n") : (s) => s ?? "";
      const el = h("textarea", { id, class: f.tall ? "tall" : "", placeholder: f.placeholder || "" });
      el.value = toText(v);
      el.addEventListener("input", () => {
        const t = el.value;
        obj[f.key] =
          f.type === "paragraphs" ? t.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
          : f.type === "lines" ? t.split("\n").map((s) => s.trim()).filter(Boolean)
          : t;
        changed();
      });
      return wrapField(f, el, id);
    }

    case "select": {
      const el = h("select", { id }, ...f.options.map(([val, label]) => h("option", { value: val }, label)));
      el.value = v ?? f.options[0][0];
      if (v == null) obj[f.key] = el.value;
      el.addEventListener("change", () => { obj[f.key] = el.value; changed(); });
      return wrapField(f, el, id);
    }

    case "checkbox": {
      const el = h("input", { id, type: "checkbox" });
      el.checked = !!v;
      el.addEventListener("change", () => { obj[f.key] = el.checked; changed(); });
      return wrapField(
        f,
        h("label", { class: "check", for: id }, el, h("span", {}, h("b", {}, f.label), f.checkLabel ? h("span", { class: "f-help", style: "display:block;font-weight:400" }, f.checkLabel) : null)),
        id
      );
    }

    case "image":
      return wrapField(f, imageField(f, obj, changed), id);

    case "group": {
      if (!obj[f.key] || typeof obj[f.key] !== "object") obj[f.key] = {};
      return h("div", { class: "group" }, h("span", { class: "f-label" }, f.label), renderForm(f.fields, obj[f.key], changed));
    }

    case "list":
      return wrapField(f, listField(f, obj, changed), id);

    default: {
      const el = h("input", {
        id,
        type: f.type || "text",
        placeholder: f.placeholder || "",
        list: f.suggestions ? `${id}-dl` : null,
      });
      el.value = v ?? "";
      el.addEventListener("input", () => {
        obj[f.key] = f.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value;
        changed();
      });
      const dl = f.suggestions ? h("datalist", { id: `${id}-dl` }, ...f.suggestions.map((s) => h("option", { value: s }))) : null;
      return wrapField(f, h("div", {}, el, dl), id);
    }
  }
}

// ---------- Image upload field ----------
function imageField(f, obj, changed) {
  const prev = h("div", { class: "img-prev" });
  const name = h("small");
  const bar = h("i");
  const progress = h("div", { class: "progress", hidden: true }, bar);
  const file = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", hidden: true });
  const upBtn = h("button", { type: "button", class: "btn btn-ghost btn-sm" });
  const rmBtn = h("button", { type: "button", class: "btn btn-danger-ghost btn-sm" }, "Remove");

  const show = () => {
    const url = obj[f.key];
    prev.style.backgroundImage = url ? `url("${url.replace(/"/g, "%22")}")` : "";
    prev.innerHTML = url ? "" : ICON.image;
    name.textContent = url ? url.split("/").pop() : "No image yet — click Upload or drag one here";
    upBtn.textContent = url ? "Replace image" : "Upload image";
    rmBtn.hidden = !url;
  };

  async function send(f0) {
    if (!f0) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f0.type)) return toast("Please choose a JPG, PNG, WebP or GIF image.", "error");
    if (f0.size > 20 * 1024 * 1024) return toast("That image is over 20 MB. Please use a smaller file.", "error");
    progress.hidden = false;
    bar.style.width = "0%";
    upBtn.disabled = true;
    try {
      const { url } = await uploadFile(f0, (p) => (bar.style.width = `${Math.round(p * 100)}%`));
      obj[f.key] = url;
      show();
      changed();
      toast("Image uploaded");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      progress.hidden = true;
      upBtn.disabled = false;
      file.value = "";
    }
  }

  upBtn.addEventListener("click", () => file.click());
  file.addEventListener("change", () => send(file.files[0]));
  rmBtn.addEventListener("click", () => { obj[f.key] = ""; show(); changed(); });

  const box = h("div", { class: "img-field" }, prev, h("div", { class: "img-side" }, name, progress, h("div", { class: "btns" }, upBtn, rmBtn)), file);
  box.addEventListener("dragover", (e) => { e.preventDefault(); box.classList.add("drag"); });
  box.addEventListener("dragleave", () => box.classList.remove("drag"));
  box.addEventListener("drop", (e) => { e.preventDefault(); box.classList.remove("drag"); send(e.dataTransfer.files[0]); });
  show();
  return box;
}

// ---------- Repeatable list field ----------
function listField(f, obj, changed) {
  if (!Array.isArray(obj[f.key])) obj[f.key] = [];
  const arr = obj[f.key];
  const wrap = h("div", { class: "list-field" });
  const collapsedByDefault = f.collapsible && arr.length > 3;
  const open = new WeakSet(); // items the user expanded

  const draw = (focusLast = false) => {
    wrap.replaceChildren();
    arr.forEach((item, i) => {
      const title = h("b");
      const setTitle = () => (title.innerHTML = `<span class="num">${i + 1}.</span>${esc(f.itemLabel?.(item) || f.itemName || "Item")}`);
      setTitle();
      const move = (d) => { [arr[i], arr[i + d]] = [arr[i + d], arr[i]]; changed(); draw(); };
      const li = h("div", { class: "list-item" });
      const head = h(
        "div",
        { class: "list-item-head" },
        title,
        iconBtn("up", "Move up", () => move(-1), ""),
        iconBtn("down", "Move down", () => move(1), ""),
        iconBtn("trash", `Remove ${(f.itemName || "item").toLowerCase()}`, async () => {
          if (await confirmDialog(`Remove this ${(f.itemName || "item").toLowerCase()}?`, "Remove")) {
            arr.splice(i, 1);
            changed();
            draw();
          }
        }, "danger")
      );
      head.children[1].disabled = i === 0;
      head.children[2].disabled = i === arr.length - 1;
      if (f.collapsible) {
        head.style.cursor = "pointer";
        title.addEventListener("click", () => {
          li.classList.toggle("collapsed");
          li.classList.contains("collapsed") ? open.delete(item) : open.add(item);
        });
        if (collapsedByDefault && !open.has(item) && !(focusLast && i === arr.length - 1)) li.classList.add("collapsed");
      }
      li.append(head, h("div", { class: "list-item-body" }, renderForm(f.fields, item, () => { setTitle(); changed(); })));
      wrap.append(li);
    });
    wrap.append(
      h("button", {
        type: "button",
        class: "add-btn",
        html: `${ICON.plus} ${esc(f.addLabel || "Add")}`,
        onclick: () => {
          const item = f.newItem ? f.newItem() : {};
          arr.push(item);
          open.add(item);
          changed();
          draw(true);
          wrap.querySelectorAll(".list-item")[arr.length - 1]?.querySelector("input,textarea")?.focus();
        },
      })
    );
  };
  draw();
  return wrap;
}

// Check required fields; returns true if OK (and highlights problems)
function checkRequired(fields, obj, root) {
  let ok = true;
  for (const f of fields) {
    if (f.showIf && !f.showIf(obj)) continue;
    const empty = obj[f.key] == null || String(obj[f.key]).trim() === "";
    const el = root.querySelector(`.f[data-key="${f.key}"]`);
    el?.classList.toggle("invalid", !!(f.required && empty));
    if (f.required && empty) {
      if (ok) el?.querySelector("input,textarea,select")?.focus();
      ok = false;
    }
  }
  return ok;
}

// =========================================================
// Edit drawer (used for single items: artwork, year, press entry)
// =========================================================
let drawerState = null;

function openDrawer({ title, fields, value, onSave, onDelete, validate }) {
  const draft = clone(value);
  let dirty = false;
  $("#drawerTitle").textContent = title;
  $("#drawerBody").replaceChildren(renderForm(fields, draft, () => (dirty = true)));
  $("#drawerDelete").hidden = !onDelete;
  $("#drawer").classList.add("open");
  $("#drawer").setAttribute("aria-hidden", "false");
  setTimeout(() => $("#drawerBody").querySelector("input,textarea")?.focus(), 250);

  drawerState = {
    isDirty: () => dirty,
    async save() {
      if (!checkRequired(fields, draft, $("#drawerBody"))) return toast("Please fill in the required fields.", "error");
      const problem = validate?.(draft);
      if (problem) return toast(problem, "error");
      $("#drawerSave").disabled = true;
      try {
        await onSave(draft);
        dirty = false;
        closeDrawer(true);
      } catch (e) {
        toast(e.message, "error");
      } finally {
        $("#drawerSave").disabled = false;
      }
    },
    async remove() {
      if (!(await confirmDialog("Delete this permanently? This can't be undone from here."))) return;
      try {
        await onDelete();
        dirty = false;
        closeDrawer(true);
      } catch (e) {
        toast(e.message, "error");
      }
    },
  };
}

async function closeDrawer(force = false) {
  if (!force && drawerState?.isDirty() && !(await confirmDialog("Discard your unsaved changes?", "Discard"))) return;
  $("#drawer").classList.remove("open");
  $("#drawer").setAttribute("aria-hidden", "true");
  drawerState = null;
  // "#artworks/new" → "#artworks" so a refresh doesn't reopen the form
  const [section, param] = location.hash.slice(1).split("/");
  if (param) {
    currentHash = section;
    history.replaceState(null, "", `#${section}`);
  }
}

$("#drawerSave").addEventListener("click", () => drawerState?.save());
$("#drawerDelete").addEventListener("click", () => drawerState?.remove());
$("#drawer").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeDrawer(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && drawerState && $("#confirm").hidden) closeDrawer();
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    if (drawerState) drawerState.save();
    else docSave?.();
  }
});

// =========================================================
// Page frame helpers
// =========================================================
function setPage(title, sub = "", ...actions) {
  $("#pageTitle").textContent = title;
  $("#pageSub").textContent = sub;
  $("#topActions").replaceChildren(...actions);
  document.title = `${title} · Admin`;
}
const primaryBtn = (label, onclick) => h("button", { class: "btn btn-primary", html: `${ICON.plus} ${esc(label)}`, onclick });
const searchBox = (placeholder, oninput) =>
  h("label", { class: "search", html: ICON.search }, h("input", { type: "search", placeholder, oninput: (e) => oninput(e.target.value) }));

// =========================================================
// FIELD DEFINITIONS
// =========================================================
const AWARDS = ["Jury Award", "People's Choice", "Honorable Mention", "Director's Award"];

const ARTWORK_FIELDS = [
  { key: "title", label: "Title", required: true },
  { key: "artists", label: "Artist(s)", half: true, help: "Separate several names with commas" },
  { key: "department", label: "Department / field", half: true },
  { key: "year", label: "Exhibition year", type: "number", required: true, half: true },
  { key: "award", label: "Award", half: true, suggestions: AWARDS, help: "Leave empty for finalists" },
  { key: "type", label: "Type", type: "select", half: true, rerender: true, options: [["image", "Still image"], ["video", "Video / animation"]] },
  { key: "videoUrl", label: "Video link", type: "url", half: true, placeholder: "https://www.youtube.com/watch?v=…", help: "YouTube or Vimeo", showIf: (o) => o.type === "video" },
  { key: "image", label: "Image", type: "image", help: "JPG, PNG or WebP, up to 20 MB. For videos this is the cover (optional for YouTube — its thumbnail is used)." },
  { key: "description", label: "Description", type: "textarea", tall: true, help: "Shown in the artwork pop-up. Leave a blank line between paragraphs." },
];

const EXHIBITION_FIELDS = [
  { key: "year", label: "Year", type: "number", required: true, half: true },
  { key: "dates", label: "Dates", half: true, placeholder: "May 8, 2025 – June 2026" },
  { key: "subtitle", label: "Banner subtitle", placeholder: "An exhibition featuring science-based… artworks" },
  { key: "cover", label: "Cover image", type: "image", help: "Shown behind the banner and intro. If empty, the first artwork is used." },
  { key: "intro", label: "Intro text", type: "paragraphs", help: "Shown on the dark band under the banner. Blank line = new paragraph." },
  {
    key: "venue", label: "Venue", type: "group",
    fields: [
      { key: "name", label: "Venue name", half: true, placeholder: "Main Atrium, Your Venue" },
      { key: "address", label: "Address", half: true },
      { key: "mapUrl", label: "Map link", type: "url", placeholder: "https://maps.google.com/…" },
    ],
  },
  { key: "hours", label: "Opening hours", placeholder: "Open daily, 9am – 6pm · Free entry" },
  { key: "essayTitle", label: "Essay heading", half: true, placeholder: "Exhibition text" },
  { key: "essay", label: "Exhibition text (essay)", type: "paragraphs", tall: true, help: "Blank line = new paragraph." },
];

const MEDIA_TYPES = [["article", "Article"], ["video", "Video"], ["audio", "Audio / radio"], ["pdf", "PDF"]];
const MEDIA_FIELDS = [
  { key: "outlet", label: "Outlet / publication", required: true, half: true, placeholder: "e.g. Science Weekly" },
  { key: "year", label: "Year", type: "number", required: true, half: true },
  { key: "title", label: "Headline" },
  { key: "url", label: "Link", type: "url", placeholder: "https://…" },
  { key: "type", label: "Type", type: "select", half: true, options: MEDIA_TYPES },
  { key: "featured", label: "Feature as a quote", type: "checkbox", rerender: true, checkLabel: "Show a quote card at the top of the Media page (the first one also appears on the homepage)" },
  { key: "quote", label: "Pull quote", type: "textarea", showIf: (o) => o.featured, placeholder: "A short quote from the article" },
];

const FAQ_FIELDS = [
  {
    key: "categories", label: "Topics", type: "list", itemName: "Topic", addLabel: "Add topic",
    itemLabel: (c) => c.category, newItem: () => ({ category: "", items: [] }),
    fields: [
      { key: "category", label: "Topic name", placeholder: "e.g. Submitting" },
      {
        key: "items", label: "Questions", type: "list", itemName: "Question", addLabel: "Add question", collapsible: true,
        itemLabel: (q) => q.q, newItem: () => ({ q: "", a: "" }),
        fields: [
          { key: "q", label: "Question" },
          { key: "a", label: "Answer", type: "textarea", help: 'Blank line = new paragraph. The words "Contact page" become a link.' },
        ],
      },
    ],
  },
];

const ABOUT_SECTIONS = [
  {
    title: "Mission", sub: "The large headline and text at the top of the About page.",
    fields: [{
      key: "mission", type: "group", label: "",
      fields: [
        { key: "eyebrow", label: "Small heading", half: true, placeholder: "Our mission" },
        { key: "headline", label: "Headline" },
        { key: "paragraphs", label: "Text", type: "paragraphs", tall: true, help: "Blank line = new paragraph. The first paragraph is shown larger." },
      ],
    }],
  },
  {
    title: "Numbers", sub: "Exhibitions, artworks and creators are counted automatically from your artworks.",
    fields: [{ key: "founded", label: "Year founded", type: "number", half: true, help: 'Used for "Years running".' }],
  },
  {
    title: "What we look for",
    fields: [{
      key: "pillars", label: "", type: "list", itemName: "Card", addLabel: "Add card", itemLabel: (p) => p.title, newItem: () => ({ title: "", text: "" }),
      fields: [{ key: "title", label: "Title" }, { key: "text", label: "Text", type: "textarea" }],
    }],
  },
  { title: "Statement", sub: "The large quote on the purple band.", fields: [{ key: "statement", label: "", type: "textarea" }] },
  {
    title: "Our story (timeline)",
    fields: [{
      key: "timeline", label: "", type: "list", itemName: "Milestone", addLabel: "Add milestone", itemLabel: (t) => [t.year, t.title].filter(Boolean).join(" — "),
      newItem: () => ({ year: "", title: "", text: "" }),
      fields: [{ key: "year", label: "Year", half: true }, { key: "title", label: "Title", half: true }, { key: "text", label: "Text", type: "textarea" }],
    }],
  },
  {
    title: "Organizers",
    fields: [{
      key: "organizers", label: "", type: "list", itemName: "Person", addLabel: "Add organizer", itemLabel: (p) => p.name, newItem: () => ({ name: "", role: "", photo: "" }),
      fields: [{ key: "name", label: "Name", half: true }, { key: "role", label: "Role", half: true }, { key: "photo", label: "Photo (optional)", type: "image", help: "Square photos work best. Without a photo, initials are shown." }],
    }],
  },
  { title: "Sponsors", fields: [{ key: "sponsors", label: "Sponsor names", type: "lines", tall: true, help: "One sponsor per line." }] },
  {
    title: "Special thanks",
    fields: [{
      key: "thanks", label: "", type: "list", itemName: "Person", addLabel: "Add person", itemLabel: (p) => p.name, newItem: () => ({ name: "", role: "" }),
      fields: [{ key: "name", label: "Name", half: true }, { key: "role", label: "For", half: true }],
    }],
  },
  {
    title: "Site credits",
    fields: [{
      key: "credits", label: "", type: "list", itemName: "Credit", addLabel: "Add credit", itemLabel: (p) => p.name, newItem: () => ({ name: "", role: "" }),
      fields: [{ key: "name", label: "Name", half: true }, { key: "role", label: "Role", half: true }],
    }],
  },
];

const SITE_SECTIONS = [
  {
    title: "General",
    fields: [
      { key: "name", label: "Site name", required: true, help: "Shown in the logo, footer and browser tab." },
      { key: "tagline", label: "Tagline", help: "Shown in the footer." },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "email", label: "Contact email", type: "email", half: true },
      { key: "location", label: "Venue / city", half: true },
    ],
  },
  {
    title: "Submissions",
    fields: [{ key: "submissionForm", label: "Google Form link", type: "url", placeholder: "https://forms.gle/…", help: 'The "Submit artwork" buttons open this link. Leave empty to show "Submissions opening soon".' }],
  },
  {
    title: "Social links",
    fields: [
      { key: "instagram", label: "Instagram", type: "url", half: true, placeholder: "https://instagram.com/…" },
      { key: "youtube", label: "YouTube", type: "url", half: true, placeholder: "https://youtube.com/@…" },
    ],
  },
  {
    title: "Intro animation",
    sub: "The opening animation shown the first time someone visits. Images flash in the frame in this order, and the LAST one grows to fill the screen — so make the last one your strongest image. 3–6 images work best; portrait or square images look cleanest in the frame. Leave empty to use your artworks.",
    fields: [
      {
        key: "introImages", label: "Intro images", type: "list", itemName: "Image", addLabel: "Add image",
        itemLabel: (x) => (x.image ? x.image.split("/").pop() : "No image yet"),
        newItem: () => ({ image: "" }),
        fields: [{ key: "image", label: "", type: "image" }],
      },
      { key: "introCaption", label: "Caption under the frame", placeholder: "Art · Science · Exhibition" },
    ],
  },
];

// =========================================================
// SECTIONS
// =========================================================
let docSave = null;     // save function of the open document editor (for Ctrl+S)
let leaveGuard = null;  // returns true if there are unsaved changes

// ---------- Dashboard ----------
async function showDashboard() {
  setPage("Dashboard", "Overview of your website");
  const [art, years, media, faq, site] = await Promise.all([load("artworks"), load("exhibitions"), load("media"), load("faq"), load("site")]);
  const allYears = [...new Set([...art.map((a) => a.year), ...years.map((y) => y.year)])].sort((a, b) => b - a);
  const questions = faq.reduce((n, c) => n + (c.items?.length || 0), 0);
  const noDesc = art.filter((a) => !String(a.description || "").trim() || /^Replace this/.test(a.description)).length;
  const noIntro = allYears.filter((y) => !years.find((e) => e.year === y)?.intro?.length);

  const stat = (n, label, href) => h("a", { class: "stat", href }, h("b", {}, String(n)), h("span", {}, label));
  const recent = [...art].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5);
  const check = (ok, html) => h("li", {}, h("span", { class: `dot ${ok ? "ok" : "todo"}`, html: ok ? ICON.check : ICON.alert }), h("span", { html }));

  $("#content").replaceChildren(
    h("div", { class: "stats" },
      stat(art.length, "Artworks", "#artworks"),
      stat(allYears.length, "Exhibition years", "#exhibitions"),
      stat(media.length, "Press features", "#media"),
      stat(questions, "FAQ questions", "#faq")),
    h("div", { class: "panel" },
      h("h3", {}, "Quick actions"),
      h("p", { class: "panel-sub" }, "Common tasks"),
      h("div", { class: "quick" },
        h("a", { class: "btn btn-primary", href: "#artworks/new", html: `${ICON.plus} Add artwork` }),
        h("a", { class: "btn btn-ghost", href: "#exhibitions/new", html: `${ICON.plus} Add exhibition year` }),
        h("a", { class: "btn btn-ghost", href: "#media/new", html: `${ICON.plus} Add press feature` }),
        h("a", { class: "btn btn-ghost", href: "/", target: "_blank", html: `${ICON.ext} View website` }))),
    h("div", { class: "dash-cols" },
      h("div", { class: "panel" },
        h("h3", {}, "Recently added artworks"),
        h("p", { class: "panel-sub" }, "Click one to edit it"),
        recent.length
          ? h("ul", { class: "recent" }, ...recent.map((a) =>
              h("li", { style: "cursor:pointer", onclick: () => (location.hash = `#artworks/${a.id}`) },
                coverOf(a) ? h("img", { src: coverOf(a), alt: "" }) : h("span", { class: "ph" }),
                h("div", {}, h("b", {}, a.title), h("small", {}, `${a.artists || "—"} · ${a.year}`)))))
          : h("p", { class: "panel-sub" }, "No artworks yet.")),
      h("div", { class: "panel" },
        h("h3", {}, "Checklist"),
        h("p", { class: "panel-sub" }, "Things worth finishing"),
        h("ul", { class: "checklist" },
          check(!!site.submissionForm, site.submissionForm ? "Google Form link is set" : 'Add your Google Form link in <a href="#site">Settings</a>'),
          check(!!site.email, site.email ? `Contact email: ${esc(site.email)}` : 'Add a contact email in <a href="#site">Settings</a>'),
          check(!noDesc, noDesc ? `${plural(noDesc, "artwork")} still need a description — <a href="#artworks">Artworks</a>` : "Every artwork has a description"),
          check(!noIntro.length, noIntro.length ? `Add intro text for ${noIntro.join(", ")} — <a href="#exhibitions">Exhibition years</a>` : "Every year has intro text"))))
  );
}

// ---------- Artworks ----------
async function showArtworks(param) {
  let list = await load("artworks");
  let q = "", year = "all", type = "all";

  const persist = async (msg) => { await save("artworks", list); toast(msg); };
  const newestYear = () => Math.max(new Date().getFullYear() - 1, ...list.map((a) => Number(a.year) || 0));

  const edit = (art) => {
    const isNew = !list.includes(art);
    openDrawer({
      title: isNew ? "Add artwork" : "Edit artwork",
      fields: ARTWORK_FIELDS,
      value: art,
      validate: (d) => (d.type === "image" && !d.image ? "Please upload an image." : d.type === "video" && !d.videoUrl && !d.image ? "Add a video link or a cover image." : null),
      onSave: async (d) => {
        d.year = Number(d.year);
        const next = isNew ? [...list, d] : list.map((a) => (a === art ? d : a));
        await save("artworks", next);
        list = next;
        toast(isNew ? "Artwork added" : "Artwork saved");
        draw();
      },
      onDelete: isNew ? null : async () => {
        const next = list.filter((a) => a !== art);
        await save("artworks", next);
        list = next;
        toast("Artwork deleted");
        draw();
      },
    });
  };
  const addNew = () =>
    edit({ id: uid("art"), title: "", artists: "", department: "", award: "", year: newestYear(), type: "image", image: "", videoUrl: "", description: "", order: list.length, createdAt: new Date().toISOString() });

  // Move an artwork earlier/later within its year
  const move = async (art, dir) => {
    const same = list.filter((a) => a.year === art.year).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const i = same.indexOf(art);
    const j = i + dir;
    if (j < 0 || j >= same.length) return;
    [same[i], same[j]] = [same[j], same[i]];
    same.forEach((a, k) => (a.order = k));
    draw();
    try { await persist("Order saved"); } catch (e) { toast(e.message, "error"); }
  };

  setPage("Artworks", "Everything shown in the exhibition galleries", primaryBtn("Add artwork", addNew));

  const yearSel = h("select", { onchange: (e) => { year = e.target.value; draw(); } });
  const typeSel = h("select", { onchange: (e) => { type = e.target.value; draw(); } },
    h("option", { value: "all" }, "All types"), h("option", { value: "image" }, "Still images"), h("option", { value: "video" }, "Videos"));
  const count = h("span", { class: "count" });
  const body = h("div");
  $("#content").replaceChildren(h("div", { class: "toolbar" }, searchBox("Search title, artist, award…", (v) => { q = v.toLowerCase(); draw(); }), yearSel, typeSel, count), body);

  function draw() {
    const years = [...new Set(list.map((a) => a.year))].sort((a, b) => b - a);
    yearSel.replaceChildren(h("option", { value: "all" }, "All years"), ...years.map((y) => h("option", { value: y }, y)));
    yearSel.value = years.map(String).includes(String(year)) ? year : "all";

    const shown = list.filter((a) =>
      (yearSel.value === "all" || String(a.year) === yearSel.value) &&
      (type === "all" || (a.type || "image") === type) &&
      (!q || [a.title, a.artists, a.award, a.department].join(" ").toLowerCase().includes(q)));
    count.textContent = `${shown.length} of ${plural(list.length, "artwork")}`;

    if (!list.length) {
      body.replaceChildren(h("div", { class: "empty" }, h("b", {}, "No artworks yet"), "Add your first artwork to start the gallery.", h("br"), primaryBtn("Add artwork", addNew)));
      return;
    }
    if (!shown.length) { body.replaceChildren(h("div", { class: "empty" }, h("b", {}, "Nothing matches"), "Try a different search or filter.")); return; }

    body.replaceChildren(...[...new Set(shown.map((a) => a.year))].sort((a, b) => b - a).flatMap((y) => {
      const items = shown.filter((a) => a.year === y).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return [
        h("div", { class: "year-head" }, h("h3", {}, String(y)), h("span", {}, plural(items.length, "work"))),
        h("div", { class: "art-grid" }, ...items.map((a, i) => {
          const cover = coverOf(a);
          return h("div", { class: "art-card" },
            h("div", { class: "art-thumb", onclick: () => edit(a) },
              cover ? h("img", { src: cover, alt: "", loading: "lazy" }) : null,
              a.type === "video" ? h("span", { class: "play", html: ICON.play }) : null,
              a.award ? h("span", { class: "badge" }, a.award) : null),
            h("div", { class: "art-body", onclick: () => edit(a) },
              h("b", {}, a.title || "Untitled"),
              h("small", {}, a.artists || "No artist yet")),
            h("div", { class: "art-actions" },
              h("span", { class: "yr" }, a.department || ""),
              (() => { const b = iconBtn("left", "Move earlier", () => move(a, -1)); b.disabled = i === 0; return b; })(),
              (() => { const b = iconBtn("right", "Move later", () => move(a, 1)); b.disabled = i === items.length - 1; return b; })(),
              iconBtn("edit", "Edit", () => edit(a)),
              iconBtn("trash", "Delete", async () => {
                if (!(await confirmDialog(`Delete "${a.title}"? This can't be undone from here.`))) return;
                const next = list.filter((x) => x !== a);
                try { await save("artworks", next); list = next; toast("Artwork deleted"); draw(); } catch (e) { toast(e.message, "error"); }
              }, "danger")));
        })),
      ];
    }));
  }
  draw();

  if (param === "new") addNew();
  else if (param) { const a = list.find((x) => x.id === param); if (a) edit(a); }
}

// ---------- Exhibition years ----------
async function showExhibitions(param) {
  let list = await load("exhibitions");
  const art = await load("artworks");

  const edit = (ex) => {
    const isNew = !list.includes(ex);
    openDrawer({
      title: isNew ? "Add exhibition year" : `Edit ${ex.year} exhibition`,
      fields: EXHIBITION_FIELDS,
      value: ex,
      validate: (d) => (list.some((e) => e !== ex && Number(e.year) === Number(d.year)) ? `There is already a ${d.year} exhibition.` : null),
      onSave: async (d) => {
        d.year = Number(d.year);
        const next = (isNew ? [...list, d] : list.map((e) => (e === ex ? d : e))).sort((a, b) => b.year - a.year);
        await save("exhibitions", next);
        list = next;
        toast(isNew ? `${d.year} exhibition added` : "Exhibition saved");
        draw();
      },
      onDelete: isNew ? null : async () => {
        const next = list.filter((e) => e !== ex);
        await save("exhibitions", next);
        list = next;
        toast("Exhibition text deleted (its artworks were kept)");
        draw();
      },
    });
  };
  const addNew = () => {
    const y = Math.max(new Date().getFullYear(), ...list.map((e) => Number(e.year) + 1 || 0));
    edit({ year: y, subtitle: "", cover: "", intro: [], venue: { name: "", address: "", mapUrl: "" }, dates: "", hours: "", essayTitle: "Exhibition text", essay: [] });
  };

  setPage("Exhibition Years", "Intro text, venue, dates and essay for each year's page", primaryBtn("Add exhibition year", addNew));
  const body = h("div");
  $("#content").replaceChildren(
    h("p", { class: "panel-sub", style: "margin-bottom:16px" }, "The newest year appears in the menu as the current exhibition. Artworks are added under Artworks."),
    body
  );

  // Years that have artworks but no page text yet
  const blank = (year) => ({ year, subtitle: "", cover: "", intro: [], venue: { name: "", address: "", mapUrl: "" }, dates: "", hours: "", essayTitle: "Exhibition text", essay: [] });

  function draw() {
    const missing = [...new Set(art.map((a) => Number(a.year)))]
      .filter((y) => y && !list.some((e) => Number(e.year) === y))
      .sort((a, b) => b - a);
    if (!list.length && !missing.length) { body.replaceChildren(h("div", { class: "empty" }, h("b", {}, "No exhibition years yet"), h("br"), primaryBtn("Add exhibition year", addNew))); return; }
    const missingRows = missing.map((y) =>
      h("div", { class: "row", onclick: () => edit(blank(y)) },
        h("span", { class: "lead" }, String(y)),
        h("div", {}, h("b", {}, `${y} Exhibition`), h("small", {}, "Has artworks, but no intro, venue or essay yet — click to add")),
        h("span", { class: "badge soft" }, "No page text yet"),
        iconBtn("plus", "Add page text", (ev) => { ev.stopPropagation(); edit(blank(y)); })));
    body.replaceChildren(h("div", { class: "rows" }, ...missingRows, ...list.map((e) => {
      const works = art.filter((a) => Number(a.year) === Number(e.year)).length;
      return h("div", { class: "row", onclick: () => edit(e) },
        h("span", { class: "lead" }, String(e.year)),
        h("div", {}, h("b", {}, `${e.year} Exhibition`), h("small", {}, [e.dates, e.venue?.name].filter(Boolean).join(" · ") || "No dates or venue yet")),
        h("span", { class: "badge grey" }, plural(works, "work")),
        h("div", { style: "display:flex;gap:2px" },
          h("a", { class: "icon-btn", href: `/exhibition?year=${e.year}`, target: "_blank", title: "View page", html: ICON.ext, onclick: (ev) => ev.stopPropagation() }),
          iconBtn("edit", "Edit", (ev) => { ev.stopPropagation(); edit(e); })));
    })));
  }
  draw();
  if (param === "new") addNew();
}

// ---------- Media coverage ----------
async function showMedia(param) {
  let list = await load("media");
  let q = "";

  const edit = (m) => {
    const isNew = !list.includes(m);
    openDrawer({
      title: isNew ? "Add press feature" : "Edit press feature",
      fields: MEDIA_FIELDS,
      value: m,
      validate: (d) => (d.featured && !String(d.quote || "").trim() ? "Add a pull quote, or untick “Feature as a quote”." : null),
      onSave: async (d) => {
        d.year = Number(d.year);
        const next = isNew ? [d, ...list] : list.map((x) => (x === m ? d : x));
        await save("media", next);
        list = next;
        toast(isNew ? "Press feature added" : "Press feature saved");
        draw();
      },
      onDelete: isNew ? null : async () => {
        const next = list.filter((x) => x !== m);
        await save("media", next);
        list = next;
        toast("Press feature deleted");
        draw();
      },
    });
  };
  const addNew = () => edit({ id: uid("m"), outlet: "", title: "", url: "", year: new Date().getFullYear(), type: "article", featured: false, quote: "" });

  setPage("Media Coverage", "Press, features and interviews", primaryBtn("Add press feature", addNew));
  const count = h("span", { class: "count" });
  const body = h("div");
  $("#content").replaceChildren(h("div", { class: "toolbar" }, searchBox("Search outlet or headline…", (v) => { q = v.toLowerCase(); draw(); }), count), body);

  function draw() {
    const shown = [...list]
      .filter((m) => !q || `${m.outlet} ${m.title}`.toLowerCase().includes(q))
      .sort((a, b) => (b.year || 0) - (a.year || 0));
    count.textContent = plural(list.length, "feature");
    if (!list.length) { body.replaceChildren(h("div", { class: "empty" }, h("b", {}, "No press yet"), h("br"), primaryBtn("Add press feature", addNew))); return; }
    body.replaceChildren(h("div", { class: "rows" }, ...shown.map((m) =>
      h("div", { class: "row", onclick: () => edit(m) },
        h("span", { class: "lead" }, String(m.year || "")),
        h("div", {}, h("b", {}, m.outlet), h("small", {}, m.title || m.url || "")),
        h("span", { style: "display:flex;gap:6px" },
          m.featured ? h("span", { class: "badge soft" }, "Featured") : null,
          h("span", { class: "badge grey" }, (MEDIA_TYPES.find((t) => t[0] === m.type) || MEDIA_TYPES[0])[1])),
        iconBtn("edit", "Edit", (ev) => { ev.stopPropagation(); edit(m); })))));
  }
  draw();
  if (param === "new") addNew();
}

// ---------- Document editors (FAQ, About, Settings) ----------
async function showDocument({ name, title, sub, sections, toDoc = (d) => d, fromDoc = (d) => d, after }) {
  const original = await load(name);
  const doc = toDoc(clone(original));
  let dirty = false;

  setPage(title, sub);
  const bar = h("div", { class: "savebar" },
    h("span", {}, "You have unsaved changes"),
    h("button", { class: "btn btn-ghost btn-sm", onclick: () => route(true) }, "Discard"),
    h("button", { class: "btn btn-primary btn-sm", onclick: () => docSave() }, "Save changes"));
  const markDirty = () => { dirty = true; bar.classList.add("show"); };

  const panels = sections.map((s) =>
    h("div", { class: "panel doc-section" },
      s.title ? h("h3", {}, s.title) : null,
      s.sub ? h("p", { class: "panel-sub" }, s.sub) : null,
      renderForm(s.fields, doc, markDirty)));
  $("#content").replaceChildren(...panels, bar);

  leaveGuard = () => dirty;
  docSave = async () => {
    const allFields = sections.flatMap((s) => s.fields);
    if (!checkRequired(allFields, doc, $("#content"))) return toast("Please fill in the required fields.", "error");
    try {
      await save(name, fromDoc(clone(doc)));
      dirty = false;
      bar.classList.remove("show");
      toast("Changes saved");
      after?.(doc);
    } catch (e) {
      toast(e.message, "error");
    }
  };
}

const showFaq = () =>
  showDocument({
    name: "faq", title: "FAQ", sub: "Topics and questions on the FAQ page. Click a question to expand it.",
    sections: [{ fields: FAQ_FIELDS }],
    toDoc: (arr) => ({ categories: arr }),
    fromDoc: (d) => d.categories,
  });

const showAbout = () => showDocument({ name: "about", title: "About Page", sub: "Everything on the About page", sections: ABOUT_SECTIONS });

const showSite = () =>
  showDocument({
    name: "site", title: "Settings", sub: "Site name, contact details and links used on every page",
    sections: SITE_SECTIONS,
    after: (d) => { window.SITE = d; applySiteName(); },
  });

// =========================================================
// Router
// =========================================================
const SECTIONS = {
  dashboard: showDashboard,
  artworks: showArtworks,
  exhibitions: showExhibitions,
  media: showMedia,
  faq: showFaq,
  about: showAbout,
  site: showSite,
};
let currentHash = "";

async function route(force = false) {
  const hash = location.hash.slice(1) || "dashboard";
  if (!force && leaveGuard?.() && hash !== currentHash) {
    if (!confirm("You have unsaved changes. Leave without saving?")) {
      history.replaceState(null, "", `#${currentHash}`);
      return;
    }
  }
  const [section, param] = hash.split("/");
  const show = SECTIONS[section] || showDashboard;
  currentHash = hash;
  leaveGuard = null;
  docSave = null;
  if (drawerState) closeDrawer(true);

  document.querySelectorAll(".sb-nav a").forEach((a) => a.classList.toggle("active", a.dataset.section === (SECTIONS[section] ? section : "dashboard")));
  $("#sidebar").classList.remove("open");
  $("#content").replaceChildren(h("div", { class: "loading" }, "Loading…"));
  window.scrollTo(0, 0);
  try {
    await show(param);
  } catch (e) {
    $("#content").replaceChildren(h("div", { class: "empty" }, h("b", {}, "Couldn't load this section"), e.message));
  }
}
window.addEventListener("hashchange", () => route());
window.addEventListener("beforeunload", (e) => {
  if (leaveGuard?.() || drawerState?.isDirty()) { e.preventDefault(); e.returnValue = ""; }
});

// =========================================================
// Login / logout
// =========================================================
function applySiteName() {
  document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = window.SITE?.name || "Admin"));
}

function showLogin() {
  $("#app").hidden = true;
  $("#loginScreen").hidden = false;
  $("#loginPassword").value = "";
  setTimeout(() => $("#loginPassword").focus(), 50);
}

async function showApp() {
  $("#loginScreen").hidden = true;
  $("#app").hidden = false;
  await route(true);
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#loginError").textContent = "";
  $("#loginBtn").disabled = true;
  $("#loginBtn").textContent = "Signing in…";
  try {
    await api("/api/admin/login", { method: "POST", json: { password: $("#loginPassword").value } });
    await showApp();
  } catch (err) {
    $("#loginError").textContent = err.message;
    $("#loginPassword").select();
  } finally {
    $("#loginBtn").disabled = false;
    $("#loginBtn").textContent = "Sign in";
  }
});

$("#pwToggle").addEventListener("click", () => {
  const input = $("#loginPassword");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  $("#pwToggle").textContent = show ? "Hide" : "Show";
});

$("#logoutBtn").addEventListener("click", async () => {
  if ((leaveGuard?.() || drawerState?.isDirty()) && !confirm("You have unsaved changes. Log out anyway?")) return;
  leaveGuard = null;
  await api("/api/admin/logout", { method: "POST", json: {} }).catch(() => {});
  showLogin();
});

$("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

// Start
(async () => {
  applySiteName();
  const { loggedIn } = await api("/api/admin/me").catch(() => ({ loggedIn: false }));
  loggedIn ? showApp() : showLogin();
})();
