// A small JavaScript lexer for one line of source, for showing this repo's real code with syntax colours
// (theme.js SYNTAX). Line by line, no state carried across lines (a line inside a multi-line comment or template is
// coloured as code — good enough for a few dozen visible lines).
//   highlight(line) → [{ text, kind }] covering the whole line; kind ∈ keyword string number comment fn ident prop punct space
const KEYWORDS = new Set(('await break case catch class const continue default delete do else export extends false finally for from ' +
  'function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while yield').split(' '));

export function highlight(line) {
  const out = [];
  const push = (text, kind) => { if (!text) return; const last = out.at(-1); if (last && last.kind === kind) last.text += text; else out.push({ text, kind }); };
  let i = 0;
  const n = line.length;
  while (i < n) {
    const c = line[i], rest = line.slice(i);
    if (c === ' ' || c === '\t') { const m = /^[ \t]+/.exec(rest)[0]; push(m, 'space'); i += m.length; continue; }
    if (rest.startsWith('//')) { push(rest, 'comment'); break; }
    if (rest.startsWith('/*')) { const e = rest.indexOf('*/', 2); const m = e < 0 ? rest : rest.slice(0, e + 2); push(m, 'comment'); i += m.length; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < n && line[j] !== c) j += line[j] === '\\' ? 2 : 1;
      const m = line.slice(i, Math.min(n, j + 1));
      push(m, 'string'); i += m.length; continue;
    }
    const num = /^(0x[\da-fA-F]+|\d[\d_]*(\.\d+)?([eE][-+]?\d+)?)/.exec(rest);
    if (num && !/[\w$]/.test(line[i - 1] ?? '')) { push(num[0], 'number'); i += num[0].length; continue; }
    const id = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (id) {
      const w = id[0], after = line.slice(i + w.length).trimStart()[0], before = line.slice(0, i).trimEnd().at(-1);
      // an object key (word:) is a property even when it spells a keyword (from:, default:)
      push(w, after === ':' && line.slice(i + w.length).trimStart()[1] !== ':' && before !== '?' ? 'prop' : KEYWORDS.has(w) ? 'keyword' : after === '(' ? 'fn' : before === '.' ? 'prop' : 'ident');
      i += w.length; continue;
    }
    push(c, 'punct'); i++;
  }
  return out;
}

// draw one line of code at (x, y) in design px, coloured by class; o: text options (font, size, alpha, baseline);
// tone(c) adjusts every colour. Returns the x where the line ends.
export function drawCode(ctx, str, x, y, o, { colors, tone = (c) => c } = {}) {
  for (const seg of highlight(str)) {
    if (seg.kind !== 'space') ctx.text(seg.text, x, y, { ...o, color: tone(colors[seg.kind]) });
    x += ctx.measure(seg.text, o);
  }
  return x;
}
