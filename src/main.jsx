import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './Root.jsx';
import './styles.css';
import { applyTheme, applyPriorityColors } from './lib/themes.js';

try { applyTheme(localStorage.getItem('bd-theme')); } catch { /* default theme */ }
try { applyPriorityColors(JSON.parse(localStorage.getItem('bd-prio') || 'null')); } catch { /* defaults */ }

createRoot(document.getElementById('root')).render(<Root />);
