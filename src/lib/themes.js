// Color themes. Each sets the app chrome (CSS variables) plus the three customizable colors.
// The first theme matches the original look, so existing users see no change.
export const THEMES = [
  { id: 'aurora', name: 'Aurora',
    vars: { '--bg-1': '#6f3fb5', '--bg-2': '#5b6fd6', '--bg-3': '#7aa3d9', '--topbar': 'rgba(16, 12, 30, 0.38)', '--list': '#101204', '--card': '#22272b', '--card-hover': '#2c333a', '--panel': '#1d2125', '--panel-2': '#282e33', '--accent-2': '#579dff' },
    colors: { defaultBlockColor: '#aac7f8', addListColor: '#f2c200', newCardColor: '#aac7f8' } , priority: { 1: '#e5484d', 2: '#f76b15', 3: '#f2c200' } },
  { id: 'midnight', name: 'Midnight',
    vars: { '--bg-1': '#0f172a', '--bg-2': '#1e293b', '--bg-3': '#334155', '--topbar': 'rgba(2, 6, 23, 0.55)', '--list': '#0b1220', '--card': '#1e293b', '--card-hover': '#273449', '--panel': '#111a2e', '--panel-2': '#1b273d', '--accent-2': '#60a5fa' },
    colors: { defaultBlockColor: '#93c5fd', addListColor: '#fbbf24', newCardColor: '#93c5fd' } , priority: { 1: '#f87171', 2: '#fb923c', 3: '#facc15' } },
  { id: 'forest', name: 'Forest',
    vars: { '--bg-1': '#134e4a', '--bg-2': '#166534', '--bg-3': '#4d7c0f', '--topbar': 'rgba(4, 22, 12, 0.45)', '--list': '#08140d', '--card': '#1c2a22', '--card-hover': '#25372c', '--panel': '#122019', '--panel-2': '#1b2e24', '--accent-2': '#4ade80' },
    colors: { defaultBlockColor: '#a7f3d0', addListColor: '#fde68a', newCardColor: '#86efac' } , priority: { 1: '#f87171', 2: '#fb923c', 3: '#fde047' } },
  { id: 'ocean', name: 'Ocean',
    vars: { '--bg-1': '#0c4a6e', '--bg-2': '#0e7490', '--bg-3': '#5eead4', '--topbar': 'rgba(3, 20, 32, 0.45)', '--list': '#06151c', '--card': '#14272f', '--card-hover': '#1c353f', '--panel': '#0d1f27', '--panel-2': '#16303a', '--accent-2': '#38bdf8' },
    colors: { defaultBlockColor: '#a5f3fc', addListColor: '#fcd34d', newCardColor: '#7dd3fc' } , priority: { 1: '#fb7185', 2: '#fb923c', 3: '#fde047' } },
  { id: 'sunset', name: 'Sunset',
    vars: { '--bg-1': '#7c2d52', '--bg-2': '#c2410c', '--bg-3': '#e8a14a', '--topbar': 'rgba(30, 10, 10, 0.42)', '--list': '#1a0d10', '--card': '#2a1a1d', '--card-hover': '#382328', '--panel': '#22130f', '--panel-2': '#301d18', '--accent-2': '#fb923c' },
    colors: { defaultBlockColor: '#fcd5b0', addListColor: '#ffd166', newCardColor: '#fdba74' } , priority: { 1: '#ef4444', 2: '#f97316', 3: '#facc15' } },
  { id: 'rose', name: 'Rose',
    vars: { '--bg-1': '#6b21a8', '--bg-2': '#be185d', '--bg-3': '#fb7185', '--topbar': 'rgba(26, 8, 20, 0.42)', '--list': '#180a12', '--card': '#281723', '--card-hover': '#36202f', '--panel': '#1f1019', '--panel-2': '#2d1a26', '--accent-2': '#f472b6' },
    colors: { defaultBlockColor: '#fbcfe8', addListColor: '#fde68a', newCardColor: '#f9a8d4' } , priority: { 1: '#ff5c7a', 2: '#ff9f43', 3: '#ffd93d' } },
  { id: 'graphite', name: 'Graphite',
    vars: { '--bg-1': '#18181b', '--bg-2': '#27272a', '--bg-3': '#3f3f46', '--topbar': 'rgba(0, 0, 0, 0.5)', '--list': '#0a0a0b', '--card': '#202024', '--card-hover': '#2a2a30', '--panel': '#161618', '--panel-2': '#222226', '--accent-2': '#8ab4ff' },
    colors: { defaultBlockColor: '#d4d4d8', addListColor: '#fbbf24', newCardColor: '#d4d4d8' } , priority: { 1: '#ff6b6b', 2: '#ffa94d', 3: '#ffe066' } },
];

export const DEFAULT_THEME_ID = 'aurora';
export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

/** Apply a theme's CSS variables to the page, and remember it so the next load has no flash. */
export function applyTheme(id) {
  const t = themeById(id);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v);
  try { localStorage.setItem('bd-theme', t.id); } catch { /* ignore */ }
}

/** Apply priority colors (1=red, 2=orange, 3=yellow) as CSS variables; cached for a flash-free next load. */
export function applyPriorityColors(colors) {
  const c = { 1: '#e5484d', 2: '#f76b15', 3: '#f2c200', ...(colors || {}) };
  const root = document.documentElement;
  for (const n of [1, 2, 3]) root.style.setProperty(`--prio-${n}`, c[n]);
  try { localStorage.setItem('bd-prio', JSON.stringify(c)); } catch { /* ignore */ }
}
