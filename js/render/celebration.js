import { escapeHtml } from "../utils.js";

export function showCelebration(lifetimePoints, rewardTiers) {
  const root = document.getElementById("modal-root");
  const earned = (rewardTiers || [])
    .filter((t) => lifetimePoints >= t.threshold)
    .sort((a, b) => b.threshold - a.threshold)[0];

  root.innerHTML = `
    <div class="modal-backdrop celebration-backdrop">
      <div class="celebration-card">
        <div class="confetti">🎉</div>
        <h1>Bar filled!</h1>
        <p class="celebration-sub">You just hit another 100-point cycle.</p>
        <div class="celebration-total">${lifetimePoints} lifetime points</div>
        ${earned ? `<p class="celebration-reward">You've unlocked: <strong>${escapeHtml(earned.reward)}</strong> (${earned.threshold} pt tier)</p>` : ""}
        <button type="button" id="celebration-close" class="btn btn-primary btn-block">Keep going</button>
      </div>
    </div>
  `;

  root.querySelector("#celebration-close").addEventListener("click", () => {
    root.innerHTML = "";
  });
}
