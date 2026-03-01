let overlayRoot = null;
let hideTimer = null;
let audioContext = null;
let snoozePending = false;
let countdownTimer = null;
let miniActionTimer = null;
let dismissUnlocked = false;

const COUNTDOWN_RING_RADIUS = 52;
const COUNTDOWN_RING_CIRCUMFERENCE = 2 * Math.PI * COUNTDOWN_RING_RADIUS;

function playTone(frequency, duration, delay = 0) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  const startAt = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.06, startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function playAggressiveCue() {
  playTone(740, 0.16, 0);
  playTone(880, 0.2, 0.22);
}

function playTaskCue(task) {
  const normalized = String(task).toLowerCase();
  if (normalized.includes("water")) {
    playTone(620, 0.12, 0);
    playTone(760, 0.12, 0.16);
    return;
  }
  if (normalized.includes("stretch") || normalized.includes("stand")) {
    playTone(520, 0.14, 0);
    playTone(660, 0.14, 0.18);
    return;
  }
  if (normalized.includes("bathroom")) {
    playTone(460, 0.1, 0);
    playTone(460, 0.1, 0.14);
    playTone(690, 0.16, 0.28);
    return;
  }
  if (normalized.includes("snack") || normalized.includes("eat")) {
    playTone(540, 0.1, 0);
    playTone(680, 0.14, 0.16);
    return;
  }
  playAggressiveCue();
}

function getMiniAction(taskType) {
  if (taskType === "water") return { label: "Take 3 sips before completing", seconds: 6 };
  if (taskType === "movement") return { label: "Move your body for a few seconds", seconds: 8 };
  if (taskType === "bathroom") return { label: "Actually step away from the desk", seconds: 8 };
  if (taskType === "snack") return { label: "Take a real snack break", seconds: 6 };
  return { label: "Take 5 deep breaths before completing", seconds: 10 };
}

function clearTimers() {
  if (hideTimer) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (miniActionTimer) {
    window.clearInterval(miniActionTimer);
    miniActionTimer = null;
  }
}

function removeOverlay() {
  clearTimers();
  if (overlayRoot) {
    overlayRoot.remove();
    overlayRoot = null;
  }
  snoozePending = false;
  dismissUnlocked = false;
}

function createOverlay(task) {
  removeOverlay();

  overlayRoot = document.createElement("div");
  overlayRoot.className = "break-buddy-overlay-root";

  const style = window.__breakBuddyStyle ?? "normal";
  const fullScreenMode = Boolean(window.__breakBuddyFullScreenMode);
  const soundEnabled = Boolean(window.__breakBuddySoundEnabled);
  const focusLockMode = Boolean(window.__breakBuddyFocusLockMode);
  const focusLockSeconds = Number(window.__breakBuddyFocusLockSeconds ?? 30);
  const taskType = window.__breakBuddyTaskType ?? "general";
  const todayBreakCount = Number(window.__breakBuddyTodayBreakCount ?? 0);
  const miniAction = getMiniAction(taskType);

  overlayRoot.dataset.style = style;
  overlayRoot.dataset.fullscreen = String(fullScreenMode);
  overlayRoot.dataset.focuslock = String(focusLockMode);
  overlayRoot.dataset.taskType = taskType;

  overlayRoot.innerHTML = `
    <div class="break-buddy-backdrop"></div>
    <section class="break-buddy-card" role="dialog" aria-live="polite" aria-label="Break reminder">
      <p class="break-buddy-eyebrow">Break Buddy</p>
      <h2 class="break-buddy-title">${fullScreenMode ? "Stand up now" : "Time for a reset"}</h2>
      <p class="break-buddy-task">${task}</p>
      <p class="break-buddy-statline">Completed today: <strong>${todayBreakCount}</strong></p>
      ${focusLockMode ? `
        <div class="break-buddy-countdown">
          <div class="break-buddy-ring-wrap">
            <svg class="break-buddy-ring" viewBox="0 0 140 140" aria-hidden="true">
              <circle class="break-buddy-ring-track" cx="70" cy="70" r="${COUNTDOWN_RING_RADIUS}"></circle>
              <circle class="break-buddy-ring-progress" cx="70" cy="70" r="${COUNTDOWN_RING_RADIUS}"></circle>
            </svg>
            <div class="break-buddy-ring-copy">
              <span>Unlocks in</span>
              <strong id="break-buddy-countdown-value">${focusLockSeconds}s</strong>
            </div>
          </div>
        </div>
        <div class="break-buddy-mini-action">
          <span>${miniAction.label}</span>
          <strong id="break-buddy-mini-action-status">${miniAction.seconds}s</strong>
        </div>
      ` : ""}
      <div class="break-buddy-actions">
        <button type="button" class="break-buddy-button break-buddy-button-primary">Complete break</button>
        <button type="button" class="break-buddy-button break-buddy-button-snooze">Snooze 10 min</button>
        <button type="button" class="break-buddy-button break-buddy-button-secondary">Hide</button>
      </div>
    </section>
  `;

  const [primaryButton, snoozeButton, secondaryButton] = overlayRoot.querySelectorAll("button");
  let miniActionUnlocked = !focusLockMode;
  primaryButton.disabled = focusLockMode;

  primaryButton.addEventListener("click", async () => {
    if (!miniActionUnlocked) return;
    const settings = await chrome.runtime.sendMessage({ type: "complete-break" });
    if (settings?.todayBreakCount !== undefined) {
      window.__breakBuddyTodayBreakCount = settings.todayBreakCount;
    }
    removeOverlay();
  });

  snoozeButton.addEventListener("click", async () => {
    if (snoozePending) return;
    snoozePending = true;
    await chrome.runtime.sendMessage({ type: "snooze" });
    removeOverlay();
  });

  secondaryButton.addEventListener("click", () => {
    if (focusLockMode && !dismissUnlocked) return;
    removeOverlay();
  });

  overlayRoot.querySelector(".break-buddy-backdrop").addEventListener("click", () => {
    if (focusLockMode && !dismissUnlocked) return;
    removeOverlay();
  });

  document.documentElement.appendChild(overlayRoot);

  if (style === "aggressive" && soundEnabled) {
    playTaskCue(task);
  }

  if (focusLockMode) {
    let remaining = Math.max(1, focusLockSeconds);
    let miniRemaining = miniAction.seconds;
    const total = remaining;
    const countdownValue = overlayRoot.querySelector("#break-buddy-countdown-value");
    const miniActionStatus = overlayRoot.querySelector("#break-buddy-mini-action-status");
    const secondaryLabel = overlayRoot.querySelector(".break-buddy-button-secondary");
    const ring = overlayRoot.querySelector(".break-buddy-ring-progress");
    secondaryLabel.textContent = `Hide (${remaining}s)`;

    if (ring) {
      ring.style.strokeDasharray = String(COUNTDOWN_RING_CIRCUMFERENCE);
      ring.style.strokeDashoffset = "0";
    }

    miniActionTimer = window.setInterval(() => {
      miniRemaining -= 1;
      if (miniActionStatus) {
        miniActionStatus.textContent = miniRemaining > 0 ? `${miniRemaining}s` : "Ready";
      }
      if (miniRemaining > 0) return;
      primaryButton.disabled = false;
      miniActionUnlocked = true;
      window.clearInterval(miniActionTimer);
      miniActionTimer = null;
    }, 1000);

    countdownTimer = window.setInterval(() => {
      remaining -= 1;
      if (countdownValue) {
        countdownValue.textContent = `${Math.max(0, remaining)}s`;
      }
      if (ring) {
        const progress = remaining / total;
        ring.style.strokeDashoffset = String(COUNTDOWN_RING_CIRCUMFERENCE * (1 - progress));
      }
      if (remaining > 0) {
        secondaryLabel.textContent = `Hide (${remaining}s)`;
        return;
      }
      dismissUnlocked = true;
      secondaryLabel.textContent = "Hide";
      overlayRoot.dataset.unlocked = "true";
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }, 1000);
  } else {
    hideTimer = window.setTimeout(removeOverlay, 20000);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "ping") {
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === "show-overlay") {
    window.__breakBuddyStyle = message.reminderStyle ?? "normal";
    window.__breakBuddyFullScreenMode = Boolean(message.fullScreenMode);
    window.__breakBuddySoundEnabled = Boolean(message.soundEnabled);
    window.__breakBuddyFocusLockMode = Boolean(message.focusLockMode);
    window.__breakBuddyFocusLockSeconds = Number(message.focusLockSeconds ?? 30);
    window.__breakBuddyTaskType = message.taskType ?? "general";
    window.__breakBuddyTodayBreakCount = Number(message.todayBreakCount ?? 0);
    createOverlay(message.task ?? "Take a short break");
    sendResponse({ ok: true });
  }
});
