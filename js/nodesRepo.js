import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

function userRef(uid) {
  return doc(db, "users", uid);
}
function nodesCol(uid) {
  return collection(db, "users", uid, "nodes");
}
function nodeRef(uid, nodeId) {
  return doc(db, "users", uid, "nodes", nodeId);
}
function switchLogCol(uid) {
  return collection(db, "users", uid, "switchLog");
}

export async function ensureUserDoc(user) {
  const ref = userRef(user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || "",
      email: user.email || "",
      lifetimePoints: 0,
      progressPoints: 0,
      rewardTiers: [],
      onboardingComplete: false,
      currentTaskId: null,
      createdAt: serverTimestamp(),
    });
  }
  return ref;
}

export function watchUserDoc(uid, cb) {
  return onSnapshot(userRef(uid), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function updateUserDoc(uid, patch) {
  return updateDoc(userRef(uid), patch);
}

export function watchRootProjects(uid, cb) {
  const q = query(nodesCol(uid), where("parentId", "==", null), where("type", "==", "folder"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
    cb(items);
  });
}

export function watchProjectNodes(uid, projectId, cb) {
  const q = query(nodesCol(uid), where("projectId", "==", projectId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
    cb(items);
  });
}

export function watchAllTasks(uid, cb) {
  const q = query(nodesCol(uid), where("type", "==", "task"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

function tsMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  return 0;
}

export async function createProject(uid, name) {
  const ref = doc(nodesCol(uid));
  await setDoc(ref, {
    type: "folder",
    name,
    parentId: null,
    projectId: ref.id,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createFolder(uid, { name, parentId, projectId }) {
  const ref = await addDoc(nodesCol(uid), {
    type: "folder",
    name,
    parentId,
    projectId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createTask(uid, { name, parentId, projectId, priority, deadline }) {
  const ref = await addDoc(nodesCol(uid), {
    type: "task",
    name,
    parentId,
    projectId,
    createdAt: serverTimestamp(),
    completed: false,
    completedAt: null,
    priority: !!priority,
    points: priority ? 2 : 1,
    deadline: deadline || null,
    startedAt: null,
    nextReminderAt: null,
    reminderActive: false,
  });
  return ref.id;
}

export function updateNode(uid, nodeId, patch) {
  return updateDoc(nodeRef(uid, nodeId), patch);
}

export async function deleteNodeRecursive(uid, nodeId, allProjectNodes) {
  const children = allProjectNodes.filter((n) => n.parentId === nodeId);
  for (const child of children) {
    await deleteNodeRecursive(uid, child.id, allProjectNodes);
  }
  await deleteDoc(nodeRef(uid, nodeId));
}

export function logSwitch(uid, entry) {
  return addDoc(switchLogCol(uid), { ...entry, at: serverTimestamp() });
}
