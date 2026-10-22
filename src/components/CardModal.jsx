import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Placeholder } from '@tiptap/extension-placeholder';
import { PRIORITIES } from '../lib/core.js';
import { Icon } from './Icon.jsx';
import { confirmDialog } from './Dialog.jsx';

export default function CardModal({ card, boards, lists, cards, actions, onClose, onArchive }) {
  const [title, setTitle] = useState(card.title);
  const saveTimer = useRef(null);
  const pendingDesc = useRef(null);
  const titleRef = useRef(null);

  const flushDesc = () => {
    clearTimeout(saveTimer.current);
    if (pendingDesc.current != null && pendingDesc.current !== card.desc) {
      actions.updateCard(card.id, { desc: pendingDesc.current });
    }
    pendingDesc.current = null;
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: true, autolink: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Add a description… Type "- " for bullets or "[ ] " for a checkbox.' }),
    ],
    content: card.desc || '',
    onUpdate: ({ editor: ed }) => {
      pendingDesc.current = ed.isEmpty ? '' : ed.getHTML();
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushDesc, 500);
    },
  });

  // Save on unmount.
  useEffect(() => () => flushDesc(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pick up description changes made elsewhere (another tab) when not editing.
  useEffect(() => {
    if (!editor || editor.isFocused || pendingDesc.current != null) return;
    if ((card.desc || '') !== (editor.isEmpty ? '' : editor.getHTML())) editor.commands.setContent(card.desc || '', { emitUpdate: false });
  }, [card.desc, editor]);

  useEffect(() => { setTitle(card.title); }, [card.title]);

  useEffect(() => {
    const t = titleRef.current;
    if (t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
  }, [title]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { flushDesc(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // re-bind each render so flushDesc sees the latest card

  const saveTitle = () => {
    const t = title.replace(/\s+/g, ' ').trim();
    if (t && t !== card.title) actions.updateCard(card.id, { title: t });
    else setTitle(card.title);
  };

  const boardLists = (boardId) => lists.filter((l) => l.boardId === boardId).sort((a, b) => a.order - b.order);
  const [moveBoard, setMoveBoard] = useState(card.boardId);
  useEffect(() => setMoveBoard(card.boardId), [card.boardId]);

  const fmt = useEditorState({
    editor,
    selector: ({ editor: ed }) => ed ? {
      bold: ed.isActive('bold'), bullet: ed.isActive('bulletList'), ordered: ed.isActive('orderedList'), task: ed.isActive('taskList'),
    } : {},
  }) || {};

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) { flushDesc(); onClose(); } }}>
      <div className="modal" role="dialog" aria-label="Card details">
        <button className="icon-btn modal-close" onClick={() => { flushDesc(); onClose(); }} aria-label="Close"><Icon name="x" /></button>

        <textarea
          ref={titleRef}
          className="modal-title"
          rows={1}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
        />

        <div className="modal-meta">
          <label className="meta-field">
            <span>Board</span>
            <select value={moveBoard} onChange={(e) => {
              const b = e.target.value;
              setMoveBoard(b);
              if (b === card.boardId) return;
              const first = boardLists(b)[0];
              if (first) actions.moveCardTo(card, b, first.id, cards);
            }}>
              {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="meta-field">
            <span>List</span>
            <select value={moveBoard === card.boardId ? card.listId : ''} onChange={(e) => {
              if (e.target.value) actions.moveCardTo(card, moveBoard, e.target.value, cards);
            }}>
              {moveBoard !== card.boardId && <option value="">Choose a list…</option>}
              {boardLists(moveBoard).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        </div>

        <div className="prio-row">
          <span className="section-label">Priority</span>
          <div className="prio-chips">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                className={`prio-chip ${card.priority === p.value ? 'on' : ''}`}
                style={{ '--c': p.hex }}
                onClick={() => actions.setPriority(card, p.value, cards)}
                title={`Option+${p.key}`}
              >
                <span className="swatch" />{p.name}<kbd>⌥{p.key}</kbd>
              </button>
            ))}
            <button className={`prio-chip none ${!card.priority ? 'on' : ''}`} onClick={() => actions.setPriority(card, 0, cards)} title="Option+0">
              None<kbd>⌥0</kbd>
            </button>
          </div>
        </div>

        <div className="desc">
          <div className="desc-toolbar">
            <span className="section-label">Description</span>
            <div className="tools">
              <button className={fmt.bold ? 'on' : ''} title="Bold (⌘B)" onClick={() => editor.chain().focus().toggleBold().run()}><Icon name="bold" /></button>
              <button className={fmt.bullet ? 'on' : ''} title="Bullets (type “- ”)" onClick={() => editor.chain().focus().toggleBulletList().run()}><Icon name="bullets" /></button>
              <button className={fmt.ordered ? 'on' : ''} title="Numbered (type “1. ”)" onClick={() => editor.chain().focus().toggleOrderedList().run()}><Icon name="numbers" /></button>
              <button className={fmt.task ? 'on' : ''} title="Checkboxes (type “[ ] ”)" onClick={() => editor.chain().focus().toggleTaskList().run()}><Icon name="checklist" /></button>
            </div>
          </div>
          <EditorContent editor={editor} className="editor" />
        </div>

        <footer className="modal-foot">
          <button className="btn" onClick={() => { flushDesc(); onArchive(); }}><Icon name="archive" /> Archive <kbd>⌥E</kbd></button>
          <button className="btn danger-ghost" onClick={async () => {
            const ok = await confirmDialog(`Delete “${card.title}”?`, "This can't be undone. Archive instead if you might need it later.", { confirmLabel: 'Delete card', danger: true });
            if (ok) { pendingDesc.current = null; onClose(); actions.deleteCard(card.id); }
          }}><Icon name="trash" /> Delete</button>
        </footer>
      </div>
    </div>
  );
}
