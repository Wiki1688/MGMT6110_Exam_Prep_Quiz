import React from 'react';

/** Splits text into paragraphs and simple pipe tables:
 *  | a | b |
 *  |---|---|
 *  | 1 | 2 |
 *  Returns [{ kind: 'p', text } | { kind: 'table', head: [], rows: [[]] }]. */
export function parseCase(text) {
  const lines = String(text || '').split(/\r?\n/);
  const blocks = [];
  let para = [];
  let table = null;
  const flushPara = () => { if (para.length) { blocks.push({ kind: 'p', text: para.join('\n') }); para = []; } };
  const flushTable = () => {
    if (!table) return;
    const rows = table.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c.trim()) || c.trim() === ''));
    const hasSep = table.some((r) => r.length && r.every((c) => /^:?-{2,}:?$/.test(c.trim())));
    if (rows.length) blocks.push({ kind: 'table', head: hasSep ? rows[0] : null, rows: hasSep ? rows.slice(1) : rows });
    table = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (/^\|.*\|$/.test(line)) {
      flushPara();
      const cells = line.slice(1, -1).split('|').map((c) => c.trim());
      (table = table || []).push(cells);
      continue;
    }
    flushTable();
    if (!line) { flushPara(); continue; }
    para.push(raw);
  }
  flushPara();
  flushTable();
  return blocks;
}

/** Case / stem text: keeps line breaks, renders pipe tables as real tables (scrolls sideways inside its box on a narrow screen). */
export default function CaseText({ text, className = 'stem' }) {
  const blocks = parseCase(text);
  return (
    <div className={className + ' case-text'}>
      {blocks.map((b, i) => b.kind === 'p' ? (
        <p key={i} className="case-p">{b.text}</p>
      ) : (
        <div key={i} className="case-table-wrap">
          <table className="case-table">
            {b.head && <thead><tr>{b.head.map((c, j) => <th key={j}>{c}</th>)}</tr></thead>}
            <tbody>{b.rows.map((r, k) => <tr key={k}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>)}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
