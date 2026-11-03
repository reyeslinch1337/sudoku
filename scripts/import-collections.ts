// Builds the bank: level 9 from the generator, levels 10 and 11+ from the tdoku data set.
//
//   npm run import-collections -- --data DIR --bank9 FILE [--seed N] [--out FILE]
//   npm run import-collections -- --data DIR --bank9 FILE --base FILE --add N [--seed N]
//
// DIR is the unpacked data.zip of github.com/t-dillon/tdoku; --bank9 is the generator output.
// With --base the existing bank is kept as it is and N new puzzles are added to every level.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { LEVEL_QUOTA, pickSpread } from '../src/engine/generator';
import { normalizeLine, pickFromCollection } from '../src/engine/collections';
import { parseDigits } from '../src/engine/grid';
import { createRng } from '../src/engine/random';
import { fingerprint } from '../src/engine/transform';
import { readBank, writeBank } from './bank-io';

const { values } = parseArgs({
  options: {
    data: { type: 'string' },
    bank9: { type: 'string' },
    base: { type: 'string' },
    add: { type: 'string' },
    seed: { type: 'string', default: '1' },
    out: { type: 'string', default: 'src/data/puzzles.json' },
  },
});
if (!values.data || !values.bank9 || (values.base && !values.add)) {
  console.error(
    'usage: import-collections --data DIR --bank9 FILE [--base FILE --add N] [--seed N] [--out FILE]',
  );
  process.exit(1);
}

const readLines = (name: string) =>
  readFileSync(join(values.data!, name), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'));

const base = values.base ? readBank(values.base) : [];
const count = values.add ? Number(values.add) : LEVEL_QUOTA;
const seen = new Set(base.map((e) => fingerprint(parseDigits(e.p))));
const rng = createRng(Number(values.seed));

const rated = readBank(values.bank9)
  .filter((e) => (e.l === undefined || e.l === 9) && e.r !== undefined)
  .map((e) => ({ p: e.p, r: e.r! }));
const level9 = pickSpread(rated, count, seen);
console.log(`level 9: ${level9.length} new`);

const lines11 = readLines('puzzles5_forum_hardest_1905_11+');
const level11 = pickFromCollection(lines11, { level: 11, quota: count, rng, seen });
console.log(`level 11+: ${level11.length} new of ${lines11.length}`);

const exclude = new Set(lines11.map(normalizeLine).filter((p): p is string => p !== null));
const lines10 = readLines('puzzles4_forum_hardest_1905');
const level10 = pickFromCollection(lines10, { level: 10, quota: count, rng, seen, exclude });
console.log(`level 10: ${level10.length} new of ${lines10.length}`);

const all = [...base, ...level9, ...level10, ...level11];
writeBank(values.out!, all);
console.log(`${all.length} puzzles (${base.length} kept) written to ${values.out}`);
