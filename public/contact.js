// =========================================================
// Contact page: feedback form → POST /api/feedback
// Messages are read in Admin → Messages.
// =========================================================
(() => {
  const form = document.getElementById("feedbackForm");
  if (!form) return;
  const status = document.getElementById("fbStatus");
  const send = document.getElementById("fbSend");
  const show = (msg, kind) => { status.textContent = msg; status.className = `fb-status ${kind || ""}`; };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.name = (data.name || "").trim();
    data.email = (data.email || "").trim();
    data.message = (data.message || "").trim();

    // Highlight empty / invalid fields
    const bad = {
      name: !data.name,
      email: !emailOk(data.email),
      message: !data.message,
    };
    for (const [k, isBad] of Object.entries(bad)) form.elements[k].closest(".fb-field").classList.toggle("invalid", isBad);
    if (Object.values(bad).some(Boolean)) {
      show(bad.email && data.email ? "Please enter a valid email address." : "Please fill in your name, email and message.", "err");
      form.querySelector(".invalid input, .invalid textarea")?.focus();
      return;
    }

    send.disabled = true;
    send.textContent = "Sending…";
    show("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      form.reset();
      show("Thank you — your message has been sent.", "ok");
    } catch (err) {
      show(err.message, "err");
    } finally {
      send.disabled = false;
      send.innerHTML = 'Send <span aria-hidden="true">&rarr;</span>';
    }
  });

  form.addEventListener("input", (e) => e.target.closest(".fb-field")?.classList.remove("invalid"));
})();
