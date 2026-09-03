import { watchAuthState, signOutUser } from "./auth.js";
import {
  watchUserDoc,
  watchRootProjects,
  watchProjectNodes,
  watchAllTasks,
  createProject,
} from "./nodesRepo.js";
import { renderAuthScreen } from "./render/authScreen.js";
import { renderOnboarding } from "./render/onboarding.js";
import { renderDashboard } from "./render/dashboard.js";
import { renderProjectTree } from "./render/projectTree.js";
import { renderReminders } from "./render/reminderBanner.js";
import { findDueReminders } from "./reminders.js";
import { promptText } from "./render/modal.js";
import { escapeHtml } from "./utils.js";

const app = document.getElementById("app");

let unsubscribers = [];
function clearSubs() {
  unsubscribers.forEach((fn) => fn && fn());
  unsubscribers = [];
}

let state = {
  user: null,
  userDoc: null,
  rootProjects: [],
  allTasks: [],
  view: "dashboard", // 'dashboard' | 'project'
  currentProjectId: null,
  currentProjectNodes: [],
};

let reminderInterval = null;

watchAuthState((user) => {
  clearSubs();
  state = { user, userDoc: null, rootProjects: [], allTasks: [], view: "dashboard", currentProjectId: null, currentProjectNodes: [] };

  if (!user) {
    document.getElementById("reminder-root").innerHTML = "";
    if (reminderInterval) clearInterval(reminderInterval);
    renderAuthScreen(app);
    return;
  }

  const unsubUser = watchUserDoc(user.uid, (doc) => {
    state.userDoc = doc;
    render();
  });
  const unsubProjects = watchRootProjects(user.uid, (projects) => {
    state.rootProjects = projects;
    render();
  });
  const unsubTasks = watchAllTasks(user.uid, (tasks) => {
    state.allTasks = tasks;
    render();
    checkReminders();
  });
  unsubscribers = [unsubUser, unsubProjects, unsubTasks];

  if (reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(checkReminders, 30 * 1000);
});

function checkReminders() {
  if (!state.user || !state.allTasks.length) {
    document.getElementById("reminder-root").innerHTML = "";
    return;
  }
  const due = findDueReminders(state.allTasks);
  renderReminders(state.user.uid, due);
}

function navigateToProject(projectId) {
  clearProjectSub();
  state.view = "project";
  state.currentProjectId = projectId;
  const unsub = watchProjectNodes(state.user.uid, projectId, (nodes) => {
    state.currentProjectNodes = nodes;
    render();
  });
  unsubscribers.push(unsub);
  render();
}

function backToDashboard() {
  clearProjectSub();
  state.view = "dashboard";
  state.currentProjectId = null;
  state.currentProjectNodes = [];
  render();
}

function clearProjectSub() {
  // The project-nodes subscription is always the last one pushed after the
  // three base subscriptions (user/projects/tasks); drop it if present.
  if (unsubscribers.length > 3) {
    const fn = unsubscribers.pop();
    if (fn) fn();
  }
}

function render() {
  if (!state.user) return;
  if (!state.userDoc) {
    app.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
    return;
  }
  if (!state.userDoc.onboardingComplete) {
    renderOnboarding(app, state.user.uid);
    return;
  }

  const outstandingByProject = new Map();
  state.allTasks.forEach((t) => {
    if (t.completed) return;
    outstandingByProject.set(t.projectId, (outstandingByProject.get(t.projectId) || 0) + 1);
  });
  const isDashboard = state.view !== "project";

  app.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <span class="brand-small">Project Overview</span>
        <button type="button" id="sign-out-btn" class="btn btn-small btn-ghost">Sign out</button>
      </header>
      <div class="app-body">
        <aside class="sidebar">
          <button type="button" id="new-project-btn" class="btn btn-secondary btn-small btn-block">+ New project</button>
          <button type="button" class="sidebar-link ${isDashboard ? "active" : ""}" id="sidebar-dashboard-link">🏠 Dashboard</button>
          <div class="sidebar-section-label">Projects</div>
          <nav class="sidebar-projects">
            ${state.rootProjects.map((p) => `
              <button type="button" class="sidebar-link ${p.id === state.currentProjectId ? "active" : ""}" data-project-id="${p.id}">
                <span class="sidebar-link-name">${escapeHtml(p.name)}</span>
                ${outstandingByProject.get(p.id) ? `<span class="sidebar-count">${outstandingByProject.get(p.id)}</span>` : ""}
              </button>
            `).join("") || `<p class="empty-hint sidebar-empty-hint">No projects yet.</p>`}
          </nav>
        </aside>
        <main id="main-content"></main>
      </div>
    </div>
  `;

  document.getElementById("new-project-btn").addEventListener("click", async () => {
    const result = await promptText({ title: "New project", label: "Project name", confirmLabel: "Create" });
    if (!result) return;
    const id = await createProject(state.user.uid, result.name);
    navigateToProject(id);
  });
  document.getElementById("sign-out-btn").addEventListener("click", () => signOutUser());
  document.getElementById("sidebar-dashboard-link").addEventListener("click", backToDashboard);
  document.querySelectorAll(".sidebar-projects .sidebar-link").forEach((btn) => {
    btn.addEventListener("click", () => navigateToProject(btn.dataset.projectId));
  });

  const main = document.getElementById("main-content");

  if (state.view === "project" && state.currentProjectId) {
    const project = state.rootProjects.find((p) => p.id === state.currentProjectId);
    if (!project) {
      // Newly created project's snapshot may not have arrived yet, or it was
      // just deleted — either way, wait for the next render rather than
      // bouncing to the dashboard prematurely.
      main.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
      return;
    }
    const tasksById = new Map(state.allTasks.map((t) => [t.id, t]));
    renderProjectTree(main, {
      uid: state.user.uid,
      project,
      nodes: state.currentProjectNodes,
      userDoc: state.userDoc,
      tasksById,
      onBack: backToDashboard,
      onDeleted: () => {},
    });
  } else {
    renderDashboard(main, {
      uid: state.user.uid,
      userDoc: state.userDoc,
      allTasks: state.allTasks,
      rootProjects: state.rootProjects,
    });
  }
}
