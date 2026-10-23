import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { sortCards, LIST_COLORS, textOn } from '../lib/core.js';
import CardTile from './CardTile.jsx';
import { Icon } from './Icon.jsx';
import { confirmDialog, promptDialog } from './Dialog.jsx';

export default function Board({ board, lists, defaultColor, addListColor, newCardColor, cards, blocks, date, actions, drag, cardEls, listEls, recentDrag, hoveredRef, onOpenCard, focusListId, onFocus, phone }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const register = (id, el) => { if (el) cardEls.current.set(id, el); else cardEls.current.delete(id); };

  // Earliest block per card on the calendar day being shown.
  const blockByCard = useMemo(() => {
    const m = new Map();
    for (const b of blocks) if (!m.has(b.cardId) || m.get(b.cardId).start > b.start) m.set(b.cardId, b);
    return m;
  }, [blocks]);

  const submitList = () => {
    if (name.trim()) actions.createList(board.id, name.trim(), lists);
    setName('');
  };

  // Render lists with a drop line at the insertion point while a list is being dragged.
  const draggingListId = drag?.kind === 'list' ? drag.id : null;
  const listItems = [];
  let k = 0;
  lists.forEach((list, i) => {
    if (list.id !== draggingListId) {
      if (draggingListId && drag.listIndex === k) listItems.push(<div key="__list-drop" className="list-drop-line" />);
      k++;
    }
    listItems.push(
      <ListColumn
        key={list.id}
        defaultColor={defaultColor}
        newCardColor={newCardColor}
        list={list}
        isFirst={i === 0}
        isLast={i === lists.length - 1}
        allLists={lists}
        cards={cards}
        blockByCard={blockByCard}
        actions={actions}
        drag={drag}
        register={register}
        registerList={(id, el) => { if (el) listEls.current.set(id, el); else listEls.current.delete(id); }}
        recentDrag={recentDrag}
        isDragSource={list.id === draggingListId}
        hoveredRef={hoveredRef}
        onOpenCard={onOpenCard}
        onFocus={onFocus}
      />,
    );
  });
  if (draggingListId && drag.listIndex != null && drag.listIndex >= k) listItems.push(<div key="__list-drop" className="list-drop-line" />);

  // Phone: always one list at a time (the focused list, or the first one), with swipe to switch.
  const focusList = (focusListId && lists.find((l) => l.id === focusListId)) || (phone ? lists[0] : null);
  const touch = useRef(null);
  const addListPrompt = async () => {
    const n = await promptDialog('New list', '', { placeholder: 'List name', confirmLabel: 'Add list' });
    if (n && n.trim()) actions.createList(board.id, n.trim(), lists);
  };
  const swipe = {
    onTouchStart: (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY, t: Date.now() }; },
    onTouchEnd: (e) => {
      const s = touch.current; touch.current = null;
      if (!s || drag || !focusList) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x; const dy = t.clientY - s.y;
      if (Math.abs(dx) < 70 || Math.abs(dy) > 45 || Date.now() - s.t > 600) return;
      if (e.target.closest?.('input, textarea, .tiptap')) return;
      const i = lists.findIndex((l) => l.id === focusList.id);
      const next = lists[i + (dx < 0 ? 1 : -1)];
      if (next) onFocus(next.id);
    },
  };
  if (phone && !lists.length) {
    return (
      <div className="board-wrap">
        <div className="phone-empty">
          <h2>No lists yet</h2>
          <p>Add your first list to start adding tasks.</p>
          <button className="btn primary" onClick={addListPrompt}>Add a list</button>
        </div>
      </div>
    );
  }
  if (focusList) {
    const fi = lists.findIndex((l) => l.id === focusList.id);
    return (
      <div className="board-wrap">
        <div className="focus-bar">
          <div className="focus-chips">
            {lists.map((l) => (
              <button key={l.id} className={`focus-chip ${l.id === focusList.id ? 'on' : ''}`} onClick={() => onFocus(l.id)}>{l.name}</button>
            ))}
            {phone && <button className="focus-chip add" onClick={addListPrompt} aria-label="Add list">+ List</button>}
          </div>
          {!phone && <button className="top-btn" onClick={() => onFocus(null)}>Show all lists</button>}
        </div>
        <div className="board focus-mode" {...swipe}>
          <ListColumn
            key={focusList.id}
            focused
            phone={phone}
            onFocus={onFocus}
            defaultColor={defaultColor}
            newCardColor={newCardColor}
            list={focusList}
            isFirst={fi === 0}
            isLast={fi === lists.length - 1}
            allLists={lists}
            cards={cards}
            blockByCard={blockByCard}
            actions={actions}
            drag={drag}
            register={register}
            registerList={() => {}}
            recentDrag={recentDrag}
            isDragSource={false}
            hoveredRef={hoveredRef}
            onOpenCard={onOpenCard}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="board-wrap">
    <div className="board">
      {listItems}
      <div className="list add-list">
        {adding ? (
          <div className="composer">
            <input
              autoFocus
              value={name}
              placeholder="List name"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitList();
                if (e.key === 'Escape') { setAdding(false); setName(''); }
              }}
            />
            <div className="row">
              <button className="btn primary" onClick={submitList}>Add list</button>
              <button className="icon-btn" onClick={() => { setAdding(false); setName(''); }} aria-label="Cancel"><Icon name="x" /></button>
            </div>
          </div>
        ) : (
          <button className="add-list-btn" style={{ background: addListColor, color: textOn(addListColor) }} onClick={() => setAdding(true)}><Icon name="plus" /> Add another list</button>
        )}
      </div>
    </div>
    </div>
  );
}

function ListColumn({ focused, phone, onFocus, list, defaultColor, newCardColor, isFirst, isLast, allLists, cards, blockByCard, actions, drag, register, registerList, recentDrag, isDragSource, hoveredRef, onOpenCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: `list:${list.id}`, data: { type: 'list', listId: list.id } });
  const listCards = useMemo(() => sortCards(cards.filter((c) => c.listId === list.id)), [cards, list.id]);
  const [editingName, setEditingName] = useState(false);
  const [menu, setMenu] = useState(false);
  const [composer, setComposer] = useState(false);
  const [title, setTitle] = useState('');
  const bodyRef = useRef(null);
  const sectionRef = (el) => { setNodeRef(el); registerList(list.id, el); };
  // The header is the drag handle (turned off while renaming so text can be selected).
  const { setNodeRef: setHandleRef, listeners: handleListeners } = useDraggable({
    id: `listdrag:${list.id}`, data: { kind: 'list', id: list.id }, disabled: editingName || focused,
  });

  const draggingId = drag?.kind === 'card' ? drag.id : null;
  const insert = drag?.insert?.listId === list.id ? drag.insert : null;

  // Render cards with a drop indicator at the insertion point (index counts exclude the dragged card).
  const items = [];
  let k = 0;
  for (const c of listCards) {
    if (c.id !== draggingId) {
      if (insert && insert.fullIndex === k) items.push(<div key="__drop" className="drop-line" />);
      k++;
    }
    items.push(
      <CardTile
        key={c.id}
        card={c}
        block={blockByCard.get(c.id)}
        register={register}
        hoveredRef={hoveredRef}
        onOpen={onOpenCard}
        isDragSource={c.id === draggingId}
      />,
    );
  }
  if (insert && insert.fullIndex >= k) items.push(<div key="__drop" className="drop-line" />);

  const submitCard = () => {
    const t = title.trim();
    if (t) actions.createCard(list.boardId, list.id, t, cards);
    setTitle('');
    setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }), 50);
  };

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  return (
    <section
      ref={sectionRef}
      className={`list ${isOver && drag?.kind === 'card' ? 'drop-target' : ''} ${list.color ? 'has-color' : ''} ${isDragSource ? 'drag-source' : ''} ${focused ? 'focused' : ''}`}
      style={list.color ? { '--list-color': list.color } : undefined}
    >
      <header className="list-head" ref={setHandleRef} {...(editingName || focused ? {} : handleListeners)}>
        {editingName ? (
          <input
            className="list-name-input"
            autoFocus
            defaultValue={list.name}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== list.name) actions.renameList(list.id, v); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingName(false); }}
          />
        ) : (
          <h2 className="list-name" onClick={() => { if (!recentDrag()) setEditingName(true); }} title="Click to rename · drag the header to move">{list.name}</h2>
        )}
        <span className="list-count">{listCards.length}</span>
        <div className="menu-wrap">
          <button className="icon-btn" aria-label="List menu" onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }}><Icon name="dots" /></button>
          {menu && (
            <div className="menu" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setMenu(false); setComposer(true); }}>Add card</button>
              {!phone && <button onClick={() => { setMenu(false); onFocus(focused ? null : list.id); }}>{focused ? 'Show all lists' : 'Focus on this list'}</button>}
              <button onClick={() => { setMenu(false); setEditingName(true); }}>Rename list</button>
              <button disabled={isFirst} onClick={() => { setMenu(false); actions.moveList(list, -1, allLists); }}>Move list left</button>
              <button disabled={isLast} onClick={() => { setMenu(false); actions.moveList(list, 1, allLists); }}>Move list right</button>
              <hr />
              <div className="menu-label">Calendar color</div>
              <div className="color-swatches">
                <button
                  type="button"
                  className={`swatch ${!list.color ? 'current' : ''}`}
                  style={{ background: defaultColor }}
                  title="Default (set in Settings)"
                  aria-label="Default color"
                  onClick={() => { setMenu(false); actions.setListColor(list.id, null); }}
                />
                {LIST_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`swatch ${list.color === c.hex ? 'current' : ''}`}
                    style={{ background: c.hex }}
                    title={c.name}
                    aria-label={c.name}
                    onClick={() => { setMenu(false); actions.setListColor(list.id, c.hex); }}
                  />
                ))}
              </div>
              <hr />
              <button className="danger" onClick={async () => {
                setMenu(false);
                const ok = await confirmDialog(`Delete “${list.name}”?`,
                  listCards.length ? `Its ${listCards.length} card${listCards.length === 1 ? '' : 's'} will move to the archive, where you can restore them.` : '',
                  { confirmLabel: 'Delete list', danger: true });
                if (ok) actions.deleteList(list, cards);
              }}>Delete list…</button>
            </div>
          )}
        </div>
      </header>
      <div className="list-body" ref={bodyRef}>
        {items}
        {composer && (
          <div className="composer card-composer" style={{ '--new-card-color': newCardColor, '--on-new-card': textOn(newCardColor) }}>
            <textarea
              autoFocus
              rows={2}
              value={title}
              placeholder="Enter a title for this card…"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); submitCard(); }
                if (e.key === 'Escape') { setComposer(false); setTitle(''); }
              }}
            />
            <div className="row">
              <button className="btn primary add-card-submit" onClick={submitCard}>Add card</button>
              <button className="icon-btn" onClick={() => { setComposer(false); setTitle(''); }} aria-label="Cancel"><Icon name="x" /></button>
            </div>
          </div>
        )}
      </div>
      {!composer && (
        <button className="add-card-btn" onClick={() => setComposer(true)}><Icon name="plus" /> Add a card</button>
      )}
    </section>
  );
}
