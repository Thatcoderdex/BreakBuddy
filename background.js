const DEFAULT_SETTINGS = {
  enabled: true,
  intervalMinutes: 45,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
  reminderStyle: "normal",
  fullScreenMode: false,
  soundEnabled: true,
  focusLockMode: false,
  focusLockSecondsSoft: 15,
  focusLockSecondsNormal: 30,
  focusLockSecondsAggressive: 45,
  todayBreakCount: 0,
  lastBreakDate: "",
  breakHistory: [],
  currentStreak: 0,
  bestStreak: 0,
  tasks: [
    "Drink water",
    "Stand up and stretch",
    "Look away from your screen for 20 seconds",
    "Take a bathroom break",
    "Grab a quick snack",
    "Roll your shoulders",
    "Walk around for two minutes"
  ],
  lastPrompt: "",
  nextPromptAt: ""
};

const ALARM_NAME = "break-buddy-reminder";
const SNOOZE_ALARM_NAME = "break-buddy-snooze";

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "ping" });
    return true;
  } catch (_error) {
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["content.css"]
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
      return true;
    } catch (_injectError) {
      return false;
    }
  }
}

function getRandomTask(tasks, lastPrompt) {
  const validTasks = tasks.filter((task) => task.trim().length > 0);
  if (validTasks.length === 0) return "Take a short break";
  const pool = validTasks.length > 1 ? validTasks.filter((task) => task !== lastPrompt) : validTasks;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getTaskType(task) {
  const normalized = String(task).toLowerCase();
  if (normalized.includes("water")) return "water";
  if (normalized.includes("stretch") || normalized.includes("stand") || normalized.includes("walk")) return "movement";
  if (normalized.includes("bathroom")) return "bathroom";
  if (normalized.includes("snack") || normalized.includes("eat")) return "snack";
  if (normalized.includes("screen") || normalized.includes("eyes")) return "eyes";
  if (normalized.includes("breathe") || normalized.includes("breath")) return "breathing";
  return "general";
}

function parseTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return { hours, minutes };
}

function isInQuietHours(settings, now = new Date()) {
  if (!settings.quietHoursEnabled) return false;
  const start = parseTime(settings.quietStart);
  const end = parseTime(settings.quietEnd);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  const today = new Date().toISOString().slice(0, 10);

  if (settings.lastBreakDate !== today) {
    settings.todayBreakCount = 0;
    settings.lastBreakDate = today;
    await chrome.storage.sync.set({ todayBreakCount: 0, lastBreakDate: today });
  }

  return settings;
}

async function saveSettings(partial) {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await chrome.storage.sync.set(next);
  await syncAlarm(next);
  return getSettings();
}

async function syncAlarm(settings) {
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.clear(SNOOZE_ALARM_NAME);

  if (!settings.enabled) {
    await chrome.storage.sync.set({ nextPromptAt: "" });
    return;
  }

  const delay = Math.max(1, Number(settings.intervalMinutes) || DEFAULT_SETTINGS.intervalMinutes);
  const nextPromptAt = new Date(Date.now() + delay * 60 * 1000).toISOString();
  await chrome.storage.sync.set({ nextPromptAt });
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: delay, periodInMinutes: delay });
}

async function sendReminder() {
  const settings = await getSettings();
  if (!settings.enabled || isInQuietHours(settings)) return settings;

  const task = getRandomTask(settings.tasks, settings.lastPrompt);
  const taskType = getTaskType(task);
  await chrome.storage.sync.set({
    lastPrompt: task,
    nextPromptAt: new Date(Date.now() + settings.intervalMinutes * 60 * 1000).toISOString()
  });

  const countdownByStyle = {
    soft: settings.focusLockSecondsSoft,
    normal: settings.focusLockSecondsNormal,
    aggressive: settings.focusLockSecondsAggressive
  };

  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  let overlayShown = false;

  for (const tab of tabs) {
    if (!tab.id) continue;
    try {
      const ready = await ensureContentScript(tab.id);
      if (!ready) continue;
      await chrome.tabs.sendMessage(tab.id, {
        type: "show-overlay",
        task,
        reminderStyle: settings.reminderStyle,
        fullScreenMode: settings.fullScreenMode,
        soundEnabled: settings.soundEnabled,
        focusLockMode: settings.focusLockMode,
        focusLockSeconds: countdownByStyle[settings.reminderStyle] ?? settings.focusLockSecondsNormal,
        taskType,
        todayBreakCount: settings.todayBreakCount
      });
      overlayShown = true;
    } catch (_error) {
      overlayShown = false;
    }
  }

  if (!overlayShown) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon-128.png",
      title: "Break Buddy",
      message: task,
      priority: 2
    });
  }

  return getSettings();
}

async function sendTestReminder(preferredTabId = null) {
  const settings = await getSettings();
  const task = getRandomTask(settings.tasks, settings.lastPrompt);
  const taskType = getTaskType(task);

  await chrome.storage.sync.set({
    lastPrompt: task,
    nextPromptAt: new Date(Date.now() + settings.intervalMinutes * 60 * 1000).toISOString()
  });

  const tabs = preferredTabId
    ? [{ id: preferredTabId }]
    : await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  let overlayShown = false;

  for (const tab of tabs) {
    if (!tab.id) continue;
    try {
      const ready = await ensureContentScript(tab.id);
      if (!ready) continue;
      await chrome.tabs.sendMessage(tab.id, {
        type: "show-overlay",
        task,
        reminderStyle: "aggressive",
        fullScreenMode: true,
        soundEnabled: settings.soundEnabled,
        focusLockMode: true,
        focusLockSeconds: settings.focusLockSecondsAggressive,
        taskType,
        todayBreakCount: settings.todayBreakCount
      });
      overlayShown = true;
    } catch (_error) {
      overlayShown = false;
    }
  }

  if (!overlayShown) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon-128.png",
      title: "Break Buddy Test",
      message: task,
      priority: 2
    });
  }

  return getSettings();
}

async function scheduleSnooze(minutes = 10) {
  const settings = await getSettings();
  if (!settings.enabled) return settings;
  await chrome.alarms.clear(SNOOZE_ALARM_NAME);
  const nextPromptAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  await chrome.storage.sync.set({ nextPromptAt });
  chrome.alarms.create(SNOOZE_ALARM_NAME, { delayInMinutes: minutes });
  return { ...settings, nextPromptAt };
}

async function recordCompletedBreak() {
  const settings = await getSettings();
  const nextCount = Number(settings.todayBreakCount || 0) + 1;
  const today = new Date().toISOString().slice(0, 10);
  const taskType = getTaskType(settings.lastPrompt);
  const history = Array.isArray(settings.breakHistory) ? [...settings.breakHistory] : [];
  const existingDay = history.find((entry) => entry.date === today);

  if (existingDay) {
    existingDay.total += 1;
    existingDay.types[taskType] = (existingDay.types[taskType] || 0) + 1;
  } else {
    history.push({ date: today, total: 1, types: { [taskType]: 1 } });
  }

  history.sort((left, right) => left.date.localeCompare(right.date));
  const trimmedHistory = history.slice(-30);
  const streakDates = trimmedHistory.filter((entry) => entry.total > 0).map((entry) => entry.date).sort();

  let currentStreak = 0;
  let cursor = new Date(`${today}T00:00:00`);
  const streakSet = new Set(streakDates);
  while (streakSet.has(cursor.toISOString().slice(0, 10))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let bestStreak = Math.max(Number(settings.bestStreak || 0), currentStreak);
  let run = 0;
  let previousDate = null;
  for (const date of streakDates) {
    if (!previousDate) {
      run = 1;
    } else {
      const previous = new Date(`${previousDate}T00:00:00`);
      previous.setDate(previous.getDate() + 1);
      run = previous.toISOString().slice(0, 10) === date ? run + 1 : 1;
    }
    bestStreak = Math.max(bestStreak, run);
    previousDate = date;
  }

  await chrome.storage.sync.set({
    todayBreakCount: nextCount,
    lastBreakDate: today,
    breakHistory: trimmedHistory,
    currentStreak,
    bestStreak
  });

  return { ...settings, todayBreakCount: nextCount, lastBreakDate: today, breakHistory: trimmedHistory, currentStreak, bestStreak };
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.sync.set(DEFAULT_SETTINGS);
  await syncAlarm(DEFAULT_SETTINGS);
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await syncAlarm(settings);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME && alarm.name !== SNOOZE_ALARM_NAME) return;
  await sendReminder();
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "sync") return;
  const trackedKeys = ["enabled", "intervalMinutes", "quietHoursEnabled", "quietStart", "quietEnd", "tasks"];
  if (trackedKeys.some((key) => key in changes)) {
    const settings = await getSettings();
    await syncAlarm(settings);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "get-settings") {
    getSettings().then(sendResponse);
    return true;
  }
  if (message?.type === "save-settings") {
    saveSettings(message.payload).then(sendResponse);
    return true;
  }
  if (message?.type === "send-test") {
    sendTestReminder(message.tabId ?? null).then(sendResponse);
    return true;
  }
  if (message?.type === "snooze") {
    scheduleSnooze(10).then(sendResponse);
    return true;
  }
  if (message?.type === "complete-break") {
    recordCompletedBreak().then(sendResponse);
    return true;
  }
  return false;
});
