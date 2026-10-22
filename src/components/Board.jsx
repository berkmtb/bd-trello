import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { sortCards } from '../lib/core.js';
import CardTile from './CardTile.jsx';
import { Icon } from './Icon.jsx';
import { confirmDialog } from './Dialog.jsx';

export default function Board({ board, lists, cards, blocks, date, actions, drag, cardEls, hoveredRef, onOpenCard }) {
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

  return (
    <div className="board">
      {lists.map((list, i) => (
        <ListColumn
          key={list.id}
          list={list}
          isFirst={i === 0}
          isLast={i === lists.length - 1}
          allLists={lists}
          cards={cards}
          blockByCard={blockByCard}
          actions={actions}
          drag={drag}
          register={register}
          hoveredRef={hoveredRef}
          onOpenCard={onOpenCard}
        />
      ))}
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
          <button className="add-list-btn" onClick={() => setAdding(true)}><Icon name="plus" /> Add another list</button>
        )}
      </div>
    </div>
  );
}

function ListColumn({ list, isFirst, isLast, allLists, cards, blockByCard, actions, drag, register, hoveredRef, onOpenCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: `list:${list.id}`, data: { type: 'list', listId: list.id } });
  const listCards = useMemo(() => sortCards(cards.filter((c) => c.listId === list.id)), [cards, list.id]);
  const [editingName, setEditingName] = useState(false);
  const [menu, setMenu] = useState(false);
  const [composer, setComposer] = useState(false);
  const [title, setTitle] = useState('');
  const bodyRef = useRef(null);

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
    <section ref={setNodeRef} className={`list ${isOver && drag?.kind === 'card' ? 'drop-target' : ''}`}>
      <header className="list-head">
        {editingName ? (
          <input
            className="list-name-input"
            autoFocus
            defaultValue={list.name}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== list.name) actions.renameList(list.id, v); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingName(false); }}
          />
        ) : (
          <h2 className="list-name" onClick={() => setEditingName(true)} title="Click to rename">{list.name}</h2>
        )}
        <span className="list-count">{listCards.length}</span>
        <div className="menu-wrap">
          <button className="icon-btn" aria-label="List menu" onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }}><Icon name="dots" /></button>
          {menu && (
            <div className="menu" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setMenu(false); setComposer(true); }}>Add card</button>
              <button onClick={() => { setMenu(false); setEditingName(true); }}>Rename list</button>
              <button disabled={isFirst} onClick={() => { setMenu(false); actions.moveList(list, -1, allLists); }}>Move list left</button>
              <button disabled={isLast} onClick={() => { setMenu(false); actions.moveList(list, 1, allLists); }}>Move list right</button>
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
          <div className="composer">
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
              <button className="btn primary" onClick={submitCard}>Add card</button>
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
