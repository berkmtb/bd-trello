// Color themes. Each sets the app chrome (CSS variables), the three customizable colors and the priority colors.
// A board stores `look: { theme, backgroundId, ...overrides }`; anything missing falls back to its theme.
export const THEMES = [
  { id: 'midnight', name: 'Midnight',
    vars: { '--bg-1': '#0f172a', '--bg-2': '#1e293b', '--bg-3': '#334155', '--topbar': 'rgba(2, 6, 23, 0.55)', '--list': '#0b1220', '--card': '#1e293b', '--card-hover': '#273449', '--panel': '#111a2e', '--panel-2': '#1b273d', '--accent-2': '#7ba7de' },
    colors: { defaultBlockColor: '#a8c4ec', addListColor: '#d4c58d', newCardColor: '#a8c4ec' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
  { id: 'sapphire', name: 'Sapphire',
    vars: { '--bg-1': '#262b40', '--bg-2': '#06457f', '--bg-3': '#5379ae', '--topbar': 'rgba(14, 17, 32, 0.5)', '--list': '#1a1f31', '--card': '#262b40', '--card-hover': '#303752', '--panel': '#1f2438', '--panel-2': '#292f47', '--accent-2': '#6b95cf' },
    colors: { defaultBlockColor: '#a8c4ec', addListColor: '#5379ae', newCardColor: '#a8c4ec' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
  { id: 'harbor', name: 'Harbor',
    vars: { '--bg-1': '#1b2733', '--bg-2': '#2f4a63', '--bg-3': '#4f6f8a', '--topbar': 'rgba(8, 14, 20, 0.5)', '--list': '#0e151c', '--card': '#1a2531', '--card-hover': '#233140', '--panel': '#131c25', '--panel-2': '#1c2833', '--accent-2': '#6f93b5' },
    colors: { defaultBlockColor: '#b9cbdc', addListColor: '#c9b987', newCardColor: '#9db6cf' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
  { id: 'marina', name: 'Marina',
    vars: { '--bg-1': '#1d3a50', '--bg-2': '#326080', '--bg-3': '#7ea3bd', '--topbar': 'rgba(8, 20, 30, 0.5)', '--list': '#0f1d28', '--card': '#192b3a', '--card-hover': '#223a4d', '--panel': '#13232f', '--panel-2': '#1c3040', '--accent-2': '#7fb0d6' },
    colors: { defaultBlockColor: '#b5d2e6', addListColor: '#d8c7b4', newCardColor: '#8fb8d9' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
  { id: 'ocean', name: 'Ocean',
    vars: { '--bg-1': '#16405a', '--bg-2': '#1f6a82', '--bg-3': '#6fa7ae', '--topbar': 'rgba(4, 18, 26, 0.5)', '--list': '#0a171d', '--card': '#15262d', '--card-hover': '#1d343d', '--panel': '#0f1e25', '--panel-2': '#172d36', '--accent-2': '#6fb3cf' },
    colors: { defaultBlockColor: '#b6dce6', addListColor: '#d4c58d', newCardColor: '#8cc0d8' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
  { id: 'frost', name: 'Frost',
    vars: { '--bg-1': '#2f4553', '--bg-2': '#5c7e8f', '--bg-3': '#8fa6b3', '--topbar': 'rgba(10, 18, 24, 0.5)', '--list': '#141c21', '--card': '#1f2a31', '--card-hover': '#28363f', '--panel': '#182026', '--panel-2': '#212d35', '--accent-2': '#8fb0c2' },
    colors: { defaultBlockColor: '#d4dde2', addListColor: '#c3ced5', newCardColor: '#8fb0c2' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
  { id: 'slate', name: 'Slate',
    vars: { '--bg-1': '#3f4656', '--bg-2': '#5a6578', '--bg-3': '#6b7c98', '--topbar': 'rgba(16, 18, 26, 0.5)', '--list': '#171a21', '--card': '#232833', '--card-hover': '#2d3340', '--panel': '#1c2028', '--panel-2': '#262b35', '--accent-2': '#8fa3c4' },
    colors: { defaultBlockColor: '#c9d1de', addListColor: '#ab978c', newCardColor: '#8fa3c4' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
  { id: 'graphite', name: 'Graphite',
    vars: { '--bg-1': '#18181b', '--bg-2': '#27272a', '--bg-3': '#3f3f46', '--topbar': 'rgba(0, 0, 0, 0.5)', '--list': '#0a0a0b', '--card': '#202024', '--card-hover': '#2a2a30', '--panel': '#161618', '--panel-2': '#222226', '--accent-2': '#8fa9d4' },
    colors: { defaultBlockColor: '#c9ccd2', addListColor: '#d4c58d', newCardColor: '#c9ccd2' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
  { id: 'forest', name: 'Forest',
    vars: { '--bg-1': '#1f4743', '--bg-2': '#2f5a47', '--bg-3': '#62785a', '--topbar': 'rgba(4, 18, 12, 0.5)', '--list': '#0b1511', '--card': '#18251f', '--card-hover': '#21332a', '--panel': '#101b16', '--panel-2': '#192a22', '--accent-2': '#7fb897' },
    colors: { defaultBlockColor: '#b5d9c6', addListColor: '#d4c58d', newCardColor: '#93c9ad' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
  { id: 'mint', name: 'Mint',
    vars: { '--bg-1': '#1c4a43', '--bg-2': '#2c6b62', '--bg-3': '#7fb5ab', '--topbar': 'rgba(2, 18, 16, 0.5)', '--list': '#0a1714', '--card': '#122624', '--card-hover': '#1b3430', '--panel': '#0d1d1a', '--panel-2': '#142a26', '--accent-2': '#6fc2b4' },
    colors: { defaultBlockColor: '#b5e0d8', addListColor: '#d4c58d', newCardColor: '#8fd0c4' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
  { id: 'aurora', name: 'Aurora',
    vars: { '--bg-1': '#5a4a8a', '--bg-2': '#4f62a8', '--bg-3': '#7a96c4', '--topbar': 'rgba(16, 12, 30, 0.42)', '--list': '#101204', '--card': '#22272b', '--card-hover': '#2c333a', '--panel': '#1d2125', '--panel-2': '#282e33', '--accent-2': '#7ba7de' },
    colors: { defaultBlockColor: '#aac7f8', addListColor: '#d4c58d', newCardColor: '#aac7f8' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
  { id: 'lavender', name: 'Lavender',
    vars: { '--bg-1': '#3b2f66', '--bg-2': '#5b4fa0', '--bg-3': '#a79fcf', '--topbar': 'rgba(16, 12, 32, 0.45)', '--list': '#100d1c', '--card': '#1d1a30', '--card-hover': '#26223e', '--panel': '#151225', '--panel-2': '#1f1b33', '--accent-2': '#a49cd8' },
    colors: { defaultBlockColor: '#d4d0ee', addListColor: '#d4c58d', newCardColor: '#b9b3e0' },
    priority: { 1: '#e0787a', 2: '#e3a062', 3: '#dcc56e' } },
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
