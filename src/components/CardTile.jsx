import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { priorityHex, checklistProgress, hasText, fmtTime } from '../lib/core.js';
import { Icon } from './Icon.jsx';

export function CardFace({ card, block }) {
  const color = priorityHex(card.priority);
  const progress = checklistProgress(card.desc);
  const desc = hasText(card.desc);
  return (
    <div className="card-face">
      {color && <span className="prio-bar" style={{ background: color }} />}
      <div className="card-title">{card.title}</div>
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
    </div>
  );
}

export default function CardTile({ card, block, register, hoveredRef, onOpen, isDragSource }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `card:${card.id}`,
    data: { kind: 'card', id: card.id },
  });
  return (
    <div
      ref={(el) => { setNodeRef(el); register(card.id, el); }}
      className={`card ${isDragSource ? 'drag-source' : ''}`}
      data-card-id={card.id}
      onPointerEnter={() => { hoveredRef.current = card.id; }}
      onPointerLeave={() => { if (hoveredRef.current === card.id) hoveredRef.current = null; }}
      onClick={() => onOpen(card.id)}
      {...attributes}
      {...listeners}
      tabIndex={-1}
      role="button"
    >
      <CardFace card={card} block={block} />
    </div>
  );
}
