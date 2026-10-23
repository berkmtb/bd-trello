import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_ADD_LIST_COLOR, DEFAULT_BLOCK_COLOR, DEFAULT_NEW_CARD_COLOR, LIST_COLORS, textOn } from '../lib/core.js';

const BLOCK_SWATCHES = [{ name: 'Light blue (default)', hex: DEFAULT_BLOCK_COLOR }, ...LIST_COLORS];
const ADD_LIST_SWATCHES = [
  { name: 'Yellow (default)', hex: DEFAULT_ADD_LIST_COLOR },
  { name: 'Light blue', hex: DEFAULT_BLOCK_COLOR },
  { name: 'White', hex: '#f4f5f7' },
  ...LIST_COLORS,
];

/** One color preference: live preview, swatches, custom picker and reset. Saves as you pick. */
function ColorSetting({ id, title, hint, value, defaultValue, swatches, onSave, preview }) {
  const [draft, setDraft] = useState(value);
  const timer = useRef(null);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const shown = draft || defaultValue;
  const choose = (hex) => { clearTimeout(timer.current); setDraft(hex); onSave(hex); };
  const pickCustom = (hex) => {
    setDraft(hex);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave(hex), 400);   // don't write on every drag of the picker
  };

  return (
    <div className="color-setting">
      <h4>{title}</h4>
      <p className="hint">{hint}</p>
      {preview(shown)}
      <div className="settings-swatches">
        {swatches.map((c) => (
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
        <label htmlFor={id}>Custom</label>
        <input id={id} type="color" value={shown} onChange={(e) => pickCustom(e.target.value)} />
        <code>{shown.toLowerCase()}</code>
        {shown.toLowerCase() !== defaultValue && <button className="link-btn" onClick={() => choose(defaultValue)}>Reset to default</button>}
      </div>
    </div>
  );
}

export default function SettingsDialog({ settings, defaultBlockColor, addListColor, newCardColor, actions, boardCount, backupStale, onBackupAll, onClose }) {
  const [backingUp, setBackingUp] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog settings-dialog" role="dialog" aria-label="Settings">
        <h2>Settings</h2>

        <h3>Customize</h3>

        <ColorSetting
          id="custom-block-color"
          title="Default time block color"
          hint="Used for calendar blocks whose list has no color of its own. Lists can still override it from their ⋯ menu."
          value={defaultBlockColor}
          defaultValue={DEFAULT_BLOCK_COLOR}
          swatches={BLOCK_SWATCHES}
          onSave={(hex) => actions.saveSettings(settings, { defaultBlockColor: hex })}
          preview={(c) => (
            <div className="settings-preview" style={{ background: c, color: textOn(c) }}>
              <span className="t">Sample task</span>
              <span className="s">9:00 AM – 9:30 AM</span>
            </div>
          )}
        />

        <ColorSetting
          id="custom-add-list-color"
          title="“Add another list” button color"
          hint="The button at the end of your board's lists."
          value={addListColor}
          defaultValue={DEFAULT_ADD_LIST_COLOR}
          swatches={ADD_LIST_SWATCHES}
          onSave={(hex) => actions.saveSettings(settings, { addListColor: hex })}
          preview={(c) => (
            <div className="settings-preview add-list-preview" style={{ background: c, color: textOn(c) }}>
              <span className="t">+ Add another list</span>
            </div>
          )}
        />

        <ColorSetting
          id="custom-new-card-color"
          title="New card color"
          hint="The “Add card” button and the outline around the box when you type a new card."
          value={newCardColor}
          defaultValue={DEFAULT_NEW_CARD_COLOR}
          swatches={BLOCK_SWATCHES.map((c, i) => (i === 0 ? { ...c, name: 'Light blue (default)' } : c))}
          onSave={(hex) => actions.saveSettings(settings, { newCardColor: hex })}
          preview={(c) => (
            <div className="settings-preview new-card-preview" style={{ '--c': c }}>
              <span className="box">Enter a title for this card…</span>
              <span className="btn-fake" style={{ background: c, color: textOn(c) }}>Add card</span>
            </div>
          )}
        />

        <h3>Your data</h3>
        <p className="hint">
          Everything is stored in your Firebase project. Deleted boards can&rsquo;t be recovered, so keep a backup file somewhere safe.
          After importing from Trello, keep your Trello export files until you&rsquo;ve checked everything came across.
          Board background images aren&rsquo;t included in backups.
        </p>
        <div className={`backup-row ${backupStale ? 'stale' : ''}`}>
          <div>
            <div className="b-title">{settings.lastBackupAt
              ? `Last backup: ${new Date(settings.lastBackupAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
              : 'No backup yet'}</div>
            {backupStale && boardCount > 0 && <div className="b-sub">{settings.lastBackupAt ? 'It has been over a week.' : 'Back up once you have boards set up.'}</div>}
          </div>
          <button className="btn" disabled={!boardCount || backingUp} onClick={async () => { setBackingUp(true); try { await onBackupAll(); } finally { setBackingUp(false); } }}>
            Back up all boards
          </button>
        </div>

        <h3>Keyboard shortcuts</h3>
        <p className="hint">Hover a card (or open it), then press:</p>
        <ul className="shortcut-list">
          <li><span className="keys"><kbd>⌥1</kbd><kbd>⌥2</kbd><kbd>⌥3</kbd></span><span>Set priority red / orange / yellow (press again to clear)</span></li>
          <li><span className="keys"><kbd>⌥0</kbd></span><span>Clear priority</span></li>
          <li><span className="keys"><kbd>⌥E</kbd> or <kbd>C</kbd></span><span>Archive the card (C is ignored while typing)</span></li>
        </ul>

        <div className="dialog-actions">
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
