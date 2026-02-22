/* ── State ────────────────────────────────────────────────── */
let activeDogId = null;

/* ── Helpers ──────────────────────────────────────────────── */
function fmt(amount, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function computeBalance(dog) {
  return dog.fund.transactions.reduce((acc, tx) => {
    return tx.type === "deposit" ? acc + tx.amount : acc - tx.amount;
  }, 0);
}

/* ── Sidebar ──────────────────────────────────────────────── */
function renderSidebar() {
  const list = document.getElementById("dog-list");
  list.innerHTML = DOGS.map((dog) => `
    <div class="dog-card ${dog.id === activeDogId ? "active" : ""}"
         data-id="${dog.id}"
         role="button"
         tabindex="0"
         aria-label="${dog.name}">
      <img class="dog-avatar"
           src="${dog.photo}"
           alt="${dog.name}"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23e8e2d9%22/><text x=%2250%22 y=%2260%22 font-size=%2240%22 text-anchor=%22middle%22>🐾</text></svg>'">
      <div class="dog-card-info">
        <div class="dog-card-name">${dog.name}</div>
        <div class="dog-card-breed">${dog.breed}</div>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".dog-card").forEach((card) => {
    const select = () => selectDog(Number(card.dataset.id));
    card.addEventListener("click", select);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") select(); });
  });
}

/* ── Detail pane ──────────────────────────────────────────── */
function renderDetail() {
  const pane = document.getElementById("detail-pane");

  if (!activeDogId) {
    pane.innerHTML = `
      <div class="empty-state">
        <div class="paw">🐾</div>
        <p>Select a dog to view their fund details.</p>
      </div>`;
    return;
  }

  const dog = DOGS.find((d) => d.id === activeDogId);
  const balance = computeBalance(dog);
  const sorted = [...dog.fund.transactions].sort((a, b) => b.date.localeCompare(a.date));

  pane.innerHTML = `
    <div class="detail-header">
      <img class="detail-photo"
           src="${dog.photo}"
           alt="${dog.name}"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23e8e2d9%22/><text x=%2250%22 y=%2260%22 font-size=%2240%22 text-anchor=%22middle%22>🐾</text></svg>'">
      <div class="detail-meta">
        <h1>${dog.name}</h1>
        <div class="breed-age">${dog.breed} &middot; ${dog.age} year${dog.age !== 1 ? "s" : ""} old</div>
        <div class="owner-label">Managed for <span class="owner-name">${dog.owner}</span></div>
      </div>
    </div>

    <p class="description">${dog.description}</p>

    <div class="fund-summary">
      <div class="fund-balance-block">
        <div class="fund-balance-label">Fund Balance</div>
        <div class="fund-balance-value">${fmt(balance, dog.fund.currency)}</div>
      </div>
      <div class="fund-actions">
        <button class="btn btn-secondary" onclick="openModal('withdrawal')">Withdraw</button>
        <button class="btn btn-primary"   onclick="openModal('deposit')">+ Deposit</button>
      </div>
    </div>

    <div class="section-title">Transaction History</div>
    <table class="tx-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Note</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map((tx) => `
          <tr>
            <td>${fmtDate(tx.date)}</td>
            <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
            <td>${tx.note}</td>
            <td class="tx-amount ${tx.type}" style="text-align:right">
              ${tx.type === "deposit" ? "+" : "−"}${fmt(tx.amount, dog.fund.currency)}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ── Select dog ───────────────────────────────────────────── */
function selectDog(id) {
  activeDogId = id;
  renderSidebar();
  renderDetail();
}

/* ── Modal ────────────────────────────────────────────────── */
function openModal(type) {
  const modal = document.getElementById("tx-modal");
  document.getElementById("modal-title").textContent =
    type === "deposit" ? "Add Deposit" : "Record Withdrawal";
  document.getElementById("tx-type").value = type;
  document.getElementById("tx-date").value = new Date().toISOString().slice(0, 10);
  document.getElementById("tx-amount").value = "";
  document.getElementById("tx-note").value = "";
  modal.classList.remove("hidden");
  document.getElementById("tx-amount").focus();
}

function closeModal() {
  document.getElementById("tx-modal").classList.add("hidden");
}

function submitTransaction() {
  const dog = DOGS.find((d) => d.id === activeDogId);
  const type   = document.getElementById("tx-type").value;
  const date   = document.getElementById("tx-date").value;
  const amount = parseFloat(document.getElementById("tx-amount").value);
  const note   = document.getElementById("tx-note").value.trim();

  if (!date || isNaN(amount) || amount <= 0) {
    alert("Please enter a valid date and a positive amount.");
    return;
  }

  if (type === "withdrawal" && amount > computeBalance(dog)) {
    alert("Insufficient funds for this withdrawal.");
    return;
  }

  const newId = Math.max(0, ...dog.fund.transactions.map((t) => t.id)) + 1;
  dog.fund.transactions.push({ id: newId, date, type, amount, note: note || type });

  closeModal();
  renderDetail();
}

/* ── Keyboard: close modal on Escape ──────────────────────── */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* ── Init ─────────────────────────────────────────────────── */
renderSidebar();
renderDetail();
