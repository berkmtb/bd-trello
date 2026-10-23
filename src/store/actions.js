import { rank, sortCards, orderBetween } from '../lib/core.js';

/** All writes go through here. `be` is the Firestore or demo backend. */
export function createActions(be) {
  const commit = (ops) => be.commit(ops).catch((e) => {
    console.error(e);
    alert('Could not save: ' + e.message);
  });
  const set = (coll, id, data) => ({ op: 'set', coll, id, data });
  const upd = (coll, id, data) => ({ op: 'update', coll, id, data });
  const del = (coll, id) => ({ op: 'delete', coll, id });

  const fetchOnce = (coll, filters) => new Promise((resolve) => {
    let unsub = null;
    let done = false;
    unsub = be.subscribe(coll, filters, (rows) => {
      if (done) return;
      done = true;
      resolve(rows);
      setTimeout(() => unsub && unsub(), 0);
    });
  });

  const bandCards = (cards, listId, priority, excludeId) =>
    sortCards(cards.filter((c) => c.listId === listId && !c.archived && c.id !== excludeId && rank(c.priority) === rank(priority)));

  /** Order that puts a card at `index` within its priority band in a list. */
  function orderAt(cards, listId, priority, index, excludeId) {
    const band = bandCards(cards, listId, priority, excludeId);
    const i = Math.max(0, Math.min(index, band.length));
    return orderBetween(band[i - 1]?.order ?? null, band[i]?.order ?? null);
  }
  const bottomOf = (cards, listId, priority, excludeId) => {
    const band = bandCards(cards, listId, priority, excludeId);
    return band.length ? band[band.length - 1].order + 1 : 0;
  };
  const topOf = (cards, listId, priority, excludeId) => {
    const band = bandCards(cards, listId, priority, excludeId);
    return band.length ? band[0].order - 1 : 0;
  };

  return {
    newId: be.newId,
    fetchOnce,

    // ---------- boards ----------
    createBoard(name, boards) {
      const id = be.newId();
      const order = boards.length ? Math.max(...boards.map((b) => b.order ?? 0)) + 1 : 0;
      commit([set('boards', id, { name, order, createdAt: Date.now() })]);
      return id;
    },
    renameBoard: (id, name) => commit([upd('boards', id, { name })]),
    async deleteBoard(boardId) {
      const [lists, cards, blocks] = await Promise.all([
        fetchOnce('lists', [['boardId', '==', boardId]]),
        fetchOnce('cards', [['boardId', '==', boardId]]),
        fetchOnce('blocks', [['boardId', '==', boardId]]),
      ]);
      await commit([
        ...blocks.map((b) => del('blocks', b.id)),
        ...cards.map((c) => del('cards', c.id)),
        ...lists.map((l) => del('lists', l.id)),
        del('boards', boardId),
      ]);
    },

    // ---------- lists ----------
    createList(boardId, name, lists) {
      const mine = lists.filter((l) => l.boardId === boardId);
      const order = mine.length ? Math.max(...mine.map((l) => l.order)) + 1 : 0;
      commit([set('lists', be.newId(), { boardId, name, order })]);
    },
    renameList: (id, name) => commit([upd('lists', id, { name })]),
    /** color = hex string, or null to go back to the default blue. */
    setListColor: (id, color) => commit([upd('lists', id, { color: color || null })]),
    moveList(list, dir, lists) {
      const mine = lists.filter((l) => l.boardId === list.boardId).sort((a, b) => a.order - b.order);
      const i = mine.findIndex((l) => l.id === list.id);
      const j = i + dir;
      if (j < 0 || j >= mine.length) return;
      commit([upd('lists', list.id, { order: mine[j].order }), upd('lists', mine[j].id, { order: list.order })]);
    },
    deleteList(list, cards) {
      const now = Date.now();
      const mine = cards.filter((c) => c.listId === list.id && !c.archived);
      commit([
        ...mine.map((c) => upd('cards', c.id, { archived: true, archivedAt: now, updatedAt: now })),
        del('lists', list.id),
      ]);
    },

    // ---------- cards ----------
    createCard(boardId, listId, title, cards) {
      const id = be.newId();
      const now = Date.now();
      commit([set('cards', id, {
        boardId, listId, title, desc: '', priority: 0,
        order: bottomOf(cards, listId, 0), archived: false, createdAt: now, updatedAt: now,
      })]);
      return id;
    },
    updateCard: (id, patch) => commit([upd('cards', id, { ...patch, updatedAt: Date.now() })]),

    /** Same priority again toggles it off. New band → top of that band. */
    setPriority(card, p, cards) {
      const next = card.priority === p ? 0 : p;
      if (next === (card.priority || 0)) return;
      commit([upd('cards', card.id, {
        priority: next, order: topOf(cards, card.listId, next, card.id), updatedAt: Date.now(),
      })]);
      return next;
    },

    /** Place a card in a list at an index within its own priority band. */
    placeCard(card, toListId, bandIndex, cards, toBoardId) {
      const order = orderAt(cards, toListId, card.priority, bandIndex, card.id);
      const patch = { listId: toListId, order, updatedAt: Date.now() };
      const ops = [];
      if (toBoardId && toBoardId !== card.boardId) {
        patch.boardId = toBoardId;
      }
      ops.push(upd('cards', card.id, patch));
      // Re-space the band if fractional orders get too close together.
      const band = bandCards(cards, toListId, card.priority, card.id);
      const i = Math.max(0, Math.min(bandIndex, band.length));
      const prev = band[i - 1]?.order, next = band[i]?.order;
      if (prev != null && next != null && next - prev < 1e-9) {
        const all = [...band.slice(0, i), { id: card.id }, ...band.slice(i)];
        all.forEach((c, k) => {
          if (c.id === card.id) patch.order = k;
          else ops.push(upd('cards', c.id, { order: k }));
        });
      }
      commit(ops);
    },
    /** Move to the bottom of the card's band in another list or board. */
    moveCardTo(card, toBoardId, toListId, cards) {
      const patch = { listId: toListId, boardId: toBoardId, order: bottomOf(cards, toListId, card.priority, card.id), updatedAt: Date.now() };
      commit([upd('cards', card.id, patch)]);
    },
    archiveCard: (id) => commit([upd('cards', id, { archived: true, archivedAt: Date.now(), updatedAt: Date.now() })]),
    restoreCard(card, lists, cards) {
      const boardLists = lists.filter((l) => l.boardId === card.boardId).sort((a, b) => a.order - b.order);
      const listId = boardLists.some((l) => l.id === card.listId) ? card.listId : boardLists[0]?.id;
      if (!listId) { alert('Add a list to this board first, then restore the card.'); return; }
      commit([upd('cards', card.id, {
        archived: false, archivedAt: null, listId, order: topOf(cards, listId, card.priority, card.id), updatedAt: Date.now(),
      })]);
    },
    async deleteCard(cardId) {
      const blocks = await fetchOnce('blocks', [['cardId', '==', cardId]]);
      await commit([...blocks.map((b) => del('blocks', b.id)), del('cards', cardId)]);
    },

    // ---------- calendar blocks ----------
    createBlock(card, date, start, duration) {
      commit([set('blocks', be.newId(), {
        cardId: card.id, boardId: card.boardId, title: card.title, date, start, duration, createdAt: Date.now(),
      })]);
    },
    updateBlock: (id, patch) => commit([upd('blocks', id, patch)]),
    deleteBlock: (id) => commit([del('blocks', id)]),

    // ---------- backgrounds ----------
    // key is a board id, or 'default' for all boards without their own.
    setBackground(key, data, alsoClearBoardId) {
      const ops = [set('backgrounds', key, { key, data, updatedAt: Date.now() })];
      if (alsoClearBoardId) ops.push(del('backgrounds', alsoClearBoardId));
      return commit(ops);
    },
    removeBackground: (key) => commit([del('backgrounds', key)]),

    commitRaw: commit,
  };
}
