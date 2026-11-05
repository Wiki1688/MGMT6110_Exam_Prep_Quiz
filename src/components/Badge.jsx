import React from 'react';
import { priorityBadge } from '../lib/content.js';

/** "Prof Roh · Quiz 2 · Q3" (gold), "Prof Roh · Part B practice" (gold), "Prof Roh · Studio checkpoint" (silver), "Likely". */
export default function PriorityBadge({ q, className = '' }) {
  const b = priorityBadge(q);
  return (
    <span className={`chip pbadge ${b.tone} ${className}`} data-testid="pbadge" data-priority={q.priority} title={b.tone === 'likely' ? 'Likely question, written for this app from the course material' : "From Prof Roh's own material"}>
      {b.tone === 'gold' ? '★ ' : b.tone === 'silver' ? '☆ ' : ''}{b.text}
    </span>
  );
}
