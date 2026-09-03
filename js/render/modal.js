import { escapeHtml } from "../utils.js";

const root = () => document.getElementById("modal-root");

export function closeModal() {
  root().innerHTML = "";
}

export function openModal(innerHtml) {
  root().innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card">${innerHtml}</div>
    </div>
  `;
  return root().querySelector(".modal-card");
}

export function promptSwitchReason(fromNode, toNode) {
  return new Promise((resolve) => {
    const card = openModal(`
      <h2>Switching tasks?</h2>
      <p class="modal-sub">You're still mid-way through <strong>${escapeHtml(fromNode.name)}</strong> and about to jump to <strong>${escapeHtml(toNode.name)}</strong>.</p>
      <label class="field-label" for="switch-reason-input">Why are you switching? (optional)</label>
      <textarea id="switch-reason-input" rows="3" placeholder="e.g. this came up urgently, I got distracted, waiting on a reply..."></textarea>
      <div class="modal-actions">
        <button type="button" class="btn btn-primary" id="switch-confirm-btn">Switch anyway</button>
      </div>
    `);
    const input = card.querySelector("#switch-reason-input");
    input.focus();
    card.querySelector("#switch-confirm-btn").addEventListener("click", () => {
      const reason = input.value.trim();
      closeModal();
      resolve(reason);
    });
  });
}

export function promptText({ title, label, placeholder = "", confirmLabel = "Save", withDeadline = false, withPriority = false }) {
  return new Promise((resolve) => {
    const card = openModal(`
      <h2>${escapeHtml(title)}</h2>
      <label class="field-label" for="prompt-input">${escapeHtml(label)}</label>
      <input id="prompt-input" type="text" placeholder="${escapeHtml(placeholder)}" autocomplete="off" />
      ${withPriority ? `
        <label class="checkbox-row">
          <input type="checkbox" id="prompt-priority" />
          Mark as priority (worth 2 points, locked in once created)
        </label>
      ` : ""}
      ${withDeadline ? `
        <label class="field-label" for="prompt-deadline">Deadline (optional)</label>
        <input id="prompt-deadline" type="date" />
      ` : ""}
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="prompt-cancel-btn">Cancel</button>
        <button type="button" class="btn btn-primary" id="prompt-save-btn">${escapeHtml(confirmLabel)}</button>
      </div>
    `);
    const input = card.querySelector("#prompt-input");
    input.focus();

    const cleanup = (result) => {
      closeModal();
      resolve(result);
    };

    card.querySelector("#prompt-cancel-btn").addEventListener("click", () => cleanup(null));
    card.querySelector("#prompt-save-btn").addEventListener("click", () => {
      const name = input.value.trim();
      if (!name) {
        input.focus();
        input.classList.add("input-error");
        return;
      }
      const priority = withPriority ? card.querySelector("#prompt-priority").checked : false;
      let deadline = null;
      if (withDeadline) {
        const raw = card.querySelector("#prompt-deadline").value;
        if (raw) deadline = new Date(raw + "T23:59:59").getTime();
      }
      cleanup({ name, priority, deadline });
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !withDeadline && !withPriority) {
        card.querySelector("#prompt-save-btn").click();
      }
    });
  });
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const card = openModal(`
      <h2>Are you sure?</h2>
      <p class="modal-sub">${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="confirm-no-btn">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirm-yes-btn">Delete</button>
      </div>
    `);
    card.querySelector("#confirm-no-btn").addEventListener("click", () => { closeModal(); resolve(false); });
    card.querySelector("#confirm-yes-btn").addEventListener("click", () => { closeModal(); resolve(true); });
  });
}
