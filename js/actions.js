import { updateNode } from "./nodesRepo.js";
import { addPoints } from "./points.js";
import { switchToTask } from "./reminders.js";
import { promptSwitchReason } from "./render/modal.js";
import { showCelebration } from "./render/celebration.js";

export async function completeTask(uid, task, rewardTiers) {
  if (task.completed) return;
  await updateNode(uid, task.id, {
    completed: true,
    completedAt: Date.now(),
    reminderActive: false,
  });
  const result = await addPoints(uid, task.points);
  if (result.celebrate) {
    showCelebration(result.lifetimePoints, rewardTiers);
  }
}

export async function startWorkingOn(uid, currentTaskId, tasksById, task) {
  await switchToTask(uid, currentTaskId, tasksById, task, promptSwitchReason);
}
