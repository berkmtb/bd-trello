import { todayKey } from '../lib/core.js';

// Starter content for demo mode only.
export function seedDemo(db) {
  const now = Date.now();
  const id = () => Math.random().toString(36).slice(2, 12);
  const board = id();
  db.boards[board] = { name: 'Work', order: 0, createdAt: now };
  const board2 = id();
  db.boards[board2] = { name: 'Personal', order: 1, createdAt: now };

  const lists = ["Today's Priorities", 'Urgent', 'Inbox', 'Waiting On'].map((name, i) => {
    const lid = id();
    db.lists[lid] = { boardId: board, name, order: i };
    return lid;
  });
  const l2 = id();
  db.lists[l2] = { boardId: board2, name: 'To do', order: 0 };

  const card = (listId, title, priority = 0, desc = '', boardId = board) => {
    const cid = id();
    db.cards[cid] = { boardId, listId, title, desc, priority, order: Object.keys(db.cards).length, archived: false, createdAt: now, updatedAt: now };
    return cid;
  };
  const tips = card(lists[0], 'Start here: how this board works', 1,
    '<p>Hover over any card and press:</p><ul><li><p><strong>Option+1 / 2 / 3</strong> → red / orange / yellow priority (press again to clear)</p></li><li><p><strong>Option+0</strong> → remove priority</p></li><li><p><strong>Option+E</strong> or <strong>C</strong> → archive</p></li></ul><p>Lists sort red → orange → yellow → none. Drag cards to reorder within a color, to another list, or onto the calendar.</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Read this card</p></li><li data-type="taskItem" data-checked="false"><p>Drag a card onto the calendar</p></li><li data-type="taskItem" data-checked="false"><p>Try Option+2 on a card</p></li></ul>');
  card(lists[0], 'Monthly report', 1);
  card(lists[0], 'Send vendor payments', 0);
  card(lists[0], 'Review budget draft', 2, '<ul><li><p>Check contingency line</p></li><li><p>Compare to last quarter</p></li></ul>');
  card(lists[0], 'Update SOPs', 0);
  card(lists[1], 'Title company follow-ups', 1);
  card(lists[1], 'Get subordination agreements signed', 2);
  card(lists[1], 'Expense report', 3);
  card(lists[1], 'Pay invoice', 0);
  card(lists[2], 'Draft contract; incorporate paid to date', 0);
  card(lists[3], 'Letter of credit from bank', 3);
  card(l2, 'Battery-powered doorbell', 0, '', board2);

  const b = id();
  db.blocks[b] = { cardId: tips, boardId: board, title: 'Start here: how this board works', date: todayKey(), start: 9 * 60, duration: 30, createdAt: now };
}
