// Full check of the puzzle bank: npm run verify-bank -- [--file FILE]

import { parseArgs } from 'node:util';
import { verifyEntries, verifyQuotas } from '../src/engine/generator';
import { readBank } from './bank-io';

const { values } = parseArgs({
  options: { file: { type: 'string', default: 'src/data/puzzles.json' } },
});

const bank = readBank(values.file!);
const started = Date.now();
const problems = [
  ...verifyQuotas(bank),
  ...verifyEntries(bank).map((p) => `entry ${p.index} (${bank[p.index].p}): ${p.problem}`),
];
const secs = ((Date.now() - started) / 1000).toFixed(1);
if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`${problems.length} problems in ${bank.length} puzzles (${secs} s)`);
  process.exit(1);
}
console.log(`bank OK: ${bank.length} puzzles (${secs} s)`);
