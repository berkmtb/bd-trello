import React, { useEffect, useMemo, useState } from 'react';
import { priorityHex } from '../lib/core.js';
import { Icon } from './Icon.jsx';
import { confirmDialog } from './Dialog.jsx';

export default function ArchiveDrawer({ backend, board, lists, cards, actions, onClose }) {
  const [archived, setArchived] = useState(null);
  const [q, setQ] = useState('');
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

  return (
    <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer">
        <header className="drawer-head">
          <h2>Archived · {board.name}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </header>
        <input className="search" placeholder="Search archived cards" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="drawer-body">
          {archived === null && <div className="muted-text">Loading…</div>}
          {archived && shown.length === 0 && <div className="muted-text">{q ? 'No matches.' : 'Nothing archived on this board.'}</div>}
          {shown.map((c) => (
            <div key={c.id} className="archived-item">
              <div className="ai-main">
                {priorityHex(c.priority) && <span className="prio-dot" style={{ background: priorityHex(c.priority) }} />}
                <div>
                  <div className="ai-title">{c.title}</div>
                  <div className="ai-sub">
                    {listName(c.listId) || 'Deleted list'}
                    {c.archivedAt ? ` · ${new Date(c.archivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                  </div>
                </div>
              </div>
              <div className="ai-actions">
                <button className="btn small" onClick={() => actions.restoreCard(c, lists, cards)}><Icon name="restore" size={14} /> Restore</button>
                <button className="icon-btn" title="Delete permanently" onClick={async () => {
                  if (await confirmDialog(`Delete “${c.title}”?`, "This can't be undone.", { confirmLabel: 'Delete card', danger: true })) actions.deleteCard(c.id);
                }}><Icon name="trash" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
