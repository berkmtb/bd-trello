import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './Root.jsx';
import './styles.css';
import { applyTheme } from './lib/themes.js';

try { applyTheme(localStorage.getItem('bd-theme')); } catch { /* default theme */ }

createRoot(document.getElementById('root')).render(<Root />);
