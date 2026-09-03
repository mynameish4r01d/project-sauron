import { updateUserDoc, updateNode, logSwitch } from "./nodesRepo.js";

export const REMINDER_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Call when the user declares intent to work on `targetNode`.
 * If they're walking away from a different, still-incomplete task,
 * `reasonProvider` is awaited to collect a reason (any answer, including
 * blank, is accepted) before the switch is logged and applied.
 */
export async function switchToTask(uid, currentTaskId, allTasksById, targetNode, reasonProvider) {
  if (currentTaskId && currentTaskId !== targetNode.id) {
    const fromNode = allTasksById.get(currentTaskId);
    if (fromNode && !fromNode.completed) {
      const reason = await reasonProvider(fromNode, targetNode);
      await logSwitch(uid, {
        fromNodeId: fromNode.id,
        fromName: fromNode.name,
        toNodeId: targetNode.id,
        toName: targetNode.name,
        reason: reason || "",
      });
    }
  }

  await updateUserDoc(uid, { currentTaskId: targetNode.id });

  if (!targetNode.reminderActive) {
    await updateNode(uid, targetNode.id, {
      startedAt: Date.now(),
      nextReminderAt: Date.now() + REMINDER_INTERVAL_MS,
      reminderActive: true,
    });
  }
}

export function findDueReminders(tasks) {
  const now = Date.now();
  return tasks.filter(
    (t) => t.type === "task" && t.reminderActive && !t.completed && t.nextReminderAt && t.nextReminderAt <= now
  );
}

export function snoozeReminder(uid, nodeId) {
  return updateNode(uid, nodeId, { nextReminderAt: Date.now() + REMINDER_INTERVAL_MS });
}

export function dismissReminder(uid, node) {
  if (!node.completed) return Promise.resolve();
  return updateNode(uid, node.id, { reminderActive: false });
}

export function stopReminder(uid, nodeId) {
  return updateNode(uid, nodeId, { reminderActive: false });
}

let audioCtx = null;
export function playAlarmBeep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    [0, 0.22, 0.44].forEach((offset) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  } catch (e) {
    // Audio unsupported/blocked (e.g. autoplay policy) — banner still shows visually.
  }
}
