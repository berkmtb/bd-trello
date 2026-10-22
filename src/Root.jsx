import React, { useEffect, useMemo, useState } from 'react';
import { firebaseConfigured, allowedEmails, watchAuth, signIn, signOutUser, createFirestoreBackend } from './store/firebase.js';
import { createLocalBackend } from './store/localBackend.js';
import { seedDemo } from './store/seed.js';
import Workspace from './Workspace.jsx';

export default function Root() {
  if (!firebaseConfigured) return <DemoRoot />;
  return <FirebaseRoot />;
}

function DemoRoot() {
  const backend = useMemo(() => createLocalBackend(seedDemo), []);
  return <Workspace backend={backend} user={null} demo />;
}

function FirebaseRoot() {
  const [user, setUser] = useState(undefined);
  const [error, setError] = useState('');
  useEffect(() => watchAuth(setUser), []);
  const backend = useMemo(() => (user ? createFirestoreBackend(user.uid) : null), [user]);

  if (user === undefined) return <div className="splash"><div className="spinner" /></div>;

  if (!user) {
    return (
      <div className="splash">
        <div className="signin">
          <div className="logo-mark" />
          <h1>Planner</h1>
          <p>Boards, priorities and a day calendar.</p>
          <button className="btn primary big" onClick={() => signIn().catch((e) => setError(e.message))}>
            Sign in with Google
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  if (allowedEmails.length && !allowedEmails.includes((user.email || '').toLowerCase())) {
    return (
      <div className="splash">
        <div className="signin">
          <h1>Not authorized</h1>
          <p>{user.email} isn't allowed to use this planner.</p>
          <button className="btn" onClick={signOutUser}>Sign out</button>
        </div>
      </div>
    );
  }

  return <Workspace key={user.uid} backend={backend} user={user} onSignOut={signOutUser} />;
}
