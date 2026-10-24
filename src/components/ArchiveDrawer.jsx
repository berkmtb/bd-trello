import React, { useEffect, useMemo, useState } from 'react';
import { priorityHex } from '../lib/core.js';
import { Icon } from './Icon.jsx';
import { confirmDialog } from './Dialog.jsx';

export default function ArchiveDrawer({ backend, board, lists, cards, actions, onClose }) {
  const [archived, setArchived] = useState(null);
  const [q, setQ] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState(() => new Set());
  useEffect(
    () => backend.subscribe('cards', [['boardId', '==', board.id], ['archived', '==', true]], setArchived),
    [backend, board.id],
  );
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const listName = (id) => lists.find((l) => l.id === id)?.name;
  const shown = useMemo(() => (archived || [])
    .filter((c) => !q || c.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0)), [archived, q]);

  const allShownSelected = shown.length > 0 && shown.every((c) => sel.has(c.id));
  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel(allShownSelected ? new Set() : new Set(shown.map((c) => c.id)));
  const exitSelect = () => { setSelecting(false); setSel(new Set()); };
  const picked = shown.filter((c) => sel.has(c.id));
  const deletePicked = async () => {
    if (!picked.length) return;
    const ok = await confirmDialog(`Permanently delete ${picked.length} card${picked.length === 1 ? '' : 's'}?`, "This can't be undone.", { confirmLabel: `Delete ${picked.length}`, danger: true });
    if (!ok) return;
    await actions.deleteCards(picked.map((c) => c.id));
    exitSelect();
  };

  return (
    <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer">
        <header className="drawer-head">
          <h2>Archived · {board.name}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </header>
        {selecting ? (
          <div className="select-bar">
            <label className="select-all"><input type="checkbox" checked={allShownSelected} onChange={toggleAll} /> Select all{q ? ' shown' : ''}</label>
            <span className="select-count">{picked.length} selected</span>
            <button className="btn danger small" disabled={!picked.length} onClick={deletePicked}><Icon name="trash" size={14} /> Delete</button>
            <button className="link-btn" onClick={exitSelect}>Cancel</button>
          </div>
        ) : (
          shown.length > 0 && <div className="select-bar"><button className="link-btn" onClick={() => setSelecting(true)}>Select…</button></div>
        )}
        <input className="search" placeholder="Search archived cards" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="drawer-body">
          {archived === null && <div className="muted-text">Loading…</div>}
          {archived && shown.length === 0 && <div className="muted-text">{q ? 'No matches.' : 'Nothing archived on this board.'}</div>}
          {shown.map((c) => (
            <div key={c.id} className={`archived-item ${selecting && sel.has(c.id) ? 'selected' : ''}`} onClick={selecting ? () => toggle(c.id) : undefined}>
              <div className="ai-main">
                {selecting && <input type="checkbox" className="ai-check" checked={sel.has(c.id)} onChange={() => toggle(c.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select ${c.title}`} />}
                {priorityHex(c.priority) && <span className="prio-dot" style={{ background: priorityHex(c.priority) }} />}
                <div>
                  <div className="ai-title">{c.title}</div>
                  <div className="ai-sub">
                    {c.completed ? '✓ Completed · ' : ''}{listName(c.listId) || 'Deleted list'}
                    {c.archivedAt ? ` · ${new Date(c.archivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                  </div>
                </div>
              </div>
              {!selecting && <div className="ai-actions">
                <button className="btn small" onClick={() => actions.restoreCard(c, lists, cards)}><Icon name="restore" size={14} /> Restore</button>
                <button className="icon-btn" title="Delete permanently" onClick={async () => {
                  if (await confirmDialog(`Delete “${c.title}”?`, "This can't be undone.", { confirmLabel: 'Delete card', danger: true })) actions.deleteCard(c.id);
                }}><Icon name="trash" size={14} /></button>
              </div>}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
