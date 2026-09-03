import { snoozeReminder, dismissReminder, playAlarmBeep } from "../reminders.js";
import { escapeHtml, formatDateTime } from "../utils.js";

const sounded = new Set();

export function renderReminders(uid, dueTasks) {
  const root = document.getElementById("reminder-root");
  root.innerHTML = dueTasks
    .map(
      (t) => `
      <div class="reminder-banner" data-id="${t.id}">
        <div class="reminder-icon">⏰</div>
        <div class="reminder-body">
          <div class="reminder-title">Still on "${escapeHtml(t.name)}"?</div>
          <div class="reminder-sub">Started ${formatDateTime(t.startedAt)} — this keeps nagging every 30 min until it's done.</div>
        </div>
        <div class="reminder-actions">
          <button type="button" class="btn btn-primary reminder-snooze" data-id="${t.id}">Snooze 30 min</button>
          <button type="button" class="btn btn-ghost reminder-dismiss" data-id="${t.id}" ${t.completed ? "" : "disabled title=\"Complete the task to dismiss\""}>Dismiss</button>
        </div>
      </div>
    `
    )
    .join("");

  dueTasks.forEach((t) => {
    if (!sounded.has(t.id)) {
      playAlarmBeep();
      sounded.add(t.id);
    }
  });

  root.querySelectorAll(".reminder-snooze").forEach((btn) => {
    btn.addEventListener("click", async () => {
      sounded.delete(btn.dataset.id);
      await snoozeReminder(uid, btn.dataset.id);
    });
  });
  root.querySelectorAll(".reminder-dismiss").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const task = dueTasks.find((t) => t.id === btn.dataset.id);
      if (task) {
        sounded.delete(task.id);
        await dismissReminder(uid, task);
      }
    });
  });
}

export function clearReminderSoundState(nodeId) {
  sounded.delete(nodeId);
}
