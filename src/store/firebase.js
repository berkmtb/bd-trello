import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, query, where, onSnapshot, writeBatch,
} from 'firebase/firestore';

const env = import.meta.env;
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured =
  !env.VITE_FORCE_DEMO && Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const allowedEmails = (env.VITE_ALLOWED_EMAILS || '')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

let app, auth, db;
function init() {
  if (app) return;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Local cache makes reloads instant and keeps working through brief offline spells.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export function watchAuth(cb) {
  init();
  return onAuthStateChanged(auth, cb);
}
export function signIn() {
  init();
  return signInWithPopup(auth, new GoogleAuthProvider());
}
export function signOutUser() {
  init();
  return signOut(auth);
}

/** Backend that stores everything under users/{uid}/{collection}. */
export function createFirestoreBackend(uid) {
  init();
  const col = (name) => collection(db, 'users', uid, name);
  return {
    mode: 'firebase',
    newId: () => doc(col('cards')).id,
    subscribe(name, filters, cb) {
      const q = filters.length
        ? query(col(name), ...filters.map(([f, op, v]) => where(f, op, v)))
        : col(name);
      return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error(`Firestore ${name} listener`, err));
    },
    async commit(ops) {
      // Firestore batches are limited to 500 writes.
      for (let i = 0; i < ops.length; i += 450) {
        const batch = writeBatch(db);
        for (const o of ops.slice(i, i + 450)) {
          const ref = doc(col(o.coll), o.id);
          if (o.op === 'set') batch.set(ref, o.data);
          else if (o.op === 'update') batch.update(ref, o.data);
          else if (o.op === 'delete') batch.delete(ref);
        }
        await batch.commit();
      }
    },
  };
}
