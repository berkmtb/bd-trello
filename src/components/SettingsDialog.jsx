import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_BLOCK_COLOR, LIST_COLORS, textOn } from '../lib/core.js';

const SWATCHES = [{ name: 'Light blue (default)', hex: DEFAULT_BLOCK_COLOR }, ...LIST_COLORS];

export default function SettingsDialog({ settings, defaultBlockColor, actions, onClose }) {
  const [draft, setDraft] = useState(defaultBlockColor);   // live value while using the color picker
  const timer = useRef(null);
  useEffect(() => setDraft(defaultBlockColor), [defaultBlockColor]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = (hex) => actions.saveSettings(settings, { defaultBlockColor: hex });
  const choose = (hex) => { clearTimeout(timer.current); setDraft(hex); save(hex); };
  const pickCustom = (hex) => {
    setDraft(hex);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(hex), 400);   // don't write on every drag of the picker
  };
  const shown = draft || DEFAULT_BLOCK_COLOR;
  const isDefault = shown.toLowerCase() === DEFAULT_BLOCK_COLOR;

  return (
    <div className="modal-backdrop dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog settings-dialog" role="dialog" aria-label="Settings">
        <h2>Settings</h2>

        <h3>Default time block color</h3>
        <p className="hint">Used for calendar blocks whose list has no color of its own. Lists can still override it from their ⋯ menu.</p>

        <div className="settings-preview" style={{ background: shown, color: textOn(shown) }}>
          <span className="t">Sample task</span>
          <span className="s">9:00 AM – 9:30 AM</span>
        </div>

        <div className="settings-swatches">
          {SWATCHES.map((c) => (
            <button
              key={c.hex}
              type="button"
              className={`swatch ${shown.toLowerCase() === c.hex ? 'current' : ''}`}
              style={{ background: c.hex }}
              title={c.name}
              aria-label={c.name}
              onClick={() => choose(c.hex)}
            />
          ))}
        </div>

        <div className="settings-custom">
          <label htmlFor="custom-block-color">Custom</label>
          <input id="custom-block-color" type="color" value={shown} onChange={(e) => pickCustom(e.target.value)} />
          <code>{shown.toLowerCase()}</code>
          {!isDefault && <button className="link-btn" onClick={() => choose(DEFAULT_BLOCK_COLOR)}>Reset to default</button>}
        </div>

        <div className="dialog-actions">
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
