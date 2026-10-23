// Color themes. Each sets the app chrome (CSS variables), the three customizable colors and the priority colors.
// A board stores `look: { theme, backgroundId, ...overrides }`; anything missing falls back to its theme.
export const THEMES = [
  { id: 'midnight', name: 'Midnight',
    vars: { '--bg-1': '#0f172a', '--bg-2': '#1e293b', '--bg-3': '#334155', '--topbar': 'rgba(2, 6, 23, 0.55)', '--list': '#0b1220', '--card': '#1e293b', '--card-hover': '#273449', '--panel': '#111a2e', '--panel-2': '#1b273d', '--accent-2': '#60a5fa' },
    colors: { defaultBlockColor: '#93c5fd', addListColor: '#fbbf24', newCardColor: '#93c5fd' },
    priority: { 1: '#f87171', 2: '#fb923c', 3: '#facc15' } },
  { id: 'aurora', name: 'Aurora',
    vars: { '--bg-1': '#6f3fb5', '--bg-2': '#5b6fd6', '--bg-3': '#7aa3d9', '--topbar': 'rgba(16, 12, 30, 0.38)', '--list': '#101204', '--card': '#22272b', '--card-hover': '#2c333a', '--panel': '#1d2125', '--panel-2': '#282e33', '--accent-2': '#579dff' },
    colors: { defaultBlockColor: '#aac7f8', addListColor: '#f2c200', newCardColor: '#aac7f8' },
    priority: { 1: '#e5484d', 2: '#f76b15', 3: '#f2c200' } },
  { id: 'forest', name: 'Forest',
    vars: { '--bg-1': '#134e4a', '--bg-2': '#166534', '--bg-3': '#4d7c0f', '--topbar': 'rgba(4, 22, 12, 0.45)', '--list': '#08140d', '--card': '#1c2a22', '--card-hover': '#25372c', '--panel': '#122019', '--panel-2': '#1b2e24', '--accent-2': '#4ade80' },
    colors: { defaultBlockColor: '#a7f3d0', addListColor: '#fde68a', newCardColor: '#86efac' },
    priority: { 1: '#f87171', 2: '#fb923c', 3: '#fde047' } },
  { id: 'ocean', name: 'Ocean',
    vars: { '--bg-1': '#0c4a6e', '--bg-2': '#0e7490', '--bg-3': '#5eead4', '--topbar': 'rgba(3, 20, 32, 0.45)', '--list': '#06151c', '--card': '#14272f', '--card-hover': '#1c353f', '--panel': '#0d1f27', '--panel-2': '#16303a', '--accent-2': '#38bdf8' },
    colors: { defaultBlockColor: '#a5f3fc', addListColor: '#fcd34d', newCardColor: '#7dd3fc' },
    priority: { 1: '#fb7185', 2: '#fb923c', 3: '#fde047' } },
  { id: 'sunset', name: 'Sunset',
    vars: { '--bg-1': '#7c2d52', '--bg-2': '#c2410c', '--bg-3': '#e8a14a', '--topbar': 'rgba(30, 10, 10, 0.42)', '--list': '#1a0d10', '--card': '#2a1a1d', '--card-hover': '#382328', '--panel': '#22130f', '--panel-2': '#301d18', '--accent-2': '#fb923c' },
    colors: { defaultBlockColor: '#fcd5b0', addListColor: '#ffd166', newCardColor: '#fdba74' },
    priority: { 1: '#ef4444', 2: '#f97316', 3: '#facc15' } },
  { id: 'rose', name: 'Rose',
    vars: { '--bg-1': '#6b21a8', '--bg-2': '#be185d', '--bg-3': '#fb7185', '--topbar': 'rgba(26, 8, 20, 0.42)', '--list': '#180a12', '--card': '#281723', '--card-hover': '#36202f', '--panel': '#1f1019', '--panel-2': '#2d1a26', '--accent-2': '#f472b6' },
    colors: { defaultBlockColor: '#fbcfe8', addListColor: '#fde68a', newCardColor: '#f9a8d4' },
    priority: { 1: '#ff5c7a', 2: '#ff9f43', 3: '#ffd93d' } },
  { id: 'graphite', name: 'Graphite',
    vars: { '--bg-1': '#18181b', '--bg-2': '#27272a', '--bg-3': '#3f3f46', '--topbar': 'rgba(0, 0, 0, 0.5)', '--list': '#0a0a0b', '--card': '#202024', '--card-hover': '#2a2a30', '--panel': '#161618', '--panel-2': '#222226', '--accent-2': '#8ab4ff' },
    colors: { defaultBlockColor: '#d4d4d8', addListColor: '#fbbf24', newCardColor: '#d4d4d8' },
    priority: { 1: '#ff6b6b', 2: '#ffa94d', 3: '#ffe066' } },
  { id: 'lavender', name: 'Lavender',
    vars: { '--bg-1': '#4c1d95', '--bg-2': '#7c3aed', '--bg-3': '#c4b5fd', '--topbar': 'rgba(20, 10, 40, 0.42)', '--list': '#120d20', '--card': '#221a36', '--card-hover': '#2c2246', '--panel': '#19122b', '--panel-2': '#251c3b', '--accent-2': '#a78bfa' },
    colors: { defaultBlockColor: '#ddd6fe', addListColor: '#fde68a', newCardColor: '#c4b5fd' },
    priority: { 1: '#fb7185', 2: '#fb923c', 3: '#fde047' } },
  { id: 'dusk', name: 'Dusk',
    vars: { '--bg-1': '#1e1b4b', '--bg-2': '#6d28d9', '--bg-3': '#fb7185', '--topbar': 'rgba(10, 8, 30, 0.45)', '--list': '#0e0d1f', '--card': '#1c1b36', '--card-hover': '#26254a', '--panel': '#14132b', '--panel-2': '#1e1d3a', '--accent-2': '#818cf8' },
    colors: { defaultBlockColor: '#c7d2fe', addListColor: '#fcd34d', newCardColor: '#a5b4fc' },
    priority: { 1: '#fb7185', 2: '#fb923c', 3: '#fde047' } },
  { id: 'mint', name: 'Mint',
    vars: { '--bg-1': '#064e3b', '--bg-2': '#0f766e', '--bg-3': '#99f6e4', '--topbar': 'rgba(2, 20, 18, 0.45)', '--list': '#061815', '--card': '#142a27', '--card-hover': '#1c3935', '--panel': '#0c1f1c', '--panel-2': '#14302c', '--accent-2': '#2dd4bf' },
    colors: { defaultBlockColor: '#99f6e4', addListColor: '#fde68a', newCardColor: '#5eead4' },
    priority: { 1: '#f87171', 2: '#fb923c', 3: '#fde047' } },
  { id: 'cocoa', name: 'Cocoa',
    vars: { '--bg-1': '#3b2417', '--bg-2': '#78350f', '--bg-3': '#b45309', '--topbar': 'rgba(20, 10, 5, 0.45)', '--list': '#150d08', '--card': '#2a1d15', '--card-hover': '#36261c', '--panel': '#1e140d', '--panel-2': '#2b1d14', '--accent-2': '#fbbf24' },
    colors: { defaultBlockColor: '#f5deb3', addListColor: '#fbbf24', newCardColor: '#e7c9a0' },
    priority: { 1: '#ef4444', 2: '#f97316', 3: '#facc15' } },
  { id: 'ember', name: 'Ember',
    vars: { '--bg-1': '#450a0a', '--bg-2': '#991b1b', '--bg-3': '#ea580c', '--topbar': 'rgba(20, 5, 5, 0.5)', '--list': '#140707', '--card': '#261414', '--card-hover': '#331b1b', '--panel': '#1c0e0e', '--panel-2': '#291515', '--accent-2': '#f87171' },
    colors: { defaultBlockColor: '#fecaca', addListColor: '#fcd34d', newCardColor: '#fca5a5' },
    priority: { 1: '#fb7185', 2: '#fb923c', 3: '#fde047' } },
];

export const DEFAULT_THEME_ID = 'midnight';
export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES.find((t) => t.id === DEFAULT_THEME_ID);

/** The effective appearance of a board: its theme plus any per-board color overrides. */
export function resolveLook(board) {
  const l = board?.look || {};
  const t = themeById(l.theme);
  return {
    themeId: t.id,
    theme: t,
    defaultBlockColor: l.defaultBlockColor || t.colors.defaultBlockColor,
    addListColor: l.addListColor || t.colors.addListColor,
    newCardColor: l.newCardColor || t.colors.newCardColor,
    priorityColors: { ...t.priority, ...(l.priorityColors || {}) },
    backgroundId: l.backgroundId || null,
  };
}

/** Apply a theme's CSS variables to the page, and remember it so the next load has no flash. */
export function applyTheme(id) {
  const t = themeById(id);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v);
  try { localStorage.setItem('bd-theme', t.id); } catch { /* ignore */ }
}

/** Apply priority colors (1=red, 2=orange, 3=yellow) as CSS variables; cached for a flash-free next load. */
export function applyPriorityColors(colors) {
  const c = { ...themeById(DEFAULT_THEME_ID).priority, ...(colors || {}) };
  const root = document.documentElement;
  for (const n of [1, 2, 3]) root.style.setProperty(`--prio-${n}`, c[n]);
  try { localStorage.setItem('bd-prio', JSON.stringify(c)); } catch { /* ignore */ }
}
