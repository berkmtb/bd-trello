// Converts between the editor's HTML and Trello-style Markdown.
// Checkboxes become "- [ ]" / "- [x]" lines.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- HTML -> Markdown ----------
function inline(node) {
  let out = '';
  for (const n of node.childNodes) {
    if (n.nodeType === 3) { out += n.nodeValue; continue; }
    if (n.nodeType !== 1) continue;
    const tag = n.tagName.toLowerCase();
    const inner = inline(n);
    if (tag === 'strong' || tag === 'b') out += inner ? `**${inner}**` : '';
    else if (tag === 'em' || tag === 'i') out += inner ? `*${inner}*` : '';
    else if (tag === 's' || tag === 'del') out += inner ? `~~${inner}~~` : '';
    else if (tag === 'code') out += `\`${inner}\``;
    else if (tag === 'a') out += `[${inner}](${n.getAttribute('href') || ''})`;
    else if (tag === 'br') out += '\n';
    else if (tag === 'input' || tag === 'label') { /* checkbox chrome */ }
    else out += inner;
  }
  return out;
}

function blocks(node, indent = '') {
  const lines = [];
  for (const n of node.childNodes) {
    if (n.nodeType === 3) { if (n.nodeValue.trim()) lines.push(indent + n.nodeValue.trim()); continue; }
    if (n.nodeType !== 1) continue;
    const tag = n.tagName.toLowerCase();
    if (tag === 'p') { lines.push(indent + inline(n)); if (!indent) lines.push(''); }
    else if (/^h[1-6]$/.test(tag)) { lines.push('#'.repeat(+tag[1]) + ' ' + inline(n), ''); }
    else if (tag === 'ul' || tag === 'ol') {
      const isTask = n.getAttribute('data-type') === 'taskList';
      let i = 1;
      for (const li of n.children) {
        const checked = li.getAttribute('data-checked') === 'true';
        const marker = isTask ? `- [${checked ? 'x' : ' '}] ` : tag === 'ol' ? `${i++}. ` : '- ';
        const content = isTask ? (li.querySelector(':scope > div') || li) : li;
        const childLines = blocks(content, '');
        const [first = '', ...rest] = childLines.filter((l) => l !== '');
        lines.push(indent + marker + first.trim());
        for (const r of rest) lines.push(indent + '  ' + r);
      }
      if (!indent) lines.push('');
    } else if (tag === 'blockquote') {
      for (const l of blocks(n)) if (l) lines.push('> ' + l);
      lines.push('');
    } else if (tag === 'hr') lines.push('---', '');
    else lines.push(...blocks(n, indent));
  }
  return lines;
}

export function htmlToMarkdown(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  return blocks(doc.body.firstChild).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---------- Markdown -> HTML ----------
function md_inline(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(\[( |x|X)\]\s+)?(.*)$/;

export function markdownToHtml(md) {
  if (!md || !md.trim()) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let para = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(md_inline).join('<br>')}</p>`);
    para = [];
  };
  let i = 0;
  // Parse a run of list lines into nested lists.
  function parseList(baseIndent) {
    const html = [];
    let type = null; // 'ul' | 'ol' | 'task'
    const open = (t) => {
      type = t;
      html.push(t === 'task' ? '<ul data-type="taskList">' : `<${t}>`);
    };
    const close = () => { if (type) html.push(type === 'task' ? '</ul>' : `</${type}>`); type = null; };
    while (i < lines.length) {
      const m = lines[i].match(LIST_RE);
      if (!m) break;
      const ind = m[1].replace(/\t/g, '  ').length;
      if (ind < baseIndent) break;
      if (ind > baseIndent) { // nested list belongs to previous item
        const nested = parseList(ind);
        const last = html.pop(); // '</li>'
        html.push(nested, last);
        continue;
      }
      const t = m[3] ? 'task' : /\d/.test(m[2]) ? 'ol' : 'ul';
      if (t !== type) { close(); open(t); }
      const text = md_inline(m[5]);
      if (t === 'task') {
        const checked = m[4].toLowerCase() === 'x';
        html.push(`<li data-type="taskItem" data-checked="${checked}"><p>${text}</p>`, '</li>');
      } else {
        html.push(`<li><p>${text}</p>`, '</li>');
      }
      i++;
    }
    close();
    return html.join('');
  }
  while (i < lines.length) {
    const line = lines[i];
    if (LIST_RE.test(line)) { flushPara(); out.push(parseList(line.match(/^\s*/)[0].length)); continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flushPara(); out.push(`<h${Math.min(h[1].length + 1, 4)}>${md_inline(h[2])}</h${Math.min(h[1].length + 1, 4)}>`); i++; continue; }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { flushPara(); out.push('<hr>'); i++; continue; }
    if (!line.trim()) { flushPara(); i++; continue; }
    para.push(line.replace(/^>\s?/, ''));
    i++;
  }
  flushPara();
  return out.join('');
}
