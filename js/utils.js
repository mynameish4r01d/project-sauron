export const URGENT_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export function isUrgent(task) {
  if (!task || task.completed || !task.deadline) return false;
  return task.deadline - Date.now() <= URGENT_WINDOW_MS;
}

export function isOverdue(task) {
  if (!task || task.completed || !task.deadline) return false;
  return task.deadline < Date.now();
}

export function formatDeadline(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

export function mount(el, html) {
  el.innerHTML = html;
}
