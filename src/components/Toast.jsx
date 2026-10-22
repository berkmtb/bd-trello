import React, { useEffect, useRef } from 'react';

export default function Toast({ msg, undo, onDone }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="toast" role="status">
      <span>{msg}</span>
      {undo && <button onClick={() => { undo(); done.current(); }}>Undo</button>}
    </div>
  );
}
