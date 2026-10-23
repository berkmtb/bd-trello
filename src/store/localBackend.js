// Demo backend: same interface as Firestore, data kept in this browser only.
const KEY = 'planner-demo-v1';
const COLLS = ['boards', 'lists', 'cards', 'blocks', 'backgrounds', 'settings'];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable */ }
  return null;
}
function save(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ }
}

const matches = (rec, filters) => filters.every(([f, op, v]) => {
  if (op === '==') return rec[f] === v;
  if (op === 'in') return v.includes(rec[f]);
  throw new Error('Unsupported op ' + op);
});

export function createLocalBackend(seed) {
  let db = load();
  if (!db) {
    db = Object.fromEntries(COLLS.map((c) => [c, {}]));
    if (seed) seed(db);
    save(db);
  }
  for (const c of COLLS) db[c] = db[c] || {};
  const subs = new Set();
  const emit = () => {
    for (const s of subs) {
      s.cb(Object.entries(db[s.name]).map(([id, r]) => ({ id, ...r })).filter((r) => matches(r, s.filters)));
    }
  };
  try {
    window.addEventListener('storage', (e) => {
      if (e.key === KEY && e.newValue) { db = JSON.parse(e.newValue); emit(); }
    });
  } catch { /* ignore */ }

  return {
    mode: 'demo',
    newId: () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4),
    subscribe(name, filters, cb) {
      const s = { name, filters, cb };
      subs.add(s);
      queueMicrotask(() => subs.has(s) && emit());
      return () => subs.delete(s);
    },
    async commit(ops) {
      for (const o of ops) {
        const c = db[o.coll];
        if (o.op === 'set') c[o.id] = structuredClone(o.data);
        else if (o.op === 'update') c[o.id] = { ...(c[o.id] || {}), ...structuredClone(o.data) };
        else if (o.op === 'delete') delete c[o.id];
      }
      save(db);
      emit();
    },
  };
}
