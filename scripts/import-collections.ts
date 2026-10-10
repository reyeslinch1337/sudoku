// Builds the full bank: level 9 from the generator, levels 10 and 11+ from the tdoku data set.
//
//   npm run import-collections -- --data DIR --bank9 FILE [--seed N] [--out FILE]
//
// DIR is the unpacked data.zip of github.com/t-dillon/tdoku; FILE is the generator output.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { LEVEL_QUOTA } from '../src/engine/generator';
import { normalizeLine, pickFromCollection } from '../src/engine/collections';
import { parseDigits } from '../src/engine/grid';
import { createRng } from '../src/engine/random';
import { fingerprint } from '../src/engine/transform';
import { readBank, writeBank } from './bank-io';

const { values } = parseArgs({
  options: {
    data: { type: 'string' },
    bank9: { type: 'string' },
    seed: { type: 'string', default: '1' },
    out: { type: 'string', default: 'src/data/puzzles.json' },
  },
});
if (!values.data || !values.bank9) {
  console.error('usage: import-collections --data DIR --bank9 FILE [--seed N] [--out FILE]');
  process.exit(1);
}

const readLines = (name: string) =>
  readFileSync(join(values.data!, name), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'));

const level9 = readBank(values.bank9)
  .filter((e) => e.l === undefined || e.l === 9)
  .map((e) => ({ p: e.p, l: 9 as const, r: e.r }))
  .slice(0, LEVEL_QUOTA);
const seen = new Set(level9.map((e) => fingerprint(parseDigits(e.p))));
const rng = createRng(Number(values.seed));

const lines11 = readLines('puzzles5_forum_hardest_1905_11+');
const level11 = pickFromCollection(lines11, { level: 11, quota: LEVEL_QUOTA, rng, seen });
console.log(`level 11+: ${level11.length} of ${lines11.length}`);

const exclude = new Set(lines11.map(normalizeLine).filter((p): p is string => p !== null));
const lines10 = readLines('puzzles4_forum_hardest_1905');
const level10 = pickFromCollection(lines10, {
  level: 10,
  quota: LEVEL_QUOTA,
  rng,
  seen,
  exclude,
});
console.log(`level 10: ${level10.length} of ${lines10.length}`);

writeBank(values.out!, [...level9, ...level10, ...level11]);
console.log(`${level9.length + level10.length + level11.length} puzzles written to ${values.out}`);
