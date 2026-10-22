import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

// Firestore documents max out at ~1 MB, so images are shrunk in the browser first.
const MAX_CHARS = 900_000;

async function compressImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file couldn't be read as an image."));
      i.src = url;
    });
    let maxW = 2400;
    let quality = 0.82;
    for (let attempt = 0; attempt < 8; attempt++) {
      const scale = Math.min(1, maxW / img.naturalWidth, (maxW * 0.75) / img.naturalHeight);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= MAX_CHARS) return { data, w, h };
      if (quality > 0.6) quality -= 0.1; else maxW = Math.round(maxW * 0.8);
    }
    throw new Error('That image is too detailed to store. Try a smaller one.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function BackgroundDialog({ board, boardBg, defaultBg, actions, onClose, showToast }) {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null); // { data, w, h, name }
  const [scope, setScope] = useState('board');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const current = boardBg || defaultBg;
  const shown = pending?.data || current?.data;
  const source = pending
    ? `${pending.name} · resized to ${pending.w}×${pending.h} (${Math.round(pending.data.length / 1024)} KB)`
    : boardBg ? 'This board has its own background.'
      : defaultBg ? 'Using the default background for all boards.'
        : 'Using the built-in gradient.';

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const out = await compressImage(file);
      setPending({ ...out, name: file.name });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!pending) return;
    setBusy(true);
    if (scope === 'all') await actions.setBackground('default', pending.data, boardBg ? board.id : null);
    else await actions.setBackground(board.id, pending.data);
    setBusy(false);
    showToast(scope === 'all' ? 'Background set for all boards' : `Background set for “${board.name}”`);
    onClose();
  };

  return (
    <div className="modal-backdrop dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog bg-dialog" role="dialog" aria-label="Board background">
        <h2>Background · {board.name}</h2>

        <div className="bg-preview" style={shown ? { backgroundImage: `url(${shown})` } : undefined}>
          <div className="mini-lists"><span /><span /><span /></div>
        </div>
        <div className="bg-source">{source}</div>

        <input ref={fileRef} id="bg-file" type="file" accept="image/*" hidden onChange={onFile} />
        <div className="bg-row">
          <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Icon name="plus" size={14} /> {pending ? 'Choose a different image…' : 'Upload image…'}
          </button>
        </div>

        {pending && (
          <div className="bg-scope">
            <label><input type="radio" name="bg-scope" checked={scope === 'board'} onChange={() => setScope('board')} /> Just this board</label>
            <label><input type="radio" name="bg-scope" checked={scope === 'all'} onChange={() => setScope('all')} /> All boards (boards with their own image keep it)</label>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        {!pending && (boardBg || defaultBg) && (
          <div className="bg-row">
            {boardBg && (
              <button className="link-btn" onClick={() => { actions.removeBackground(board.id); showToast('Removed this board’s background'); }}>
                Remove this board’s background
              </button>
            )}
            {defaultBg && (
              <button className="link-btn" onClick={() => { actions.removeBackground('default'); showToast('Removed the default background'); }}>
                Remove default for all boards
              </button>
            )}
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn" onClick={onClose}>{pending ? 'Cancel' : 'Done'}</button>
          {pending && <button className="btn primary" onClick={save} disabled={busy}>Save background</button>}
        </div>
      </div>
    </div>
  );
}
