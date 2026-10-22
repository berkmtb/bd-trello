# bd-trello

A personal Trello replacement: boards, priority-sorted lists, rich card descriptions, and a day calendar you drag cards onto.

Built with React + Vite, stored in Firebase (Firestore + Google sign-in), hosted on Vercel. Every push to `main` redeploys.

## Using it

| Action | How |
| --- | --- |
| Red / orange / yellow priority | Hover a card (or open it) and press **⌥1 / ⌥2 / ⌥3**. Press the same key again to clear it. |
| Remove priority | **⌥0** |
| Archive | **⌥E** anywhere, or **C** when you're not typing |
| Reorder | Drag up or down. Cards stay inside their priority color; lists always sort red → orange → yellow → none. |
| Move to another list | Drag it, or open the card and change **List** (or **Board**). |
| Schedule | Drag a card onto the calendar. Drag a block to move it, drag its bottom edge to resize, drag it off the calendar (or click ×) to unschedule. |
| Checkboxes and bullets | In a description, type `- ` for bullets, `1. ` for numbers, `[ ] ` for a checkbox, or use the toolbar. |
| Restore archived cards | **Archived** button in the top bar. |
| Backup | **Backup → Back up all boards** downloads one JSON file in Trello's export format. |
| Import | **Backup → Import** accepts a Trello board export (Board menu → Print, export and share → Export as JSON) or a backup from this app. Imports always create new boards. |

Changing a card's priority places it at the top of its new color group. New cards go to the bottom of the uncolored group.

## One-time setup

### 1. Firebase
1. [console.firebase.google.com](https://console.firebase.google.com) → **Create a project** (Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
3. **Build → Firestore Database → Create database** → production mode → a US region.
4. In Firestore, open the **Rules** tab, paste the contents of `firestore.rules`, and **Publish**.
5. **Project settings (gear) → Your apps → Web (`</>`)** → register an app (no Hosting). Copy the six `firebaseConfig` values.

### 2. Vercel
1. [vercel.com/new](https://vercel.com/new) → import the **bd-trello** GitHub repo. Vercel detects Vite automatically.
2. Before deploying, add **Environment Variables** (names in `.env.example`):
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, and optionally `VITE_ALLOWED_EMAILS` (your Google address).
3. **Deploy.**

### 3. Allow sign-in from your Vercel address
Firebase → **Authentication → Settings → Authorized domains → Add domain** → your Vercel domain (e.g. `bd-trello.vercel.app`).

### 4. Move your Trello boards over
In Trello, for each board: **⋯ → Print, export and share → Export as JSON**. Save the file, then use **Backup → Import** in the app. Red, orange and yellow labels become priorities; Trello checklists become checkboxes in the description.

Without Firebase settings, the app runs in demo mode and saves only to that browser.

## Getting back into Trello

Trello has no built-in JSON import, so `scripts/push_to_trello.py` rebuilds a backup through Trello's API (free plan is fine, standard library only):

```bash
export TRELLO_KEY=...  TRELLO_TOKEN=...   # instructions at the top of the script
python3 scripts/push_to_trello.py planner-backup-2026-10-22.json --checklists
```

## Development

```bash
npm install
cp .env.example .env.local   # fill in the Firebase values, or leave blank for demo mode
npm run dev
```

## Data model

Everything lives under `users/{uid}/` in Firestore:

- `boards` — name, order
- `lists` — boardId, name, order
- `cards` — boardId, listId, title, desc (HTML), priority (0 none, 1 red, 2 orange, 3 yellow), order (within its priority group), archived
- `blocks` — calendar entries: cardId, date (`YYYY-MM-DD`), start and duration in minutes
