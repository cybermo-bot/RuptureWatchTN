// Reads data/SOURCES.md for the methods page: one entry per "## " heading, with its first link.
// The French name, use and licence of each source are in messages (core.method.sources.<slug>);
// tests/sources.test.ts checks that every heading has them, so the page cannot drift from the file.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SourceEntry {
  slug: string;
  heading: string;
  url: string | null;
}

/** "CNAM: medicines…" → "cnam"; "ISO 3166-2:TN governorate codes" → "iso". */
export function sourceSlug(heading: string): string {
  return heading.split(/[\s:]/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseSources(markdown: string): SourceEntry[] {
  const entries: SourceEntry[] = [];
  for (const block of markdown.split(/^## /m).slice(1)) {
    const [headingLine, ...rest] = block.split('\n');
    const heading = headingLine.trim();
    const body = rest.join('\n');
    // The page a reader should open: "Page", then "API record", then the first link.
    const pick = (label: string) => body.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(https?://\\S+)`))?.[1] ?? null;
    const url = pick('Page') ?? pick('API record') ?? body.match(/https?:\/\/[^\s)]+/)?.[0] ?? null;
    entries.push({ slug: sourceSlug(heading), heading, url: url?.replace(/[.,;]$/, '') ?? null });
  }
  return entries;
}

export function readSources(root: string = process.cwd()): SourceEntry[] {
  return parseSources(readFileSync(join(root, 'data', 'SOURCES.md'), 'utf8'));
}
