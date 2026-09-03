# Project Overview

A personal task/project management tool built to fight procrastination — unlimited nested projects, a dashboard that keeps priority and urgent work always visible, a points-and-progress-bar reward loop with your own custom reward tiers, and a task-switching guardrail that nags you (kindly) if you abandon something mid-way.

Plain HTML/CSS/JavaScript (ES modules, no bundler/build step) backed by Firebase (Auth + Firestore), deployed as a static site on Firebase Hosting.

## One manual setup step (Firebase Console)

Everything else in this repo — the Firestore database, security rules, hosting site, and the web app registration — was created programmatically. The one thing that has to be done by hand, because Firebase doesn't expose it via any API or CLI command, is turning on sign-in providers:

1. Open the [Firebase console → Authentication](https://console.firebase.google.com/project/project-sauron-hh/authentication/providers) for this project.
2. Click **Get started**, then enable **Email/Password**.
3. Also enable **Google** as a sign-in provider (pick a support email when prompted).

Until that's done, sign-up/sign-in in the app will show "This sign-in method isn't enabled yet."

## Local development

No build step — just serve the static files and open them in a browser. Two easy options:

```bash
firebase emulators:start
```

or, without emulators (talks to the real Firestore/Auth project):

```bash
npx serve .
```

## Deploying

```bash
firebase deploy
```

This pushes both the Firestore security rules and the static site to Firebase Hosting.

## How it's structured

- `index.html` — single entry point, mounts everything into `#app`
- `css/styles.css` — all styling, no framework
- `js/firebase-config.js` — Firebase app init (Auth + Firestore handles)
- `js/auth.js` — sign-up/sign-in/sign-out
- `js/nodesRepo.js` — all Firestore reads/writes for projects, folders, and tasks
- `js/points.js` — lifetime points + the 0–100 progress bar (with celebration overflow)
- `js/reminders.js` — the 30-minute task-switching guardrail logic
- `js/actions.js` — shared complete-task / start-task actions used by both views
- `js/render/*.js` — screen renderers (auth, onboarding, dashboard, project tree, modals, celebration, reminder banners)
- `js/app.js` — wires auth state, live Firestore listeners, and view routing together

### Data model

Everything lives under `users/{uid}` in Firestore:

- `users/{uid}` — profile, lifetime/progress points, reward tiers, onboarding flag, which task you're currently "on"
- `users/{uid}/nodes/{nodeId}` — every folder and task, flat, linked by `parentId` (so folders can nest arbitrarily deep without needing real Firestore subcollections). A "project" is just a root folder (`parentId: null`). Task nodes carry `priority`, `points` (locked in at creation — 2 for priority, 1 otherwise), `deadline`, and completion state.
- `users/{uid}/switchLog/{id}` — an audit trail of every time you switched away from an in-progress task, and why

"Urgent" (within 2 days of deadline) is never stored — it's computed on the fly wherever a task is rendered, so it never touches the locked-in point value.

Security rules lock every document under a user's own `users/{uid}` tree to that user only (`firestore.rules`).

### Reminders

Reminders are **in-app only** for now (a banner + sound while the site is open in a tab) — this keeps the whole project on Firebase's free Spark plan with no billing account required. Reminder state (`nextReminderAt`, `reminderActive`) is stored on the task itself in Firestore, so the 30-minute cadence survives a page refresh; the app just polls for due reminders every 30 seconds while it's open.

## Future work (not built yet, by design)

- **Collaboration / shared projects** — everything today is single-user, locked to your own `uid`. Sharing a project with someone else would need a real membership/permissions model.
- **Cross-app notifications** — true push notifications that reach you even when the tab/browser is closed. This needs upgrading to Firebase's Blaze (pay-as-you-go) plan plus Cloud Functions and Firebase Cloud Messaging.
- **Native mobile app** — the plan is to wrap this same Firebase backend with a mobile client (e.g. Capacitor, or a native Swift/Kotlin app) once the web version has proven itself.
