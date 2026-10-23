# bd-trello: context for continuing development

This file is the hand-off for any new Claude session working on this app. Read it fully before making changes.

## Owner and working style
- Owner: Bruce Yamamoto (GitHub `berkmtb`). Mac user, Chrome/Safari, comfortable with GitHub, Vercel, Firebase, Python.
- Works directively: give clear scope, surface architecture and platform constraints **before** implementing, and get approval on approach for anything non-obvious.
- Prefers targeted edits over rewrites. Don't overstate conclusions beyond the evidence.
- Deploys via GitHub → Vercel auto-deploy (same pattern as his `seating-chart-maker` app). Every change: commit to `main`, push, Vercel redeploys.

## What the app is
A personal replacement for Trello (Bruce didn't want to pay for Trello's Planner drag-to-calendar feature, then decided to replace Trello entirely). Single user. Desktop-first.

### Agreed requirements (all implemented)
1. **Multiple boards** with a switcher (board name, top left). Create / rename / delete (delete requires typing the board name).
2. **Lists** per board: add, rename (click title), move left/right, delete (cards go to archive).
3. **Cards**: title, rich-text description (Tiptap) with bullets, numbered lists, and **clickable checkboxes** (task list). Card face shows description icon, checklist progress (e.g. 2/5), and scheduled time if on the calendar day shown.
4. **Priority**: red (1), orange (2), yellow (3), none (0). Shown as a colored bar on the card like a Trello label.
5. **Auto-sort**: each list always sorts red → orange → yellow → none. **Sort rule (a)** chosen by Bruce: priority sets the band; manual drag reorders only *within* a band; dropping into another band snaps back to the card's own band (priority changes only by keystroke or the card dialog).
6. **Keyboard shortcuts** (act on hovered card, or the open card):
   - **Option+1 / 2 / 3** → red / orange / yellow (same key again toggles it off)
   - **Option+0** → remove priority
   - **Option+E** → archive (works even while typing in the description)
   - **C** (no modifier) → archive, ignored while typing in any text field (Trello muscle memory)
   - Cmd+1–3 was rejected: browsers reserve Cmd+number for tab switching.
   - Uses `e.code` (Digit1, KeyE) with preventDefault in a capture-phase window listener so ¡/™/£ and the Option+E accent dead key don't get typed. **Unverified on a real Mac**: whether Option+E inside the description leaves an accent on the next letter. Fallback if it does: Option+A or Option+X.
   - Changing priority puts the card at the **top** of its new band. New cards go to the bottom of the none band.
7. **Drag and drop** (dnd-kit core, custom logic): reorder within band, move between lists, drag onto calendar. Drop indicator line shows insertion point. Custom edge auto-scroll for the board (dnd-kit's built-in one kept scrolling while over the calendar).
8. **Day calendar**: pinned on the **left**, toggled by the Calendar button in the top bar or × on the panel (remembered in localStorage). 24h grid, 48px/hour, 30-min slots, 15-min snapping, default block 30 min. Drag card → creates a block; drag block → move; drag bottom edge → resize; drag block off calendar or click × → unschedule (Undo toast). Shows blocks from **all boards** for that day; Today/prev/next; red now-line. No Outlook/phone sync (explicitly not wanted).
9. **Archive**: Archived drawer per board with search, restore (to original list, else first list), permanent delete. Archive shows an Undo toast.
10. **Backup / import**: Backup menu → this board or all boards as JSON in **Trello's board-export format** (lists, cards, labels red/orange/yellow named "Priority 1/2/3", `closed` for archived, Markdown descriptions with `- [ ]` checkboxes) plus a `planner` block for exact restore (HTML descriptions, calendar blocks). Import accepts real Trello exports (red/orange/yellow labels → priority; Trello checklists → description checkboxes; closed lists → archived) or this app's backups. Imports always create new boards.
11. **Back to Trello**: Trello has no native JSON import, so `scripts/push_to_trello.py` (stdlib only, `TRELLO_KEY`/`TRELLO_TOKEN`, `--checklists`, `--dry-run`) recreates boards via Trello's API.
12. **Backgrounds**: board menu → Change background… Upload an image; browser resizes to ≤2400px JPEG under ~900 KB and stores it in Firestore (Firebase Storage would require the Blaze plan). Per board, or a default for all boards; removable. Not included in backups.
13. Native `alert/confirm/prompt` replaced with in-app dialogs (`Dialog.jsx`) except two rare error alerts in `actions.js`.
14. No attachments (explicitly not needed).
15. **Calendar block colors**: blocks are filled solid with their **list's color** (`lists.color`, set from the list ⋯ menu → Calendar color; palette `LIST_COLORS` avoids red/orange/yellow). Lists with no color use the **default block color**, chosen in **Settings** (top bar sliders button), default `#aac7f8` (light blue). Text switches between white and navy via `textOn()` for contrast.
16. **Settings**: modal (`SettingsDialog.jsx`), stored in the single doc `settings/prefs` (`defaultBlockColor`, `addListColor`, `newCardColor`, `lastBackupAt`); it has a **Customize** section (default time block color; "New card color" = the new-card composer's Add card button + outline, default `#aac7f8` = `DEFAULT_NEW_CARD_COLOR`, one setting for both; "Add another list" button color, default yellow `#f2c200` = `DEFAULT_ADD_LIST_COLOR`, same as the backup notice dot) and also lists the keyboard shortcuts (formerly a hint in the top bar). Written with `actions.saveSettings` (set, not update, since the doc may not exist yet).
17. **Reorder lists by dragging** their header (drop line shows where it lands; plain click on the title still renames). `actions.moveListTo`; the list menu's Move left/right still work.
18. **Data safety**: Settings → Your data shows the last backup time and a *Back up all boards* button (`settings/prefs.lastBackupAt`); the Settings button gets a yellow dot if there's no backup or the last one is over 7 days old.
19. **Logo**: the b mark (`public/logo-b.png`, cleaned circle, no halo) is used in the header, sign-in screen and favicon.
20. **Small branding choices**: page/tab title is "bd tasks" (`index.html`); the top-bar user avatar (initials) is solid black, no outline (`.avatar` in `styles.css`).

## Architecture
- React 18 + Vite 8, `@dnd-kit/core`, Tiptap v3 (StarterKit, TaskList, TaskItem, Placeholder), Firebase v13 (Auth + Firestore with persistent local cache).
- **Demo mode**: if `VITE_FIREBASE_*` env vars are missing, uses `localBackend.js` (localStorage, seeded sample data). `npm run build:demo` builds a single self-contained HTML (vite-plugin-singlefile) used for preview.
- Both backends share one interface: `subscribe(coll, filters, cb)`, `commit(ops)`, `newId()`. All writes go through `src/store/actions.js`.
- Firestore layout: `users/{uid}/{boards|lists|cards|blocks|backgrounds|settings}`. Rules in `firestore.rules` (owner-only; also pinned to Bruce's verified Google email, so rule changes must be published by hand in the Firebase console). Optional `VITE_ALLOWED_EMAILS` client gate.
  - `cards`: boardId, listId, title, desc (HTML), priority 0–3, order (float, meaningful only within its priority band), archived, archivedAt, createdAt, updatedAt
  - `blocks`: cardId, boardId, title (snapshot), date `YYYY-MM-DD`, start (min), duration (min)
  - `lists`: boardId, name, order, color (optional hex; absent = default block color)
  - `settings`: one doc `prefs` with defaultBlockColor, addListColor, newCardColor, lastBackupAt
  - `backgrounds`: id = boardId or `default`; key (same), data (JPEG data URL)
- Subscriptions: all boards, all lists, cards where archived==false (all boards), blocks for the shown date, backgrounds for current board + default, archived cards only when the drawer is open.

## File map
- `src/Root.jsx`: auth gate (Google sign-in) / demo mode
- `src/Workspace.jsx`: state, subscriptions, keyboard shortcuts, all drag logic, layout
- `src/components/`: Header (board menu, backup/import, calendar toggle), Board (lists, composer, drop indicator), CardTile, CardModal (editor, priority chips, move board/list), Calendar (blocks, resize, overlap layout), ArchiveDrawer, BackgroundDialog, Dialog (prompt/confirm), Toast, Icon
- `src/lib/core.js` (priority/sort/order/date helpers), `markdown.js` (HTML↔Markdown), `backup.js` (Trello export/import)
- `src/store/`: firebase.js, localBackend.js, actions.js, seed.js
- `scripts/push_to_trello.py`, `firestore.rules`, `.env.example`, `README.md` (user-facing setup)

## Status (as of 2026-10-23)
- Code is on GitHub `berkmtb/bd-trello` (private), branch `main`. Deployed at https://bd-trello.vercel.app (Firebase project `bd-trello-cad04`, Google sign-in, Vercel domain authorized, `VITE_ALLOWED_EMAILS` set).
- Tested with headless Chromium (Playwright) against the demo build: shortcuts, band-clamped drag, cross-list moves, edge scrolling, calendar create/move/resize/unschedule, editor checkboxes, export → import round trip, Trello-export import, dialogs, backgrounds. No console errors.
- Firebase, Vercel and authorized-domain setup are done. Bruce still needs to sign in and import his Trello boards (Backup → Import).
- Not decided yet: phone layout (asked, not answered; currently desktop-first).

## Working on it in a new session
- The new Claude account needs GitHub access to `berkmtb/bd-trello` (Claude GitHub app installed with that repo selected) to push. Otherwise work from the zip and Bruce pushes.
- `npm install`, then `npm run dev` (demo mode without `.env.local`). Build check: `npm run build`.
- Commit to `main` and push; Vercel redeploys.
