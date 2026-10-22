import React, { useEffect, useRef, useState } from 'react';

// Promise-based replacements for window.prompt / window.confirm.
let push = null;
const queue = [];

/** ask({ title, message, input, placeholder, confirmLabel, danger, requireText }) → string | true | null */
export function ask(opts) {
  return new Promise((resolve) => {
    const req = { ...opts, resolve };
    if (push) push(req); else queue.push(req);
  });
}
export const confirmDialog = (title, message, opts = {}) =>
  ask({ title, message, confirmLabel: 'OK', ...opts }).then((v) => v !== null);
export const promptDialog = (title, initial = '', opts = {}) =>
  ask({ title, input: initial, confirmLabel: 'Save', ...opts });

export function DialogHost() {
  const [req, setReq] = useState(null);
  useEffect(() => {
    push = (r) => setReq(r);
    if (queue.length) setReq(queue.shift());
    return () => { push = null; };
  }, []);
  if (!req) return null;
  return <DialogBox key={Date.now()} req={req} onDone={(v) => { req.resolve(v); setReq(queue.shift() || null); }} />;
}

function DialogBox({ req, onDone }) {
  const hasInput = req.input !== undefined;
  const [value, setValue] = useState(hasInput ? req.input : '');
  const inputRef = useRef(null);
  const okRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } else okRef.current?.focus();
  }, []);

  const blocked = (hasInput && !value.trim()) || (req.requireText && value.trim() !== req.requireText);
  const submit = () => { if (!blocked) onDone(hasInput ? value.trim() : true); };

  return (
    <div className="modal-backdrop dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onDone(null)}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onDone(null); } }}>
      <form className="dialog" role="dialog" aria-label={req.title} onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <h2>{req.title}</h2>
        {req.message && <p>{req.message}</p>}
        {(hasInput || req.requireText) && (
          <input
            id="dialog-input"
            ref={inputRef}
            value={value}
            placeholder={req.placeholder || req.requireText || ''}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
          />
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => onDone(null)}>Cancel</button>
          <button ref={okRef} type="submit" className={`btn ${req.danger ? 'danger' : 'primary'}`} disabled={blocked}>
            {req.confirmLabel || 'OK'}
          </button>
        </div>
      </form>
    </div>
  );
}
