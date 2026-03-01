function formatNextPrompt(value) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDayLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function renderBalanceChart(history = []) {
  const target = document.querySelector("#balanceChart");
  const totals = { water: 0, movement: 0, eyes: 0 };

  history.forEach((entry) => {
    totals.water += Number(entry.types?.water || 0);
    totals.movement += Number(entry.types?.movement || 0);
    totals.eyes += Number(entry.types?.eyes || 0) + Number(entry.types?.breathing || 0);
  });

  const highest = Math.max(1, totals.water, totals.movement, totals.eyes);
  const items = [
    ["Hydration", totals.water, "water"],
    ["Movement", totals.movement, "movement"],
    ["Screen rest", totals.eyes, "eyes"]
  ];

  target.innerHTML = items.map(([label, value, tone]) => `
    <div class="balance-row">
      <span>${label}</span>
      <div class="balance-bar"><i class="balance-fill ${tone}" style="width:${(value / highest) * 100}%"></i></div>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderHistory(history = []) {
  const target = document.querySelector("#historyList");
  const recent = [...history].slice(-5).reverse();

  if (recent.length === 0) {
    target.innerHTML = `<p class="empty-copy">No completed breaks yet.</p>`;
    return;
  }

  target.innerHTML = recent.map((entry) => {
    const screenRest = Number(entry.types?.eyes || 0) + Number(entry.types?.breathing || 0);
    const pieces = [];
    if (entry.types?.water) pieces.push(`${entry.types.water} water`);
    if (entry.types?.movement) pieces.push(`${entry.types.movement} move`);
    if (screenRest) pieces.push(`${screenRest} screen`);

    return `
      <div class="history-row">
        <div>
          <span>${formatDayLabel(entry.date)}</span>
          <strong>${entry.total} completed</strong>
        </div>
        <small>${pieces.join(" • ")}</small>
      </div>
    `;
  }).join("");
}

function renderStats(settings) {
  document.querySelector("#nextPromptAt").textContent = formatNextPrompt(settings.nextPromptAt);
  document.querySelector("#todayBreakCount").textContent = String(settings.todayBreakCount ?? 0);
  document.querySelector("#currentStreak").textContent = `${settings.currentStreak ?? 0} days`;
  document.querySelector("#bestStreak").textContent = `${settings.bestStreak ?? 0} days`;
  renderBalanceChart(settings.breakHistory ?? []);
  renderHistory(settings.breakHistory ?? []);
}

async function loadSettings() {
  const settings = await chrome.runtime.sendMessage({ type: "get-settings" });
  document.querySelector("#enabled").checked = settings.enabled;
  document.querySelector("#intervalMinutes").value = String(settings.intervalMinutes);
  renderStats(settings);
}

async function saveQuickSettings() {
  const payload = {
    enabled: document.querySelector("#enabled").checked,
    intervalMinutes: Number(document.querySelector("#intervalMinutes").value)
  };

  const settings = await chrome.runtime.sendMessage({ type: "save-settings", payload });
  renderStats(settings);
}

document.querySelector("#enabled").addEventListener("change", saveQuickSettings);
document.querySelector("#intervalMinutes").addEventListener("change", saveQuickSettings);
document.querySelector("#sendTest").addEventListener("click", async () => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const settings = await chrome.runtime.sendMessage({
    type: "send-test",
    tabId: activeTab?.id ?? null
  });
  renderStats(settings);
});
document.querySelector("#openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

loadSettings();
