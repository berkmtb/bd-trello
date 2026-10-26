import React, { useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { priorityHex, checklistProgress, hasText, fmtTime } from '../lib/core.js';
import { Icon } from './Icon.jsx';

export function CardFace({ card, block, doneBtn, fromName }) {
  const color = priorityHex(card.priority);
  const progress = checklistProgress(card.desc);
  const desc = hasText(card.desc);
  return (
    <div className={`card-face ${fromName ? 'has-from' : ''}`}>
      {color && <span className="prio-bar" style={{ background: color }} />}
      <div className="title-row">{doneBtn}<div className="card-title">{card.title}</div></div>
      {(desc || progress || block) && (
        <div className="badges">
          {block && (
            <span className="badge sched" title="Scheduled on the calendar day shown">
              <Icon name="clock" /> {fmtTime(block.start, true)}
            </span>
          )}
          {desc && <span className="badge" title="Has a description"><Icon name="lines" /></span>}
          {progress && (
            <span className={`badge ${progress.done === progress.total ? 'done' : ''}`} title="Checklist">
              <Icon name="check" /> {progress.done}/{progress.total}
            </span>
          )}
        </div>
      )}
      {fromName && <span className="from-tag" title="Came from this list">{fromName}</span>}
    </div>
  );
}

const stop = (e) => e.stopPropagation();

export default function CardTile({ fromName, card, block, register, hoveredRef, onOpen, onComplete, isDragSource }) {
  const [completing, setCompleting] = useState(false);
  const timer = useRef(null);
  const finish = (e) => {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    timer.current = setTimeout(() => onComplete(card), reduce ? 80 : 650);
  };
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `card:${card.id}`,
    data: { kind: 'card', id: card.id },
  });
  return (
    <div
      ref={(el) => { setNodeRef(el); register(card.id, el); }}
      className={`card ${isDragSource ? 'drag-source' : ''} ${completing ? 'completing' : ''}`}
      data-card-id={card.id}
      onPointerEnter={() => { hoveredRef.current = card.id; }}
      onPointerLeave={() => { if (hoveredRef.current === card.id) hoveredRef.current = null; }}
      onClick={() => onOpen(card.id)}
      {...attributes}
      {...listeners}
      tabIndex={-1}
      role="button"
    >
      <CardFace
        fromName={fromName}
        card={card}
        block={block}
        doneBtn={onComplete && (
          <button
            type="button"
            className="done-btn"
            aria-label="Mark complete"
            title="Mark complete"
            onClick={finish}
            onMouseDown={stop}
            onTouchStart={stop}
            onPointerDown={stop}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle className="ring" cx="12" cy="12" r="9" />
              <path className="tick" d="M7.5 12.5l3 3 6-6.5" />
            </svg>
          </button>
        )}
      />
    </div>
  );
}
