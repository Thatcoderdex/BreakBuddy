function setStatus(message) {
  document.querySelector("#saveStatus").textContent = message;
}

async function loadSettings() {
  const settings = await chrome.runtime.sendMessage({ type: "get-settings" });
  document.querySelector("#enabled").checked = settings.enabled;
  document.querySelector("#intervalMinutes").value = String(settings.intervalMinutes);
  document.querySelector("#reminderStyle").value = settings.reminderStyle;
  document.querySelector("#fullScreenMode").checked = settings.fullScreenMode;
  document.querySelector("#soundEnabled").checked = settings.soundEnabled;
  document.querySelector("#focusLockMode").checked = settings.focusLockMode;
  document.querySelector("#focusLockSecondsSoft").value = String(settings.focusLockSecondsSoft);
  document.querySelector("#focusLockSecondsNormal").value = String(settings.focusLockSecondsNormal);
  document.querySelector("#focusLockSecondsAggressive").value = String(settings.focusLockSecondsAggressive);
  document.querySelector("#quietHoursEnabled").checked = settings.quietHoursEnabled;
  document.querySelector("#quietStart").value = settings.quietStart;
  document.querySelector("#quietEnd").value = settings.quietEnd;
  document.querySelector("#tasks").value = settings.tasks.join("\n");
}

async function saveSettings() {
  const payload = {
    enabled: document.querySelector("#enabled").checked,
    intervalMinutes: Number(document.querySelector("#intervalMinutes").value),
    reminderStyle: document.querySelector("#reminderStyle").value,
    fullScreenMode: document.querySelector("#fullScreenMode").checked,
    soundEnabled: document.querySelector("#soundEnabled").checked,
    focusLockMode: document.querySelector("#focusLockMode").checked,
    focusLockSecondsSoft: Number(document.querySelector("#focusLockSecondsSoft").value),
    focusLockSecondsNormal: Number(document.querySelector("#focusLockSecondsNormal").value),
    focusLockSecondsAggressive: Number(document.querySelector("#focusLockSecondsAggressive").value),
    quietHoursEnabled: document.querySelector("#quietHoursEnabled").checked,
    quietStart: document.querySelector("#quietStart").value,
    quietEnd: document.querySelector("#quietEnd").value,
    tasks: document.querySelector("#tasks").value.split("\n").map((task) => task.trim()).filter(Boolean)
  };

  await chrome.runtime.sendMessage({ type: "save-settings", payload });
  setStatus("Saved");
  window.setTimeout(() => setStatus(""), 1600);
}

document.querySelector("#save").addEventListener("click", saveSettings);
document.querySelector("#sendTest").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "send-test" });
  setStatus("Test reminder sent");
  window.setTimeout(() => setStatus(""), 1600);
});

loadSettings();
