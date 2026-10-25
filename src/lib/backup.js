// Backup in Trello's board-export JSON shape, plus a "planner" block that
// lets this app restore its own data (HTML descriptions, time blocks) exactly.
import { PRIORITIES, sortCards, rank } from './core.js';
import { htmlToMarkdown, markdownToHtml } from './markdown.js';

const labelId = (boardId, p) => `${boardId}-priority-${p.value}`;

export function boardToTrello(board, lists, cards, blocks) {
  const labels = PRIORITIES.map((p) => ({
    id: labelId(board.id, p), idBoard: board.id, name: `Priority ${p.value}`, color: p.trello,
  }));
  const sortedLists = [...lists].sort((a, b) => a.order - b.order);
  const trelloCards = [];
  for (const list of sortedLists) {
    sortCards(cards.filter((c) => c.listId === list.id)).forEach((c, i) => {
      const p = PRIORITIES.find((x) => x.value === c.priority);
      const lbls = p ? [labels[p.value - 1]] : [];
      trelloCards.push({
        id: c.id,
        name: c.title,
        desc: htmlToMarkdown(c.desc || ''),
        closed: Boolean(c.archived),
        idBoard: board.id,
        idList: c.listId,
        pos: (i + 1) * 16384,
        idLabels: lbls.map((l) => l.id),
        labels: lbls,
        dateLastActivity: new Date(c.updatedAt || c.createdAt || Date.now()).toISOString(),
      });
    });
  }
  // Cards whose list was deleted (archived along with it).
  const listIds = new Set(lists.map((l) => l.id));
  cards.filter((c) => !listIds.has(c.listId)).forEach((c, i) => trelloCards.push({
    id: c.id, name: c.title, desc: htmlToMarkdown(c.desc || ''), closed: true, idBoard: board.id,
    idList: c.listId, pos: (i + 1) * 16384, idLabels: [], labels: [],
  }));
  return {
    id: board.id,
    name: board.name,
    desc: '',
    closed: false,
    labels,
    lists: sortedLists.map((l, i) => ({ id: l.id, name: l.name, closed: false, idBoard: board.id, pos: (i + 1) * 16384 })),
    cards: trelloCards,
    checklists: [],
    actions: [],
    planner: { version: 1, board, lists, cards, blocks },
  };
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const safeName = (s) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'board';

/** Accepts a single Trello/planner board export or an "all boards" backup. */
export function parseBackup(json) {
  if (json && Array.isArray(json.boards)) return json.boards;
  if (json && Array.isArray(json.lists) && Array.isArray(json.cards)) return [json];
  throw new Error("This file doesn't look like a Trello export or a Planner backup.");
}

/**
 * Turn one parsed board into write operations with fresh IDs,
 * so importing never overwrites existing data.
 */
export function importBoardOps(src, newId, boardOrder) {
  const ops = [];
  const now = Date.now();
  const boardId = newId();
  const idMap = new Map();
  const mapId = (old) => { if (!idMap.has(old)) idMap.set(old, newId()); return idMap.get(old); };

  if (src.planner) {
    const p = src.planner;
    ops.push({ op: 'set', coll: 'boards', id: boardId, data: { name: p.board.name, order: boardOrder, createdAt: now } });
    for (const l of p.lists) ops.push({
      op: 'set', coll: 'lists', id: mapId(l.id),
      data: { boardId, name: l.name, order: l.order, ...(l.color ? { color: l.color } : {}) },
    });
    for (const c of p.cards) {
      const { id, ...rest } = c;
      ops.push({ op: 'set', coll: 'cards', id: mapId(id), data: { ...rest, boardId, listId: mapId(c.listId) } });
    }
    for (const b of p.blocks || []) {
      if (!idMap.has(b.cardId)) continue;
      const { id, ...rest } = b;
      ops.push({ op: 'set', coll: 'blocks', id: newId(), data: { ...rest, cardId: idMap.get(b.cardId), boardId } });
    }
    return { ops, name: p.board.name, cards: p.cards.length };
  }

  // Plain Trello export.
  ops.push({ op: 'set', coll: 'boards', id: boardId, data: { name: src.name || 'Imported board', order: boardOrder, createdAt: now } });
  const labelPriority = new Map();
  for (const l of src.labels || []) {
    const base = String(l.color || '').replace(/_(dark|light)$/, '');
    const p = PRIORITIES.find((x) => x.trello === base);
    if (p) labelPriority.set(l.id, p.value);
  }
  const openLists = (src.lists || []).filter((l) => !l.closed).sort((a, b) => a.pos - b.pos);
  openLists.forEach((l, i) => ops.push({ op: 'set', coll: 'lists', id: mapId(l.id), data: { boardId, name: l.name, order: i } }));
  const openListIds = new Set(openLists.map((l) => l.id));
  const firstList = openLists[0]?.id;

  const checklistsByCard = new Map();
  for (const cl of src.checklists || []) {
    if (!checklistsByCard.has(cl.idCard)) checklistsByCard.set(cl.idCard, []);
    checklistsByCard.get(cl.idCard).push(cl);
  }

  let count = 0;
  for (const c of src.cards || []) {
    const inOpenList = openListIds.has(c.idList);
    if (!inOpenList && !firstList) continue;
    const priority = (c.idLabels || [])
      .map((id) => labelPriority.get(id)).filter(Boolean).sort((a, b) => a - b)[0] || 0;
    let desc = markdownToHtml(c.desc || '');
    for (const cl of (checklistsByCard.get(c.id) || []).sort((a, b) => a.pos - b.pos)) {
      const items = [...(cl.checkItems || [])].sort((a, b) => a.pos - b.pos)
        .map((it) => `<li data-type="taskItem" data-checked="${it.state === 'complete'}"><p>${it.name.replace(/</g, '&lt;')}</p></li>`).join('');
      desc += `<p><strong>${cl.name.replace(/</g, '&lt;')}</strong></p><ul data-type="taskList">${items}</ul>`;
    }
    ops.push({
      op: 'set', coll: 'cards', id: mapId(c.id), data: {
        boardId,
        listId: inOpenList ? mapId(c.idList) : mapId(firstList),
        title: c.name || 'Untitled',
        desc,
        priority,
        order: c.pos ?? count,
        archived: Boolean(c.closed) || !inOpenList,
        createdAt: now,
        updatedAt: now,
      },
    });
    count++;
  }
  return { ops, name: src.name, cards: count };
}


/**
 * Add one parsed board's open lists and cards to an EXISTING board.
 * Lists whose name matches an existing list (case-insensitive) are merged into it;
 * others are appended to the right. Cards go to the bottom of their priority band.
 * Archived cards from the source are skipped.
 */
export function appendBoardOps(src, target, existingLists, existingCards, newId) {
  const { ops } = importBoardOps(src, newId, 0);
  const boardId = target.id;
  const srcBoardId = ops[0].id;
  const nameToId = new Map(existingLists.map((l) => [l.name.trim().toLowerCase(), l.id]));
  let nextOrder = existingLists.length ? Math.max(...existingLists.map((l) => l.order ?? 0)) + 1 : 0;
  const listRemap = new Map();
  const out = [];
  let newLists = 0, mergedLists = 0, cardCount = 0;
  for (const o of ops) {
    if (o.coll === 'lists') {
      const key = (o.data.name || '').trim().toLowerCase();
      if (nameToId.has(key)) { listRemap.set(o.id, nameToId.get(key)); mergedLists++; }
      else {
        listRemap.set(o.id, o.id); nameToId.set(key, o.id);
        out.push({ ...o, data: { ...o.data, boardId, order: nextOrder++ } }); newLists++;
      }
    }
  }
  const maxOrder = new Map();
  for (const c of existingCards) maxOrder.set(c.listId, Math.max(maxOrder.get(c.listId) ?? 0, c.order ?? 0));
  for (const o of ops) {
    if (o.coll !== 'cards' || o.data.archived) continue;
    const listId = listRemap.get(o.data.listId);
    if (!listId) continue;
    const order = (maxOrder.get(listId) ?? 0) + 1;
    maxOrder.set(listId, order);
    out.push({ ...o, data: { ...o.data, boardId, listId, order } });
    cardCount++;
  }
  void srcBoardId;
  return { ops: out, newLists, mergedLists, cards: cardCount };
}
