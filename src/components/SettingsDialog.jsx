import React, { useEffect, useRef, useState } from 'react';
import { THEMES } from '../lib/themes.js';
import { LIST_COLORS, textOn } from '../lib/core.js';
import { compressImage } from '../lib/image.js';
import { confirmDialog } from './Dialog.jsx';
import { Icon } from './Icon.jsx';

const sw = (...hexes) => hexes.map((hex) => ({ name: hex, hex }));
const PRIORITY_SWATCHES = {
  1: sw('#e0787a', '#d46a6c', '#e8918f', '#e5484d', '#f87171', '#dc2626'),
  2: sw('#e3a062', '#d99352', '#ecb585', '#f76b15', '#fb923c', '#ea580c'),
  3: sw('#dcc56e', '#d1b95d', '#e6d58f', '#f2c200', '#facc15', '#eab308'),
};
const PRIORITY_NAMES = { 1: 'Red (priority 1)', 2: 'Orange (priority 2)', 3: 'Yellow (priority 3)' };
const COMMON_SWATCHES = [...sw('#a8c4ec', '#b5d2e6', '#c3ced5', '#b5d9c6', '#d8c7b4', '#d4c58d', '#6f9bd6'), ...LIST_COLORS];

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
      {hint && <p className="hint">{hint}</p>}
      {preview && preview(shown)}
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
        {shown.toLowerCase() !== defaultValue && <button className="link-btn" onClick={() => choose(defaultValue)}>Reset to theme color</button>}
      </div>
    </div>
  );
}

/** Library of uploaded backgrounds. The board picks one (or none); deleting is permanent. */
function BackgroundSection({ board, boards, look, backend, actions, showToast }) {
  const [lib, setLib] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  useEffect(() => backend.subscribe('backgrounds', [], setLib), [backend]);

  const curLook = board.look || {};
  const select = (id) => {
    const { backgroundId, ...rest } = curLook;
    return actions.saveBoardLook(board, id ? { ...rest, backgroundId: id } : rest);
  };
  const nameOf = (d) => d.name
    || (d.key === 'default' ? 'Previous default background' : `Previous · ${boards.find((b) => b.id === d.key)?.name || 'deleted board'}`);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const { data } = await compressImage(file);
      const id = actions.addBackground(file.name.replace(/\.[^.]+$/, ''), data);
      await select(id);
      showToast(`Background set for “${board.name}”`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d) => {
    const ok = await confirmDialog(`Permanently delete “${nameOf(d)}”?`,
      'This deletes the uploaded image. Any board using it goes back to its theme gradient. This can’t be undone.',
      { confirmLabel: 'Delete image', danger: true });
    if (ok) { await actions.deleteBackground(d.id); showToast('Deleted background image'); }
  };

  const items = (lib || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div className="color-setting bg-section">
      <h4>Background</h4>
      <p className="hint">Pick an uploaded image for this board, or none. Images stay in your library until you delete them.</p>
      <div className="bg-grid">
        <button type="button" className={`bg-thumb none ${!look.backgroundId ? 'current' : ''}`} onClick={() => select(null)} aria-label="No background">
          <span className="bg-none" style={{ background: `linear-gradient(120deg, ${look.theme.vars['--bg-1']}, ${look.theme.vars['--bg-2']} 55%, ${look.theme.vars['--bg-3']})` }} />
          <span className="bg-label">None (theme)</span>
        </button>
        {items.map((d) => (
          <div key={d.id} className={`bg-thumb ${look.backgroundId === d.key ? 'current' : ''}`}>
            <button type="button" className="bg-pick" style={{ backgroundImage: `url(${d.data})` }} onClick={() => select(d.key)} aria-label={`Use ${nameOf(d)}`} />
            <button type="button" className="bg-del" onClick={() => remove(d)} title="Delete permanently" aria-label={`Delete ${nameOf(d)} permanently`}><Icon name="trash" size={14} /></button>
            <span className="bg-label" title={nameOf(d)}>{nameOf(d)}</span>
          </div>
        ))}
      </div>
      {lib && !items.length && <p className="hint">No uploaded images yet.</p>}
      {error && <p className="error-text">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <div className="bg-actions">
        <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}><Icon name="plus" size={14} /> {busy ? 'Uploading…' : 'Upload image…'}</button>
        {look.backgroundId && <button className="link-btn" onClick={() => select(null)}>Remove from this board</button>}
      </div>
    </div>
  );
}

export default function SettingsDialog({ settings, board, boards, look, backend, showToast, actions, boardCount, backupStale, onBackupAll, onClose }) {
  const [backingUp, setBackingUp] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const curLook = board?.look || {};
  const saveLook = (patch) => actions.saveBoardLook(board, { ...curLook, ...patch });
  const t = look.theme;

  return (
    <div className="modal-backdrop dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog settings-dialog" role="dialog" aria-label="Settings">
        <h2>Settings</h2>

        {board && (
          <>
            <h3>Customize · {board.name}</h3>
            <p className="hint">Theme, colors and background apply to this board only. Each board keeps its own.</p>

            <div className="color-setting theme-picker">
              <h4>Theme</h4>
              <p className="hint">Picking a theme sets this board’s colors and resets the color settings below to match it. You can still tweak them afterwards.</p>
              <div className="theme-grid">
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    className={`theme-card ${look.themeId === th.id ? 'current' : ''}`}
                    onClick={() => actions.saveBoardLook(board, { theme: th.id, ...(curLook.backgroundId ? { backgroundId: curLook.backgroundId } : {}) })}
                    aria-label={`${th.name} theme`}
                  >
                    <span className="theme-swatch" style={{ background: `linear-gradient(120deg, ${th.vars['--bg-1']}, ${th.vars['--bg-2']} 55%, ${th.vars['--bg-3']})` }}>
                      <span className="theme-list" style={{ background: th.vars['--list'] }}>
                        <i style={{ background: th.vars['--card'] }} />
                        <i style={{ background: th.colors.defaultBlockColor }} />
                      </span>
                      <span className="theme-prios">{[1, 2, 3].map((n) => <b key={n} style={{ background: th.priority[n] }} />)}</span>
                      <span className="theme-btn" style={{ background: th.colors.addListColor }} />
                    </span>
                    <span className="theme-name">{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <BackgroundSection board={board} boards={boards} look={look} backend={backend} actions={actions} showToast={showToast} />

            <ColorSetting
              id="custom-block-color"
              title="Default time block color"
              hint="Used for calendar blocks whose list has no color of its own. Lists can still override it from their ⋯ menu."
              value={look.defaultBlockColor}
              defaultValue={t.colors.defaultBlockColor}
              swatches={COMMON_SWATCHES}
              onSave={(hex) => saveLook({ defaultBlockColor: hex })}
              preview={(c) => (
                <div className="settings-preview" style={{ background: c, color: textOn(c) }}>
                  <span className="t">Sample task</span>
                  <span className="s">9:00 AM – 9:30 AM</span>
                </div>
              )}
            />

            <ColorSetting
              id="custom-new-card-color"
              title="New card color"
              hint="The “Add card” button and the outline around the box when you type a new card."
              value={look.newCardColor}
              defaultValue={t.colors.newCardColor}
              swatches={COMMON_SWATCHES}
              onSave={(hex) => saveLook({ newCardColor: hex })}
              preview={(c) => (
                <div className="settings-preview new-card-preview" style={{ '--c': c }}>
                  <span className="box">Enter a title for this card…</span>
                  <span className="btn-fake" style={{ background: c, color: textOn(c) }}>Add card</span>
                </div>
              )}
            />

            <ColorSetting
              id="custom-today-text-color"
              title="Today's Priorities text color"
              hint="The title of the “Today's Priorities” list. Matches the time block color unless you pick one."
              value={curLook.todayTextColor}
              defaultValue={look.defaultBlockColor}
              swatches={COMMON_SWATCHES}
              onSave={(hex) => saveLook({ todayTextColor: hex.toLowerCase() === look.defaultBlockColor.toLowerCase() ? null : hex })}
              preview={(c) => (
                <div className="settings-preview add-list-preview" style={{ background: 'var(--list)', color: c }}>
                  <span className="t">Today's Priorities</span>
                </div>
              )}
            />

            <ColorSetting
              id="custom-add-list-color"
              title="“Add another list” button color"
              hint="The button at the end of this board's lists."
              value={look.addListColor}
              defaultValue={t.colors.addListColor}
              swatches={COMMON_SWATCHES}
              onSave={(hex) => saveLook({ addListColor: hex })}
              preview={(c) => (
                <div className="settings-preview add-list-preview" style={{ background: c, color: textOn(c) }}>
                  <span className="t">+ Add another list</span>
                </div>
              )}
            />

            <div className="color-setting prio-settings">
              <h4>Priority colors</h4>
              <p className="hint">The bars on cards and the priority buttons. The ⌥1 / ⌥2 / ⌥3 shortcuts keep their order whatever colors you choose.</p>
              {[1, 2, 3].map((n) => (
                <ColorSetting
                  key={n}
                  id={`custom-prio-${n}`}
                  title={PRIORITY_NAMES[n]}
                  value={look.priorityColors[n]}
                  defaultValue={t.priority[n]}
                  swatches={PRIORITY_SWATCHES[n]}
                  onSave={(hex) => saveLook({ priorityColors: { ...look.priorityColors, [n]: hex } })}
                />
              ))}
            </div>
          </>
        )}

        <h3>Your data</h3>
        <p className="hint">
          Everything is stored in your Firebase project. Deleted boards can&rsquo;t be recovered, so keep a backup file somewhere safe.
          After importing from Trello, keep your Trello export files until you&rsquo;ve checked everything came across.
          Board background images and themes aren&rsquo;t included in backups.
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

        <h3>Today's Priorities list</h3>
        <p className="hint">A list named “Today's Priorities” is special:</p>
        <ul className="shortcut-list">
          <li><span>It always stays first, right next to the calendar, and can't be moved.</span></li>
          <li><span>Drag a card into it from another list and a tiny tag at the card's bottom-right shows the list it came from.</span></li>
          <li><span>Drag that card off and drop it on empty space (not on a list or the calendar) and it returns to the list on its tag. Dropping it on a specific list moves it there instead.</span></li>
          <li><span>In the card dialog, the List dropdown for a card in Today does not move it. It just sets the tag (choose “Today's Priorities” to clear it). The card leaves Today only when you drag it out.</span></li>
        </ul>

        <h3>Keyboard shortcuts</h3>
        <p className="hint">Hover a card (or open it), then press:</p>
        <ul className="shortcut-list">
          <li><span className="keys"><kbd>⌥1</kbd><kbd>⌥2</kbd><kbd>⌥3</kbd></span><span>Set priority red / orange / yellow (press again to clear)</span></li>
          <li><span className="keys"><kbd>⌥0</kbd></span><span>Clear priority</span></li>
          <li><span className="keys"><kbd>E</kbd> <kbd>C</kbd> or <kbd>⌥E</kbd></span><span>Archive the card (E and C are ignored while typing)</span></li>
          <li><span className="keys"><kbd>Delete</kbd></span><span>Delete the card (Undo appears briefly)</span></li>
        </ul>

        <div className="dialog-actions">
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
