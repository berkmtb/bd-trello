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
12. **Backgrounds** (Settings → Customize → Background; no longer in the board menu): a shared **library** of uploads (`backgrounds` docs `{key:id, name, data, createdAt}`; browser resizes to ≤2400px JPEG under ~900 KB, stored in Firestore because Firebase Storage needs Blaze). Each board selects one (`board.look.backgroundId`) or none ("Remove from this board" keeps the image in the library); the trash button on a thumbnail **permanently deletes** it (boards using it fall back to the theme gradient). Library is only subscribed while Settings is open. Legacy docs (id = boardId or `default`) show up in the library as "Previous · <board>" / "Previous default background", unselected. Not included in backups.
13. Native `alert/confirm/prompt` replaced with in-app dialogs (`Dialog.jsx`) except two rare error alerts in `actions.js`.
14. No attachments (explicitly not needed).
15. **Calendar block colors**: blocks are filled solid with their **list's color** (`lists.color`, set from the list ⋯ menu → Calendar color; palette `LIST_COLORS` avoids red/orange/yellow). Lists with no color use the **default block color**, chosen in **Settings** (top bar sliders button), default `#aac7f8` (light blue). Text switches between white and navy via `textOn()` for contrast.
16. **Settings**: modal (`SettingsDialog.jsx`). **Appearance is per board**, stored on the board doc as `board.look = { theme, backgroundId, defaultBlockColor?, addListColor?, newCardColor?, priorityColors? }`; anything missing falls back to the theme (`resolveLook(board)` in `src/lib/themes.js`). Customize section (titled with the board name): Theme, Background, Default time block color, New card color (Add card button + outline), "Add another list" button color, Priority colors; "Reset to theme color" per color. Global `settings/prefs` now only holds `lastBackupAt` (old global theme/color fields are ignored). Written with `actions.saveSettings` (global) and `actions.saveBoardLook(board, wholeLookObject)` (replaces the `look` map). Also lists the keyboard shortcuts and the Your data/backup section.
17. **Reorder lists by dragging** their header (drop line shows where it lands; plain click on the title still renames). `actions.moveListTo`; the list menu's Move left/right still work.
18. **Data safety**: Settings → Your data shows the last backup time and a *Back up all boards* button (`settings/prefs.lastBackupAt`); the Settings button gets a yellow dot if there's no backup or the last one is over 7 days old.
19. **Logo**: the b mark (`public/logo-b.png`, cleaned circle, no halo) is used in the header, sign-in screen and favicon.
21. **Themes**: 12 dark themes in `src/lib/themes.js` (Midnight = default for every board without a `look`, Aurora = the original look, Forest, Ocean, Sunset, Rose, Graphite, Lavender, Dusk, Mint, Cocoa, Ember). A theme = CSS variables (`--bg-1..3`, `--topbar`, `--list`, `--card`, `--card-hover`, `--panel`, `--panel-2`, `--accent-2`) + the three custom colors + priority colors. Picking a theme **resets** that board's color overrides (keeps its background). `applyTheme()`/`applyPriorityColors()` run when the current board changes (cached in localStorage `bd-theme`/`bd-prio` to avoid a flash on load). Priority colors are CSS variables `--prio-1/2/3`; `priorityHex(p)` returns `var(--prio-N)`. Calendar blocks without a list color use **their own board's** default block color (`defaultColors` map). Trello export keeps Trello's fixed label names. No light theme yet. Migration on 2026-10-23: all boards reset to Midnight, old backgrounds moved to the library unselected.
22. **Focused list view**: list ⋯ menu → *Focus on this list* shows one list, wider and centered, with a bar of list-name chips to switch lists and *Show all lists* to exit. Remembered per board in localStorage `planner.focus` (`{boardId: listId}`). List dragging/moving is off while focused; dragging cards to the calendar still works (Workspace `focusMap`, Board `focusListId`/`onFocus`).
20. **Small branding choices**: page/tab title is "bd tasks" (`index.html`); the top-bar user avatar (initials) is solid black, no outline (`.avatar` in `styles.css`).

## Architecture
- React 18 + Vite 8, `@dnd-kit/core`, Tiptap v3 (StarterKit, TaskList, TaskItem, Placeholder), Firebase v13 (Auth + Firestore with persistent local cache).
- **Demo mode**: if `VITE_FIREBASE_*` env vars are missing, uses `localBackend.js` (localStorage, seeded sample data). `npm run build:demo` builds a single self-contained HTML (vite-plugin-singlefile) used for preview.
- Both backends share one interface: `subscribe(coll, filters, cb)`, `commit(ops)`, `newId()`. All writes go through `src/store/actions.js`.
- Firestore layout: `users/{uid}/{boards|lists|cards|blocks|backgrounds|settings}`. Rules in `firestore.rules` (owner-only; also pinned to Bruce's verified Google email, so rule changes must be published by hand in the Firebase console). Optional `VITE_ALLOWED_EMAILS` client gate.
  - `cards`: boardId, listId, title, desc (HTML), priority 0–3, order (float, meaningful only within its priority band), archived, archivedAt, createdAt, updatedAt
  - `blocks`: cardId, boardId, title (snapshot), date `YYYY-MM-DD`, start (min), duration (min)
  - `lists`: boardId, name, order, color (optional hex; absent = default block color)
  - `boards`: also `look` (see item 16). `settings`: one doc `prefs` with lastBackupAt
  - `backgrounds`: library items; id = key = generated id (legacy: boardId or `default`); name, data (JPEG data URL), createdAt
- Subscriptions: all boards, all lists, cards where archived==false (all boards), blocks for the shown date, the current board's selected background (by `key`), archived cards only when the drawer is open.

## File map
- `src/Root.jsx`: auth gate (Google sign-in) / demo mode
- `src/Workspace.jsx`: state, subscriptions, keyboard shortcuts, all drag logic, layout
- `src/components/`: Header (board menu, backup/import, calendar toggle), Board (lists, composer, drop indicator), CardTile, CardModal (editor, priority chips, move board/list), Calendar (blocks, resize, overlap layout), ArchiveDrawer, SettingsDialog (themes, backgrounds, colors, backup), Dialog (prompt/confirm), Toast, Icon
- `src/lib/core.js` (priority/sort/order/date helpers), `themes.js` (themes, `resolveLook`), `image.js` (background compression), `markdown.js` (HTML↔Markdown), `backup.js` (Trello export/import)
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
