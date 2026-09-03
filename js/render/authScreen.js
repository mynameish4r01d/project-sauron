import { signInWithEmail, signUpWithEmail, signInWithGoogle, friendlyAuthError } from "../auth.js";

export function renderAuthScreen(container) {
  let mode = "signin";

  function draw() {
    container.innerHTML = `
      <div class="auth-shell">
        <div class="auth-card">
          <h1 class="brand">Project Overview</h1>
          <p class="tagline">Fewer excuses. More done.</p>

          <div class="auth-tabs">
            <button type="button" class="auth-tab ${mode === "signin" ? "active" : ""}" data-mode="signin">Sign in</button>
            <button type="button" class="auth-tab ${mode === "signup" ? "active" : ""}" data-mode="signup">Create account</button>
          </div>

          <form id="auth-form">
            ${mode === "signup" ? `<input type="text" id="auth-name" placeholder="Your name" autocomplete="name" />` : ""}
            <input type="email" id="auth-email" placeholder="Email" autocomplete="email" required />
            <input type="password" id="auth-password" placeholder="Password" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" required minlength="6" />
            <div id="auth-error" class="form-error"></div>
            <button type="submit" class="btn btn-primary btn-block">${mode === "signup" ? "Create account" : "Sign in"}</button>
          </form>

          <div class="auth-divider"><span>or</span></div>

          <button type="button" id="google-btn" class="btn btn-google btn-block">Continue with Google</button>
        </div>
      </div>
    `;

    container.querySelectorAll(".auth-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.dataset.mode;
        draw();
      });
    });

    const form = container.querySelector("#auth-form");
    const errorBox = container.querySelector("#auth-error");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorBox.textContent = "";
      const email = container.querySelector("#auth-email").value.trim();
      const password = container.querySelector("#auth-password").value;
      const submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      try {
        if (mode === "signup") {
          const name = container.querySelector("#auth-name").value.trim();
          await signUpWithEmail(name, email, password);
        } else {
          await signInWithEmail(email, password);
        }
      } catch (err) {
        errorBox.textContent = friendlyAuthError(err);
        submitBtn.disabled = false;
      }
    });

    container.querySelector("#google-btn").addEventListener("click", async () => {
      errorBox.textContent = "";
      try {
        await signInWithGoogle();
      } catch (err) {
        errorBox.textContent = friendlyAuthError(err);
      }
    });
  }

  draw();
}
