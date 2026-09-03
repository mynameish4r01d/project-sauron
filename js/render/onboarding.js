import { updateUserDoc } from "../nodesRepo.js";
import { escapeHtml, newId } from "../utils.js";

export function renderOnboarding(container, uid) {
  let tiers = [];

  function draw() {
    container.innerHTML = `
      <div class="auth-shell">
        <div class="auth-card onboarding-card">
          <h1 class="brand">Welcome!</h1>
          <p class="tagline">Set up your own reward tiers. Whatever motivates you — you decide what points buy.</p>

          <div id="tier-list" class="tier-list">
            ${tiers.map((t) => tierRow(t)).join("") || `<p class="empty-hint">No reward tiers yet — add your first one below.</p>`}
          </div>

          <form id="tier-form" class="tier-form">
            <input type="number" min="1" id="tier-points" placeholder="Points" required />
            <input type="text" id="tier-reward" placeholder="Reward, e.g. 'Coffee from my favorite shop'" required />
            <button type="submit" class="btn btn-secondary">Add tier</button>
          </form>

          <button type="button" id="finish-btn" class="btn btn-primary btn-block" ${tiers.length ? "" : "disabled"}>
            ${tiers.length ? "Start using Project Overview" : "Add at least one reward to continue"}
          </button>
        </div>
      </div>
    `;

    container.querySelectorAll(".tier-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        tiers = tiers.filter((t) => t.id !== btn.dataset.id);
        draw();
      });
    });

    container.querySelector("#tier-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const pointsInput = container.querySelector("#tier-points");
      const rewardInput = container.querySelector("#tier-reward");
      const threshold = parseInt(pointsInput.value, 10);
      const reward = rewardInput.value.trim();
      if (!threshold || !reward) return;
      tiers.push({ id: newId(), threshold, reward });
      tiers.sort((a, b) => a.threshold - b.threshold);
      draw();
    });

    const finishBtn = container.querySelector("#finish-btn");
    finishBtn.addEventListener("click", async () => {
      if (!tiers.length) return;
      finishBtn.disabled = true;
      finishBtn.textContent = "Saving...";
      await updateUserDoc(uid, { rewardTiers: tiers, onboardingComplete: true });
    });
  }

  function tierRow(t) {
    return `
      <div class="tier-row">
        <span class="tier-points">${t.threshold} pts</span>
        <span class="tier-reward">${escapeHtml(t.reward)}</span>
        <button type="button" class="tier-remove" data-id="${t.id}" aria-label="Remove">&times;</button>
      </div>
    `;
  }

  draw();
}
