import { escapeHtml, formatDeadline, isUrgent, isOverdue } from "../utils.js";
import { completeTask, startWorkingOn } from "../actions.js";
import { createFolder, createTask, deleteNodeRecursive } from "../nodesRepo.js";
import { promptText, confirmDialog } from "./modal.js";

const collapsedByProject = new Map();

export function renderProjectTree(container, ctx) {
  const { uid, project, nodes, userDoc, tasksById, onBack, onDeleted } = ctx;
  if (!collapsedByProject.has(project.id)) collapsedByProject.set(project.id, new Set());
  const collapsed = collapsedByProject.get(project.id);

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = (parentId) => nodes.filter((n) => n.parentId === parentId);

  function draw() {
    container.innerHTML = `
      <div class="project-view">
        <button type="button" id="back-btn" class="btn btn-ghost btn-small">&larr; All projects</button>
        <div class="project-title-row">
          <h1>${escapeHtml(project.name)}</h1>
          <div class="project-title-actions">
            <button type="button" class="btn btn-small" id="add-subfolder-root">+ Sub-folder</button>
            <button type="button" class="btn btn-small btn-secondary" id="add-task-root">+ Task</button>
            <button type="button" class="btn btn-small btn-danger" id="delete-project-btn">Delete project</button>
          </div>
        </div>
        <div class="tree-root">
          ${childrenOf(project.id).map((n) => renderNode(n, 0)).join("") || `<p class="empty-hint">Nothing here yet. Add a sub-folder or a task.</p>`}
        </div>
      </div>
    `;

    container.querySelector("#back-btn").addEventListener("click", onBack);
    container.querySelector("#add-subfolder-root").addEventListener("click", () => addFolder(project.id));
    container.querySelector("#add-task-root").addEventListener("click", () => addTask(project.id));
    container.querySelector("#delete-project-btn").addEventListener("click", async () => {
      const ok = await confirmDialog(`Delete the entire "${project.name}" project and everything inside it? This can't be undone.`);
      if (!ok) return;
      await deleteNodeRecursive(uid, project.id, nodes);
      if (onDeleted) onDeleted(project.id);
      onBack();
    });

    wireFolderControls();
    wireTaskControls();
  }

  function renderNode(node, depth) {
    if (node.type === "folder") return renderFolder(node, depth);
    return renderTask(node, depth);
  }

  function renderFolder(node, depth) {
    const isCollapsed = collapsed.has(node.id);
    const kids = childrenOf(node.id);
    return `
      <div class="tree-folder" style="--depth:${depth}">
        <div class="tree-folder-header">
          <button type="button" class="tree-toggle" data-id="${node.id}">${isCollapsed ? "▸" : "▾"}</button>
          <span class="tree-folder-icon">📁</span>
          <span class="tree-folder-name">${escapeHtml(node.name)}</span>
          <div class="tree-folder-actions">
            <button type="button" class="btn btn-tiny add-subfolder-btn" data-id="${node.id}">+ folder</button>
            <button type="button" class="btn btn-tiny btn-secondary add-task-btn" data-id="${node.id}">+ task</button>
            <button type="button" class="btn btn-tiny btn-danger delete-node-btn" data-id="${node.id}">delete</button>
          </div>
        </div>
        ${!isCollapsed ? `<div class="tree-children">${kids.map((k) => renderNode(k, depth + 1)).join("") || `<p class="empty-hint indent">Empty folder.</p>`}</div>` : ""}
      </div>
    `;
  }

  function renderTask(t, depth) {
    const urgent = isUrgent(t);
    const overdue = isOverdue(t);
    const isCurrent = t.id === userDoc.currentTaskId;
    return `
      <div class="tree-task ${urgent ? "task-urgent" : ""}" style="--depth:${depth}">
        <input type="checkbox" class="task-complete-checkbox" data-id="${t.id}" ${t.completed ? "checked disabled" : ""} />
        <div class="task-info">
          <div class="task-name">${escapeHtml(t.name)} ${t.priority ? '<span class="badge badge-priority">Priority · 2pt</span>' : '<span class="badge">1pt</span>'} ${urgent ? `<span class="badge badge-urgent">${overdue ? "Overdue" : "Urgent"}</span>` : ""}</div>
          ${t.deadline ? `<div class="task-meta">due ${formatDeadline(t.deadline)}</div>` : ""}
        </div>
        ${!t.completed ? `<button type="button" class="btn btn-tiny task-start-btn" data-id="${t.id}">${isCurrent ? "In progress" : "Start"}</button>` : ""}
        <button type="button" class="btn btn-tiny btn-danger delete-node-btn" data-id="${t.id}">delete</button>
      </div>
    `;
  }

  function wireFolderControls() {
    container.querySelectorAll(".tree-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (collapsed.has(btn.dataset.id)) collapsed.delete(btn.dataset.id);
        else collapsed.add(btn.dataset.id);
        draw();
      });
    });
    container.querySelectorAll(".add-subfolder-btn").forEach((btn) => {
      btn.addEventListener("click", () => addFolder(btn.dataset.id));
    });
    container.querySelectorAll(".add-task-btn").forEach((btn) => {
      btn.addEventListener("click", () => addTask(btn.dataset.id));
    });
    container.querySelectorAll(".delete-node-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const node = nodesById.get(btn.dataset.id);
        const ok = await confirmDialog(
          node.type === "folder"
            ? `Delete "${node.name}" and everything inside it? This can't be undone.`
            : `Delete task "${node.name}"? This can't be undone.`
        );
        if (!ok) return;
        await deleteNodeRecursive(uid, node.id, nodes);
        if (onDeleted) onDeleted(node.id);
      });
    });
  }

  function wireTaskControls() {
    container.querySelectorAll(".task-complete-checkbox").forEach((cb) => {
      cb.addEventListener("change", async () => {
        const task = nodesById.get(cb.dataset.id);
        cb.disabled = true;
        await completeTask(uid, task, userDoc.rewardTiers);
      });
    });
    container.querySelectorAll(".task-start-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const task = nodesById.get(btn.dataset.id);
        btn.disabled = true;
        await startWorkingOn(uid, userDoc.currentTaskId, tasksById, task);
      });
    });
  }

  async function addFolder(parentId) {
    const result = await promptText({ title: "New sub-folder", label: "Folder name", confirmLabel: "Create" });
    if (!result) return;
    await createFolder(uid, { name: result.name, parentId, projectId: project.id });
  }

  async function addTask(parentId) {
    const result = await promptText({
      title: "New task",
      label: "Task name",
      confirmLabel: "Create",
      withPriority: true,
      withDeadline: true,
    });
    if (!result) return;
    await createTask(uid, {
      name: result.name,
      parentId,
      projectId: project.id,
      priority: result.priority,
      deadline: result.deadline,
    });
  }

  draw();
}
