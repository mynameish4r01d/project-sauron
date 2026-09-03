import {
  doc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

/**
 * Adds points to lifetime + progress totals. When progress hits/exceeds 100,
 * it wraps around (overflow keeps accumulating toward the next bar) and the
 * caller is told a celebration is due.
 * Returns { lifetimePoints, progressPoints, celebrate }.
 */
export async function addPoints(uid, points) {
  const ref = doc(db, "users", uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const lifetimePoints = (data.lifetimePoints || 0) + points;
    let progressPoints = (data.progressPoints || 0) + points;
    let celebrate = false;
    if (progressPoints >= 100) {
      celebrate = true;
      progressPoints = progressPoints - 100;
    }
    tx.update(ref, { lifetimePoints, progressPoints });
    return { lifetimePoints, progressPoints, celebrate };
  });
}
