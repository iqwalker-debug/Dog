/* ── Navigation ───────────────────────────────────────────── */
function goTo(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById("screen-" + screen).classList.remove("hidden");

  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.screen === screen);
  });

  if (screen === "book") prefillBookingService();
}

/* ── Toast ────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

/* ── Copy promo code ──────────────────────────────────────── */
function copyPromo(code) {
  navigator.clipboard.writeText(code).catch(() => {});
  showToast("Code " + code + " copied to clipboard!");
}

/* ── Render home service scroll ───────────────────────────── */
function renderHomeServices() {
  document.getElementById("home-services-scroll").innerHTML = SERVICES.map((s) => `
    <div class="service-card-mini" onclick="goTo('book');setBookingService('${s.id}')">
      <div class="svc-icon">${s.icon}</div>
      <div class="svc-name">${s.name}</div>
      <div class="svc-price">$${s.price} <span style="font-weight:400;color:#b08060;font-size:.7rem">${s.unit}</span></div>
    </div>
  `).join("");
}

/* ── Render home gallery preview (first 6) ────────────────── */
function renderHomeGallery() {
  document.getElementById("home-gallery-preview").innerHTML =
    GALLERY.slice(0, 6).map(galleryThumb).join("");
}

function galleryThumb(item) {
  return `
    <div class="gallery-thumb">
      <img src="${item.src}" alt="${item.alt}"
           onerror="this.parentElement.innerHTML='<div class=gallery-thumb-placeholder>🐾</div>'">
    </div>`;
}

/* ── Render services screen ───────────────────────────────── */
function renderServices() {
  document.getElementById("services-list").innerHTML = SERVICES.map((s) => `
    <div class="service-card">
      <div class="svc-icon-lg">${s.icon}</div>
      <div class="svc-body">
        <h3>${s.name}</h3>
        <p>${s.description}</p>
      </div>
      <div class="svc-right">
        <div class="svc-price-lg">$${s.price}</div>
        <div class="svc-unit">${s.unit}</div>
        <button class="btn-book-svc" onclick="goTo('book');setBookingService('${s.id}')">Book</button>
      </div>
    </div>
  `).join("");
}

/* ── Render gallery screen ────────────────────────────────── */
function renderGallery() {
  document.getElementById("gallery-grid").innerHTML =
    GALLERY.map(galleryThumb).join("");
}

/* ── Render rewards screen ────────────────────────────────── */
function renderRewards() {
  document.getElementById("promo-cards").innerHTML = PROMOS.map((p) => `
    <div class="promo-card">
      <div class="promo-label">${p.label}</div>
      <div class="promo-row">
        <span class="code">${p.code}</span>
        <button class="btn-copy" id="copy-${p.code}" onclick="handleCopy('${p.code}')">Copy</button>
      </div>
      <div class="promo-desc">${p.description}</div>
    </div>
  `).join("");
}

function handleCopy(code) {
  navigator.clipboard.writeText(code).catch(() => {});
  const btn = document.getElementById("copy-" + code);
  btn.textContent = "Copied!";
  btn.classList.add("copied");
  setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 2000);
  showToast("Code " + code + " copied!");
}

/* ── Render booking service select ───────────────────────── */
function renderBookingSelect() {
  document.getElementById("b-service").innerHTML =
    SERVICES.map((s) => `<option value="${s.id}">${s.icon} ${s.name} — $${s.price} ${s.unit}</option>`).join("");
}

function setBookingService(id) {
  const sel = document.getElementById("b-service");
  if (sel) sel.value = id;
}

function prefillBookingService() {
  const today = new Date().toISOString().slice(0, 10);
  const dateInput = document.getElementById("b-date");
  if (dateInput && !dateInput.value) dateInput.value = today;
}

/* ── Promo validation (booking screen) ────────────────────── */
let appliedPromo = null;

function applyPromo() {
  const raw  = document.getElementById("b-promo").value.trim().toUpperCase();
  const fb   = document.getElementById("promo-feedback");
  const match = PROMOS.find((p) => p.code === raw);

  if (!raw) { fb.textContent = ""; appliedPromo = null; return; }

  if (match) {
    appliedPromo = match;
    const saving = match.type === "percent" ? match.discount + "% off" : "$" + match.discount + " off";
    fb.textContent = "✓ Code applied — " + saving + "!";
    fb.className = "promo-feedback ok";
    showToast("Promo applied: " + saving);
  } else {
    appliedPromo = null;
    fb.textContent = "✗ Code not recognised. Try FIRSTDOG or AUSTIN10.";
    fb.className = "promo-feedback err";
  }
}

/* ── Submit booking ───────────────────────────────────────── */
function submitBooking() {
  const name  = document.getElementById("b-name").value.trim();
  const email = document.getElementById("b-email").value.trim();
  const dog   = document.getElementById("b-dog").value.trim();
  const date  = document.getElementById("b-date").value;

  if (!name || !email || !dog || !date) {
    showToast("Please fill in your name, email, dog's name, and date.");
    return;
  }

  const svcId = document.getElementById("b-service").value;
  const svc   = SERVICES.find((s) => s.id === svcId);
  let total   = svc.price;

  if (appliedPromo) {
    if (appliedPromo.type === "percent") {
      total = total * (1 - appliedPromo.discount / 100);
    } else {
      total = Math.max(0, total - appliedPromo.discount);
    }
  }

  showToast("🐾 Booking request sent! We'll confirm via email.");

  // Reset form
  ["b-name","b-email","b-phone","b-dog","b-breed","b-notes","b-promo"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  document.getElementById("promo-feedback").textContent = "";
  appliedPromo = null;

  setTimeout(() => goTo("home"), 1800);
}

/* ── Init ─────────────────────────────────────────────────── */
renderHomeServices();
renderHomeGallery();
renderServices();
renderGallery();
renderRewards();
renderBookingSelect();
