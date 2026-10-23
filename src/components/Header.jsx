import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { boardToTrello, downloadJson, importBoardOps, parseBackup, safeName } from '../lib/backup.js';
import { todayKey } from '../lib/core.js';
import { ask, promptDialog } from './Dialog.jsx';

function useDropdown() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('click', close);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', esc); };
  }, [open]);
  return [open, setOpen];
}

export default function Header({ boards, board, lists, actions, onSelectBoard, calOpen, onToggleCal, onOpenArchive, onOpenBackground, onOpenSettings, user, onSignOut, demo, showToast }) {
  const [boardMenu, setBoardMenu] = useDropdown();
  const [backupMenu, setBackupMenu] = useDropdown();
  const [userMenu, setUserMenu] = useDropdown();
  const fileRef = useRef(null);

  const exportBoardData = async (b) => {
    const [cards, blocks] = await Promise.all([
      actions.fetchOnce('cards', [['boardId', '==', b.id]]),
      actions.fetchOnce('blocks', [['boardId', '==', b.id]]),
    ]);
    return boardToTrello(b, lists.filter((l) => l.boardId === b.id), cards, blocks);
  };

  const backupBoard = async () => {
    setBackupMenu(false);
    const data = await exportBoardData(board);
    downloadJson(data, `${safeName(board.name)}-${todayKey()}.json`);
    showToast(`Backed up “${board.name}” (${data.cards.length} cards)`);
  };
  const backupAll = async () => {
    setBackupMenu(false);
    const out = [];
    for (const b of boards) out.push(await exportBoardData(b));
    downloadJson({ app: 'planner', version: 1, exportedAt: new Date().toISOString(), boards: out }, `planner-backup-${todayKey()}.json`);
    showToast(`Backed up ${out.length} board${out.length === 1 ? '' : 's'}`);
  };
  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const srcs = parseBackup(JSON.parse(await file.text()));
      let order = boards.length ? Math.max(...boards.map((b) => b.order ?? 0)) + 1 : 0;
      let total = 0;
      let firstId = null;
      for (const src of srcs) {
        const { ops, cards } = importBoardOps(src, actions.newId, order++);
        firstId = firstId || ops[0].id;
        total += cards;
        await actions.commitRaw(ops);
      }
      if (firstId) onSelectBoard(firstId);
      showToast(`Imported ${srcs.length} board${srcs.length === 1 ? '' : 's'} (${total} cards) as new board${srcs.length === 1 ? '' : 's'}`);
    } catch (err) {
      showToast('Import failed: ' + err.message);
    }
  };

  const createBoard = async () => {
    setBoardMenu(false);
    const name = await promptDialog('New board', '', { placeholder: 'Board name', confirmLabel: 'Create board' });
    if (name) onSelectBoard(actions.createBoard(name, boards));
  };
  const renameBoard = async () => {
    setBoardMenu(false);
    const name = await promptDialog('Rename board', board.name);
    if (name && name !== board.name) actions.renameBoard(board.id, name);
  };
  const deleteBoard = async () => {
    setBoardMenu(false);
    const ok = await ask({
      title: `Delete “${board.name}”?`,
      message: 'This permanently deletes the board with all its lists, cards and archived cards. Back it up first if you might want it later. Type the board name to confirm.',
      requireText: board.name,
      confirmLabel: 'Delete board',
      danger: true,
    });
    if (!ok) return;
    const next = boards.find((b) => b.id !== board.id);
    await actions.deleteBoard(board.id);
    if (next) onSelectBoard(next.id);
  };

  const initials = (user?.displayName || user?.email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="logo-mark small" />
        <div className="menu-wrap">
          <button className="board-switch" onClick={(e) => { e.stopPropagation(); setBoardMenu((v) => !v); }} disabled={!boards.length}>
            <span>{board?.name || 'Planner'}</span><Icon name="chevDown" />
          </button>
          {boardMenu && (
            <div className="menu wide" onClick={(e) => e.stopPropagation()}>
              <div className="menu-label">Boards</div>
              {boards.map((b) => (
                <button key={b.id} className={b.id === board?.id ? 'current' : ''} onClick={() => { onSelectBoard(b.id); setBoardMenu(false); }}>
                  {b.name}
                </button>
              ))}
              <hr />
              <button onClick={createBoard}><Icon name="plus" size={14} /> New board…</button>
              {board && <button onClick={renameBoard}>Rename this board…</button>}
              {board && <button onClick={() => { setBoardMenu(false); onOpenBackground(); }}>Change background…</button>}
              {board && <button className="danger" onClick={deleteBoard}>Delete this board…</button>}
            </div>
          )}
        </div>
        {demo && <span className="demo-pill" title="Data is stored only in this browser until Firebase is connected">Demo · saved in this browser</span>}
      </div>

      <div className="topbar-right">
        {board && <button className="top-btn" onClick={onOpenArchive}><Icon name="archive" /> Archived</button>}
        <div className="menu-wrap">
          <button className="top-btn" onClick={(e) => { e.stopPropagation(); setBackupMenu((v) => !v); }}><Icon name="download" /> Backup</button>
          {backupMenu && (
            <div className="menu right wide" onClick={(e) => e.stopPropagation()}>
              {board && <button onClick={backupBoard}>Back up this board (.json)</button>}
              <button onClick={backupAll} disabled={!boards.length}>Back up all boards (.json)</button>
              <hr />
              <button onClick={() => { setBackupMenu(false); fileRef.current?.click(); }}>Import Trello export or backup…</button>
              <div className="menu-note">Files use Trello's export format. Imports are added as new boards; nothing is overwritten.</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
        </div>
        <button className={`top-btn ${calOpen ? 'on' : ''}`} onClick={onToggleCal}><Icon name="calendar" /> Calendar</button>
        <button className="top-btn" onClick={onOpenSettings}><Icon name="gear" /> Settings</button>
        {user && (
          <div className="menu-wrap">
            <button className="avatar" title={user.email} onClick={(e) => { e.stopPropagation(); setUserMenu((v) => !v); }}>{initials}</button>
            {userMenu && (
              <div className="menu right" onClick={(e) => e.stopPropagation()}>
                <div className="menu-label">{user.email}</div>
                <button onClick={onSignOut}><Icon name="logout" size={14} /> Sign out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
