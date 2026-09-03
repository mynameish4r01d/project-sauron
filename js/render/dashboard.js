import { escapeHtml, formatDeadline, isUrgent, isOverdue, newId } from "../utils.js";
import { completeTask, startWorkingOn } from "../actions.js";
import { openModal, closeModal } from "./modal.js";
import { updateUserDoc } from "../nodesRepo.js";

export function renderDashboard(container, ctx) {
  const { uid, userDoc, allTasks, rootProjects, onNavigateProject } = ctx;
  const projectsById = new Map(rootProjects.map((p) => [p.id, p]));
  const tasksById = new Map(allTasks.map((t) => [t.id, t]));

  const outstanding = allTasks.filter((t) => !t.completed);
  const spotlight = outstanding
    .filter((t) => t.priority || isUrgent(t))
    .sort(spotlightSort);

  const currentTask = userDoc.currentTaskId ? tasksById.get(userDoc.currentTaskId) : null;

  const deadlineSoon = outstanding.filter((t) => t.deadline && t.deadline - Date.now() <= 7 * 24 * 60 * 60 * 1000).length;

  const perProject = rootProjects.map((p) => ({
    project: p,
    count: outstanding.filter((t) => t.projectId === p.id).length,
  }));

  container.innerHTML = `
    <div class="dashboard">
      <section class="progress-panel">
        <div class="progress-header">
          <div>
            <div class="lifetime-points">${userDoc.lifetimePoints || 0}</div>
            <div class="lifetime-label">lifetime points</div>
          </div>
          <button type="button" id="edit-rewards-btn" class="btn btn-ghost btn-small">Edit rewards</button>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${userDoc.progressPoints || 0}%"></div>
        </div>
        <div class="progress-caption">${userDoc.progressPoints || 0} / 100 toward next celebration</div>
      </section>

      ${currentTask ? `
        <section class="current-task-banner">
          <span>Currently working on</span>
          <strong>${escapeHtml(currentTask.name)}</strong>
        </section>
      ` : ""}

      <section class="summary-row">
        <div class="summary-card">
          <div class="summary-num">${outstanding.length}</div>
          <div class="summary-label">outstanding tasks</div>
        </div>
        <div class="summary-card">
          <div class="summary-num">${deadlineSoon}</div>
          <div class="summary-label">due within 7 days</div>
        </div>
        <div class="summary-card">
          <div class="summary-num">${rootProjects.length}</div>
          <div class="summary-label">active projects</div>
        </div>
      </section>

      <section class="spotlight-section">
        <h2>Priority &amp; urgent</h2>
        ${spotlight.length ? `<div class="task-list">${spotlight.map((t) => taskRow(t, projectsById, userDoc.currentTaskId)).join("")}</div>` : `<p class="empty-hint">Nothing flagged as priority or urgent right now.</p>`}
      </section>

      <section class="projects-overview">
        <h2>All projects</h2>
        <div class="project-summary-list">
          ${perProject.map((p) => `
            <button type="button" class="project-summary-row" data-project-id="${p.project.id}">
              <span class="project-summary-name">${escapeHtml(p.project.name)}</span>
              <span class="project-summary-count">${p.count} outstanding</span>
            </button>
          `).join("") || `<p class="empty-hint">No projects yet. Create one to get started.</p>`}
        </div>
      </section>
    </div>
  `;

  container.querySelectorAll(".task-complete-checkbox").forEach((cb) => {
    cb.addEventListener("change", async () => {
      const task = tasksById.get(cb.dataset.id);
      cb.disabled = true;
      await completeTask(uid, task, userDoc.rewardTiers);
    });
  });

  container.querySelectorAll(".task-start-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const task = tasksById.get(btn.dataset.id);
      btn.disabled = true;
      await startWorkingOn(uid, userDoc.currentTaskId, tasksById, task);
    });
  });

  container.querySelectorAll(".project-summary-row").forEach((row) => {
    row.addEventListener("click", () => onNavigateProject(row.dataset.projectId));
  });

  container.querySelector("#edit-rewards-btn").addEventListener("click", () => openRewardsEditor(uid, userDoc.rewardTiers));
}

function spotlightSort(a, b) {
  const overdueDiff = Number(isOverdue(b)) - Number(isOverdue(a));
  if (overdueDiff) return overdueDiff;
  const urgentDiff = Number(isUrgent(b)) - Number(isUrgent(a));
  if (urgentDiff) return urgentDiff;
  const priorityDiff = Number(!!b.priority) - Number(!!a.priority);
  if (priorityDiff) return priorityDiff;
  const ad = a.deadline || Infinity;
  const bd = b.deadline || Infinity;
  return ad - bd;
}

function taskRow(t, projectsById, currentTaskId) {
  const project = projectsById.get(t.projectId);
  const urgent = isUrgent(t);
  const overdue = isOverdue(t);
  const isCurrent = t.id === currentTaskId;
  return `
    <div class="task-row ${urgent ? "task-urgent" : ""}">
      <input type="checkbox" class="task-complete-checkbox" data-id="${t.id}" ${t.completed ? "checked disabled" : ""} />
      <div class="task-info">
        <div class="task-name">${escapeHtml(t.name)} ${t.priority ? '<span class="badge badge-priority">Priority · 2pt</span>' : '<span class="badge">1pt</span>'} ${urgent ? `<span class="badge badge-urgent">${overdue ? "Overdue" : "Urgent"}</span>` : ""}</div>
        <div class="task-meta">${project ? escapeHtml(project.name) : ""}${t.deadline ? ` · due ${formatDeadline(t.deadline)}` : ""}</div>
      </div>
      ${!t.completed ? `<button type="button" class="btn btn-small task-start-btn" data-id="${t.id}">${isCurrent ? "In progress" : "Start"}</button>` : ""}
    </div>
  `;
}

function openRewardsEditor(uid, currentTiers) {
  let tiers = currentTiers.map((t) => ({ ...t }));

  function draw() {
    const card = openModal(`
      <h2>Your reward tiers</h2>
      <div id="tier-list" class="tier-list">
        ${tiers.map((t) => `
          <div class="tier-row">
            <span class="tier-points">${t.threshold} pts</span>
            <span class="tier-reward">${escapeHtml(t.reward)}</span>
            <button type="button" class="tier-remove" data-id="${t.id}" aria-label="Remove">&times;</button>
          </div>
        `).join("") || `<p class="empty-hint">No tiers yet.</p>`}
      </div>
      <form id="tier-form" class="tier-form">
        <input type="number" min="1" id="tier-points" placeholder="Points" required />
        <input type="text" id="tier-reward" placeholder="Reward" required />
        <button type="submit" class="btn btn-secondary">Add</button>
      </form>
      <div class="modal-actions">
        <button type="button" class="btn btn-primary btn-block" id="tiers-save-btn">Save</button>
      </div>
    `);

    card.querySelectorAll(".tier-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        tiers = tiers.filter((t) => t.id !== btn.dataset.id);
        draw();
      });
    });
    card.querySelector("#tier-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const threshold = parseInt(card.querySelector("#tier-points").value, 10);
      const reward = card.querySelector("#tier-reward").value.trim();
      if (!threshold || !reward) return;
      tiers.push({ id: newId(), threshold, reward });
      tiers.sort((a, b) => a.threshold - b.threshold);
      draw();
    });
    card.querySelector("#tiers-save-btn").addEventListener("click", async () => {
      await updateUserDoc(uid, { rewardTiers: tiers });
      closeModal();
    });
  }

  draw();
}
