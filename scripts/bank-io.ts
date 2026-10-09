import { readFileSync, writeFileSync } from 'node:fs';
import type { BankEntry } from '../src/engine/generator';

/** One entry per line, sorted by rating, so diffs stay readable. */
export function writeBank(file: string, entries: BankEntry[]): void {
  const sorted = [...entries].sort((a, b) => a.r - b.r || a.p.localeCompare(b.p));
  writeFileSync(file, '[\n' + sorted.map((e) => JSON.stringify(e)).join(',\n') + '\n]\n');
}

export const readBank = (file: string): BankEntry[] =>
  JSON.parse(readFileSync(file, 'utf8')) as BankEntry[];
