// Priority, ordering and date helpers shared across the app.

export const PRIORITIES = [
  { value: 1, name: 'Red', trello: 'red', hex: '#e5484d', key: '1' },
  { value: 2, name: 'Orange', trello: 'orange', hex: '#f76b15', key: '2' },
  { value: 3, name: 'Yellow', trello: 'yellow', hex: '#f2c200', key: '3' },
];
export const priorityHex = (p) => PRIORITIES.find((x) => x.value === p)?.hex;

/** Band rank: red 1, orange 2, yellow 3, none 4. */
export const rank = (p) => (p >= 1 && p <= 3 ? p : 4);

export const byPriorityThenOrder = (a, b) =>
  rank(a.priority) - rank(b.priority) || (a.order ?? 0) - (b.order ?? 0) || (a.createdAt ?? 0) - (b.createdAt ?? 0);

export const sortCards = (cards) => [...cards].sort(byPriorityThenOrder);

/** Order value between two neighbours (either may be null). */
export function orderBetween(prev, next) {
  if (prev == null && next == null) return 0;
  if (prev == null) return next - 1;
  if (next == null) return prev + 1;
  return (prev + next) / 2;
}

// ---- dates (local time) ----
export const dateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k, n) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};
export const todayKey = () => dateKey(new Date());

export function fmtTime(min, short = false) {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h = h24 % 12 || 12;
  const ap = h24 < 12 ? 'am' : 'pm';
  if (short) return m ? `${h}:${String(m).padStart(2, '0')}${ap[0]}` : `${h}${ap[0]}`;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

export function fmtDayLabel(k) {
  const d = parseKey(k);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

/** Checklist progress from a description's HTML. */
export function checklistProgress(html) {
  if (!html) return null;
  const done = (html.match(/data-checked="true"/g) || []).length;
  const open = (html.match(/data-checked="false"/g) || []).length;
  return done + open ? { done, total: done + open } : null;
}

export const hasText = (html) => Boolean(html && html.replace(/<[^>]*>/g, '').trim());
