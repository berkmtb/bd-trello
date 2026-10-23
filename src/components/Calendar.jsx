import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { addDays, fmtDayLabel, fmtTime, listColor, todayKey } from '../lib/core.js';
import { Icon } from './Icon.jsx';

export const HOUR_PX = 48;              // one 30-minute slot = 24px
export const PX_PER_MIN = HOUR_PX / 60;
export const DEFAULT_DURATION = 30;
const DAY_MIN = 24 * 60;

/** Side-by-side columns for overlapping blocks. */
function layoutBlocks(blocks) {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.duration - a.duration);
  const out = new Map();
  let group = [];
  let groupEnd = -1;
  const flush = () => {
    const cols = [];
    for (const b of group) {
      let c = cols.findIndex((end) => end <= b.start);
      if (c === -1) { c = cols.length; cols.push(0); }
      cols[c] = b.start + b.duration;
      out.set(b.id, { col: c });
    }
    for (const b of group) out.get(b.id).cols = cols.length;
    group = [];
  };
  for (const b of sorted) {
    if (b.start >= groupEnd && group.length) flush();
    group.push(b);
    groupEnd = Math.max(groupEnd, b.start + b.duration);
  }
  if (group.length) flush();
  return out;
}

export default function Calendar({ date, setDate, blocks, cardsById, listsById, boards, currentBoardId, drag, dragCard, gridRef, actions, onOpenCard, onClose }) {
  const { setNodeRef } = useDroppable({ id: 'calendar', data: { type: 'calendar' } });
  const scrollRef = useRef(null);
  const [now, setNow] = useState(() => new Date());
  const isToday = date === todayKey();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const n = new Date();
    const target = date === todayKey() ? (n.getHours() - 1) * 60 : 7 * 60;
    scrollRef.current?.scrollTo({ top: Math.max(0, target) * PX_PER_MIN });
  }, [date]);

  const layout = useMemo(() => layoutBlocks(blocks), [blocks]);
  const boardName = (id) => boards.find((b) => b.id === id)?.name;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const preview = drag?.cal;
  const previewTitle = drag?.kind === 'card' ? dragCard?.title : blocks.find((b) => b.id === drag?.id)?.title;
  const previewCard = drag?.kind === 'card' ? dragCard : cardsById.get(blocks.find((b) => b.id === drag?.id)?.cardId);
  const previewColor = listColor(listsById.get(previewCard?.listId));

  return (
    <aside className="calendar">
      <header className="cal-head">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><Icon name="chevLeft" /></button>
          <button className={`btn small ${isToday ? 'muted' : ''}`} onClick={() => setDate(todayKey())}>Today</button>
          <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><Icon name="chevRight" /></button>
        </div>
        <div className="cal-title">{fmtDayLabel(date)}</div>
        <button className="icon-btn" onClick={onClose} aria-label="Hide calendar"><Icon name="x" /></button>
      </header>
      <div className={`cal-scroll ${drag?.overType === 'calendar' ? 'drop-target' : ''}`} ref={(el) => { scrollRef.current = el; setNodeRef(el); }}>
        <div className="cal-grid" ref={gridRef} style={{ height: DAY_MIN * PX_PER_MIN }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="cal-hour" style={{ top: h * HOUR_PX, height: HOUR_PX }}>
              <span className="cal-hour-label">{h === 0 ? '' : fmtTime(h * 60, true)}</span>
            </div>
          ))}
          {isToday && (
            <div className="now-line" style={{ top: nowMin * PX_PER_MIN }}><span /></div>
          )}
          <div className="cal-blocks">
            {blocks.map((b) => (
              <CalBlock
                key={b.id}
                block={b}
                pos={layout.get(b.id)}
                card={cardsById.get(b.cardId)}
                color={listColor(listsById.get(cardsById.get(b.cardId)?.listId))}
                otherBoard={(() => { const c = cardsById.get(b.cardId); return c && c.boardId !== currentBoardId ? boardName(c.boardId) : null; })()}
                hidden={drag?.kind === 'block' && drag.id === b.id && !!preview}
                actions={actions}
                onOpenCard={onOpenCard}
              />
            ))}
            {preview && (
              <div className="cal-block ghost" style={{
                top: preview.start * PX_PER_MIN,
                height: preview.duration * PX_PER_MIN - 2,
                '--accent': previewColor || 'var(--accent)',
              }}>
                <div className="cb-title">{previewTitle}</div>
                <div className="cb-time">{fmtTime(preview.start)} – {fmtTime(preview.start + preview.duration)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {blocks.length === 0 && !drag && (
        <div className="cal-hint">Drag a card here to schedule it.</div>
      )}
    </aside>
  );
}

function CalBlock({ block, pos, card, color, otherBoard, hidden, actions, onOpenCard }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `block:${block.id}`, data: { kind: 'block', id: block.id } });
  const [resizeDur, setResizeDur] = useState(null);
  const resizedAt = useRef(0);
  const duration = resizeDur ?? block.duration;
  const cols = pos?.cols || 1;
  const col = pos?.col || 0;

  const startResize = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startDur = block.duration;
    let latest = startDur;
    const move = (ev) => {
      const raw = startDur + (ev.clientY - startY) / PX_PER_MIN;
      latest = Math.max(15, Math.min(DAY_MIN - block.start, Math.round(raw / 15) * 15));
      setResizeDur(latest);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      resizedAt.current = Date.now();
      if (latest !== block.duration) actions.updateBlock(block.id, { duration: latest });
      setTimeout(() => setResizeDur(null), 300);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const short = duration <= 30;
  return (
    <div
      ref={setNodeRef}
      data-block-id={block.id}
      className={`cal-block ${hidden ? 'hidden' : ''} ${short ? 'short' : ''} ${card ? '' : 'orphan'}`}
      style={{
        top: block.start * PX_PER_MIN,
        height: duration * PX_PER_MIN - 2,
        left: `calc(${(col / cols) * 100}% + 2px)`,
        width: `calc(${100 / cols}% - 4px)`,
        '--accent': color || 'var(--accent)',
      }}
      onClick={() => { if (card && Date.now() - resizedAt.current > 300) onOpenCard(card.id); }}
      {...attributes}
      {...listeners}
      tabIndex={-1}
    >
      <div className="cb-title">{card?.title ?? block.title}{!card && <em> (archived)</em>}</div>
      <div className="cb-time">
        {fmtTime(block.start)} – {fmtTime(block.start + duration)}
        {otherBoard && <span className="cb-board"> · {otherBoard}</span>}
      </div>
      <button
        className="cb-remove"
        aria-label="Remove from calendar"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); actions.deleteBlock(block.id); }}
      ><Icon name="x" size={12} /></button>
      <div className="cb-resize" onPointerDown={startResize} />
    </div>
  );
}
