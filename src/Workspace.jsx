import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay, MeasuringStrategy, MouseSensor, TouchSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { useIsPhone } from './lib/useIsPhone.js';
import { createActions } from './store/actions.js';
import { rank, sortCards, todayKey } from './lib/core.js';
import { boardToTrello, downloadJson } from './lib/backup.js';
import { applyTheme, applyPriorityColors, resolveLook } from './lib/themes.js';
import Header from './components/Header.jsx';
import Board from './components/Board.jsx';
import Calendar, { PX_PER_MIN, DEFAULT_DURATION } from './components/Calendar.jsx';
import CardModal from './components/CardModal.jsx';
import ArchiveDrawer from './components/ArchiveDrawer.jsx';
import { CardFace } from './components/CardTile.jsx';
import Toast from './components/Toast.jsx';
import SettingsDialog from './components/SettingsDialog.jsx';
import { DialogHost, promptDialog } from './components/Dialog.jsx';

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

const isEditable = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const ALT_KEYS = {
  Digit1: 1, Digit2: 2, Digit3: 3, Digit0: 0,
  Numpad1: 1, Numpad2: 2, Numpad3: 3, Numpad0: 0,
  KeyE: 'archive',
};

export default function Workspace({ backend, user, onSignOut, demo }) {
  const actions = useMemo(() => createActions(backend), [backend]);

  // ---------- live data ----------
  const [boards, setBoards] = useState(null);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [date, setDate] = useState(todayKey);

  useEffect(() => backend.subscribe('boards', [], setBoards), [backend]);
  useEffect(() => backend.subscribe('lists', [], setLists), [backend]);
  useEffect(() => backend.subscribe('cards', [['archived', '==', false]], setCards), [backend]);
  useEffect(() => backend.subscribe('blocks', [['date', '==', date]], setBlocks), [backend, date]);

  // ---------- UI state ----------
  const [boardIdPref, setBoardIdPref] = useState(() => store.get('planner.board', null));
  const [calOpen, setCalOpen] = useState(() => store.get('planner.calendar', true));
  const [openCardId, setOpenCardId] = useState(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const hoveredRef = useRef(null);
  const cardEls = useRef(new Map());
  const calGridRef = useRef(null);

  const sortedBoards = useMemo(() => [...(boards || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [boards]);
  const board = sortedBoards.find((b) => b.id === boardIdPref) || sortedBoards[0] || null;

  const [bgDocs, setBgDocs] = useState([]);

  // App settings (single doc: settings/prefs).
  const [settingsDocs, setSettingsDocs] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => backend.subscribe('settings', [], setSettingsDocs), [backend]);
  const settings = settingsDocs.find((d) => d.id === 'prefs') || {};
  // Appearance is per board: theme, colors and background all come from the current board's `look`.
  const look = useMemo(() => resolveLook(board), [board]);
  const { defaultBlockColor, addListColor, newCardColor, priorityColors } = look;
  const prioKey = JSON.stringify(priorityColors);
  useEffect(() => { if (board) applyTheme(look.themeId); }, [board, look.themeId]);
  useEffect(() => { if (board) applyPriorityColors(JSON.parse(prioKey)); }, [board, prioKey]);
  // Each block uses the default block color of the board it belongs to.
  const defaultColors = useMemo(() => new Map((boards || []).map((b) => [b.id, resolveLook(b).defaultBlockColor])), [boards]);

  // Full backup (all boards, archived cards included) as one Trello-format JSON file.
  const backupAll = async () => {
    const out = [];
    for (const b of sortedBoards) {
      const [cs, bs] = await Promise.all([
        actions.fetchOnce('cards', [['boardId', '==', b.id]]),
        actions.fetchOnce('blocks', [['boardId', '==', b.id]]),
      ]);
      out.push(boardToTrello(b, lists.filter((l) => l.boardId === b.id), cs, bs));
    }
    downloadJson({ app: 'planner', version: 1, exportedAt: new Date().toISOString(), boards: out }, `planner-backup-${todayKey()}.json`);
    await actions.saveSettings(settings, { lastBackupAt: Date.now() });
    showToast(`Backed up ${out.length} board${out.length === 1 ? '' : 's'}`);
  };
  const BACKUP_REMINDER_DAYS = 7;
  const backupStale = (boards || []).length > 0
    && (!settings.lastBackupAt || Date.now() - settings.lastBackupAt > BACKUP_REMINDER_DAYS * 86400_000);
  useEffect(
    () => backend.subscribe('backgrounds', [['key', '==', look.backgroundId || '-']], setBgDocs),
    [backend, look.backgroundId],
  );
  const bg = bgDocs.find((d) => d.key === look.backgroundId) || null;
  // Focused view: show a single list of the board. Remembered per board.
  const [focusMap, setFocusMap] = useState(() => store.get('planner.focus', {}));
  const setFocus = (listId) => setFocusMap((m) => {
    const next = { ...m };
    if (listId) next[board.id] = listId; else delete next[board.id];
    store.set('planner.focus', next);
    return next;
  });
  const selectBoard = (id) => { setBoardIdPref(id); store.set('planner.board', id); };
  const toggleCal = () => setCalOpen((v) => { store.set('planner.calendar', !v); return !v; });

  const boardLists = useMemo(
    () => (board ? lists.filter((l) => l.boardId === board.id).sort((a, b) => a.order - b.order) : []),
    [lists, board],
  );
  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const listsById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const openCard = openCardId ? cardsById.get(openCardId) : null;

  // Close the editor if its card disappears (archived elsewhere, deleted).
  useEffect(() => { if (openCardId && cards.length && !cardsById.has(openCardId)) setOpenCardId(null); }, [openCardId, cardsById, cards.length]);

  const showToast = useCallback((msg, undo) => setToast({ msg, undo, key: Date.now() }), []);

  const archive = useCallback((card) => {
    actions.archiveCard(card.id);
    setOpenCardId((id) => (id === card.id ? null : id));
    if (hoveredRef.current === card.id) hoveredRef.current = null;
    showToast(`Archived “${card.title}”`, () => actions.updateCard(card.id, { archived: false, archivedAt: null }));
  }, [actions, showToast]);

  const complete = useCallback((card) => {
    actions.completeCard(card.id);
    setOpenCardId((id) => (id === card.id ? null : id));
    if (hoveredRef.current === card.id) hoveredRef.current = null;
    showToast(`Completed “${card.title}”`, () => actions.updateCard(card.id, { archived: false, archivedAt: null, completed: false }));
  }, [actions, showToast]);

  // ---------- keyboard shortcuts ----------
  const latest = useRef();
  latest.current = { cards, cardsById, openCardId, archive, boardLists };
  useEffect(() => {
    const onKey = (e) => {
      const st = latest.current;
      const targetId = st.openCardId || hoveredRef.current;
      const card = targetId && st.cardsById.get(targetId);
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        const act = ALT_KEYS[e.code];
        if (act === undefined || !card) return;
        // Stop the browser from typing ¡ ™ £ or starting an accent.
        e.preventDefault();
        e.stopPropagation();
        if (act === 'archive') st.archive(card);
        else actions.setPriority(card, act, st.cards);
        return;
      }
      if (!e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'c') {
        if (isEditable(e.target) || !card) return;
        e.preventDefault();
        st.archive(card);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [actions]);

  // ---------- drag and drop ----------
  // Mouse drags after a few pixels; touch needs a press-and-hold so swiping still scrolls/changes lists.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );
  const phone = useIsPhone();
  const [drag, setDrag] = useState(null);
  const dragInfo = useRef(null);
  const lastDragEnd = useRef(0);
  const listEls = useRef(new Map());   // list id -> its <section>, for list-drag hit testing
  const recentDrag = () => Date.now() - lastDragEnd.current < 250;

  const computeTarget = (e) => {
    const info = dragInfo.current;
    if (!info) return null;
    // Real pointer position (dnd-kit's delta also includes container scrolling).
    const pointer = info.pointer;
    const over = e.over?.data.current;
    const next = { kind: info.kind, id: info.id, insert: null, cal: null, listIndex: null, overType: over?.type || null };

    if (info.kind === 'list') {
      // Where would the list land? Count the other lists whose midpoint is left of the pointer.
      let listIndex = 0;
      for (const l of latest.current.boardLists) {
        if (l.id === info.id) continue;
        const el = listEls.current.get(l.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (pointer.x > r.left + r.width / 2) listIndex++;
      }
      next.listIndex = listIndex;
    } else if (over?.type === 'list' && info.kind === 'card') {
      const card = latest.current.cardsById.get(info.id);
      const myRank = rank(card.priority);
      const listCards = sortCards(latest.current.cards.filter((c) => c.listId === over.listId && c.id !== info.id));
      const band = listCards.filter((c) => rank(c.priority) === myRank);
      let bandIndex = 0;
      for (const c of band) {
        const el = cardEls.current.get(c.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (pointer.y > r.top + r.height / 2) bandIndex++;
      }
      const before = listCards.filter((c) => rank(c.priority) < myRank).length;
      next.insert = { listId: over.listId, bandIndex, fullIndex: before + bandIndex };
    } else if (over?.type === 'calendar' && calGridRef.current) {
      const r = calGridRef.current.getBoundingClientRect();
      const duration = info.duration || DEFAULT_DURATION;
      let m = (pointer.y - r.top) / PX_PER_MIN;
      m = info.kind === 'block' ? Math.round((m - info.grabMin) / 15) * 15 : Math.floor(m / 15) * 15;
      m = Math.max(0, Math.min(24 * 60 - duration, m));
      next.cal = { start: m, duration };
    }
    return next;
  };

  const sameTarget = (a, b) => a && b && a.overType === b.overType && a.listIndex === b.listIndex
    && JSON.stringify(a.insert) === JSON.stringify(b.insert) && JSON.stringify(a.cal) === JSON.stringify(b.cal);

  const onDragStart = (e) => {
    const data = e.active.data.current;
    const ae = e.activatorEvent;
    const info = { kind: data.kind, id: data.id, pointer: { x: ae.clientX, y: ae.clientY } };
    if (data.kind === 'block') {
      const blk = blocks.find((b) => b.id === data.id);
      const el = document.querySelector(`[data-block-id="${data.id}"]`);
      info.duration = blk?.duration || DEFAULT_DURATION;
      info.grabMin = el ? (ae.clientY - el.getBoundingClientRect().top) / PX_PER_MIN : 0;
    }
    dragInfo.current = info;
    setDrag({ kind: info.kind, id: info.id, insert: null, cal: null, listIndex: null, overType: null });
  };
  const onDragMove = (e) => {
    const next = computeTarget(e);
    setDrag((prev) => (sameTarget(prev, next) ? prev : next));
  };
  const onDragEnd = (e) => {
    const t = computeTarget(e);
    const info = dragInfo.current;
    dragInfo.current = null;
    setDrag(null);
    lastDragEnd.current = Date.now();
    if (!t || !info) return;

    if (info.kind === 'card') {
      const card = cardsById.get(info.id);
      if (!card) return;
      if (t.insert) {
        const { listId, bandIndex } = t.insert;
        if (listId === card.listId) {
          const band = sortCards(cards.filter((c) => c.listId === listId && rank(c.priority) === rank(card.priority)));
          if (band.findIndex((c) => c.id === card.id) === bandIndex) return; // unchanged
        }
        const toBoard = lists.find((l) => l.id === listId)?.boardId;
        actions.placeCard(card, listId, bandIndex, cards, toBoard);
      } else if (t.cal) {
        actions.createBlock(card, date, t.cal.start, t.cal.duration);
      }
    } else if (info.kind === 'list') {
      const list = lists.find((l) => l.id === info.id);
      if (!list || t.listIndex == null) return;
      const others = boardLists.filter((l) => l.id !== list.id);
      const current = boardLists.findIndex((l) => l.id === list.id);
      if (t.listIndex === current && others.length === boardLists.length - 1) return; // dropped where it was
      actions.moveListTo(list, t.listIndex, lists);
    } else if (info.kind === 'block') {
      const blk = blocks.find((b) => b.id === info.id);
      if (!blk) return;
      if (t.cal) {
        if (t.cal.start !== blk.start) actions.updateBlock(blk.id, { start: t.cal.start });
      } else {
        actions.deleteBlock(blk.id);
        const { id, ...data } = blk;
        showToast('Removed from calendar', () => actions.commitRaw([{ op: 'set', coll: 'blocks', id, data }]));
      }
    }
  };
  // Sideways board scrolling while dragging near the board's left/right edge.
  // (The library's built-in version kept scrolling while the pointer was over the calendar.)
  const dragging = !!drag;
  useEffect(() => {
    if (!dragging) return;
    const track = (ev) => { if (dragInfo.current) dragInfo.current.pointer = { x: ev.clientX, y: ev.clientY }; };
    window.addEventListener('pointermove', track, true);
    let raf;
    const tick = () => {
      const p = dragInfo.current?.pointer;
      const el = document.querySelector('.board');
      if (p && el) {
        const r = el.getBoundingClientRect();
        const zone = 70;
        if (p.y >= r.top && p.y <= r.bottom) {
          if (p.x >= r.left && p.x < r.left + zone) el.scrollLeft -= Math.ceil(18 * (1 - (p.x - r.left) / zone));
          else if (p.x <= r.right && p.x > r.right - zone) el.scrollLeft += Math.ceil(18 * (1 - (r.right - p.x) / zone));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', track, true); };
  }, [dragging]);

  const onDragCancel = () => { dragInfo.current = null; setDrag(null); };

  const openCardSafe = (id) => { if (Date.now() - lastDragEnd.current > 250) setOpenCardId(id); };

  // ---------- render ----------
  if (boards === null) return <div className="splash"><div className="spinner" /></div>;

  const dragCard = drag?.kind === 'card' ? cardsById.get(drag.id) : null;
  const dragBlock = drag?.kind === 'block' ? blocks.find((b) => b.id === drag.id) : null;
  const dragList = drag?.kind === 'list' ? lists.find((l) => l.id === drag.id) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragOver={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      autoScroll={{ threshold: { x: 0, y: 0.12 }, canScroll: (el) => !el.classList?.contains('board') }}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <div className={`app ${drag ? 'is-dragging' : ''} ${bg ? 'has-bg' : ''}`} style={bg ? { backgroundImage: `url(${bg.data})` } : undefined}>
        <Header
          phone={phone}
          boards={sortedBoards}
          board={board}
          lists={lists}
          cards={cards}
          actions={actions}
          onSelectBoard={selectBoard}
          calOpen={calOpen}
          onToggleCal={toggleCal}
          onOpenArchive={() => setArchiveOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onBackupAll={backupAll}
          backupStale={backupStale}
          user={user}
          onSignOut={onSignOut}
          demo={demo}
          showToast={showToast}
        />
        <main className="main">
          {board ? (
            <Board
              board={board}
              lists={boardLists}
              defaultColor={defaultBlockColor}
              addListColor={addListColor}
              newCardColor={newCardColor}
              cards={cards}
              blocks={blocks}
              date={date}
              actions={actions}
              drag={drag}
              cardEls={cardEls}
              listEls={listEls}
              recentDrag={recentDrag}
              hoveredRef={hoveredRef}
              onOpenCard={openCardSafe}
              onComplete={complete}
              phone={phone}
              focusListId={focusMap[board.id] || null}
              onFocus={setFocus}
            />
          ) : (
            <div className="empty-board">
              <h2>No boards yet</h2>
              <p>Create your first board, or import a Trello export from the Backup menu.</p>
              <button className="btn primary" onClick={async () => {
                const name = await promptDialog('Name your board', 'My board', { confirmLabel: 'Create board' });
                if (name) selectBoard(actions.createBoard(name, sortedBoards));
              }}>Create a board</button>
            </div>
          )}
          {calOpen && !phone && (
            <Calendar
              date={date}
              setDate={setDate}
              blocks={blocks}
              cardsById={cardsById}
              listsById={listsById}
              defaultColors={defaultColors}
              boards={sortedBoards}
              currentBoardId={board?.id}
              drag={drag}
              dragCard={dragCard}
              gridRef={calGridRef}
              actions={actions}
              onOpenCard={openCardSafe}
              onClose={toggleCal}
            />
          )}
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragCard ? (
          <div className={`overlay-card ${drag.overType === 'calendar' ? 'faint' : ''}`}>
            <CardFace card={dragCard} />
          </div>
        ) : dragList ? (
          <div className="overlay-chip">{dragList.name}</div>
        ) : dragBlock && drag.overType !== 'calendar' ? (
          <div className="overlay-chip">Drop to unschedule · {dragBlock.title}</div>
        ) : null}
      </DragOverlay>

      {openCard && (
        <CardModal
          key={openCard.id}
          card={openCard}
          boards={sortedBoards}
          lists={lists}
          cards={cards}
          actions={actions}
          onClose={() => setOpenCardId(null)}
          onArchive={() => archive(openCard)}
        />
      )}
      {archiveOpen && board && (
        <ArchiveDrawer
          backend={backend}
          board={board}
          lists={lists}
          cards={cards}
          actions={actions}
          onClose={() => setArchiveOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          board={board}
          boards={sortedBoards}
          look={look}
          backend={backend}
          showToast={showToast}
          actions={actions}
          boardCount={sortedBoards.length}
          backupStale={backupStale}
          onBackupAll={backupAll}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      <DialogHost />
      {toast && <Toast key={toast.key} msg={toast.msg} undo={toast.undo} onDone={() => setToast(null)} />}
    </DndContext>
  );
}
