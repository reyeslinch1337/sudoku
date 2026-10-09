// Generates the puzzle bank: npm run generate -- [--seed N] [--workers N] [--state DIR] [--out FILE]
// Progress is saved after every batch; rerunning with the same state directory resumes.

import { Worker } from 'node:worker_threads';
import { cpus } from 'node:os';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  BUCKETS,
  type Candidate,
  LINEAGE_CAP,
  MIN_RATING,
  selectBank,
} from '../src/engine/generator';
import { createRng, randInt } from '../src/engine/random';
import { fingerprint } from '../src/engine/transform';
import { parseDigits } from '../src/engine/grid';
import type { Job, JobResult } from './generate-protocol';
import { writeBank } from './bank-io';

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '1' },
    workers: { type: 'string', default: String(cpus().length) },
    state: { type: 'string', default: '.generate-state' },
    out: { type: 'string', default: 'src/data/puzzles.json' },
    attempts: { type: 'string', default: '8' },
  },
});

const SEED = Number(values.seed);
const WORKERS = Math.max(1, Number(values.workers));
const ATTEMPTS = Number(values.attempts);
const BATCH = WORKERS * 4;
const STATE_FILE = join(values.state!, 'state.json');

interface State {
  seed: number;
  batch: number;
  nextLineage: number;
  attempts: number;
  candidates: Candidate[];
}

function loadState(): State {
  if (existsSync(STATE_FILE)) {
    const s = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as State;
    if (s.seed !== SEED) throw new Error(`State was created with seed ${s.seed}, not ${SEED}`);
    return s;
  }
  return { seed: SEED, batch: 0, nextLineage: 0, attempts: 0, candidates: [] };
}

function saveState(s: State): void {
  mkdirSync(values.state!, { recursive: true });
  const tmp = STATE_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(s));
  renameSync(tmp, STATE_FILE);
}

const jobSeed = (batch: number, j: number) =>
  (Math.imul(SEED, 0x9e3779b1) ^
    Math.imul(batch + 1, 0x85ebca6b) ^
    Math.imul(j + 1, 0xc2b2ae35)) >>>
  0;

/**
 * Parent choice: a tournament among candidates close to the lowest bucket that is still short,
 * so the search climbs toward the ratings the bank lacks.
 */
function pickParent(
  rng: () => number,
  s: State,
  lineageSize: Map<number, number>,
  floor: number,
): Candidate | null {
  const open = s.candidates.filter((c) => (lineageSize.get(c.lineage) ?? 0) < LINEAGE_CAP * 3);
  const near = open.filter((c) => c.r >= floor);
  const pool = near.length >= 8 ? near : open;
  if (pool.length < 8) return null;
  let best: Candidate | null = null;
  for (let k = 0; k < 4; k++) {
    const c = pool[randInt(rng, pool.length)];
    if (!best || c.r > best.r) best = c;
  }
  return best;
}

/** Rating from which parents are drawn: half a point below the first bucket that is short. */
function parentFloor(s: State): number {
  const bank = selectBank(s.candidates);
  for (const b of BUCKETS) {
    const n = bank.filter((e) => e.r >= b.min - 1e-9 && e.r <= b.max + 1e-9).length;
    if (n < b.quota) return b.min - 0.5;
  }
  return 0;
}

function planBatch(s: State): { jobs: Job[]; parents: (Candidate | null)[] } {
  const lineageSize = new Map<number, number>();
  for (const c of s.candidates) lineageSize.set(c.lineage, (lineageSize.get(c.lineage) ?? 0) + 1);
  const jobs: Job[] = [];
  const parents: (Candidate | null)[] = [];
  const floor = parentFloor(s);
  for (let j = 0; j < BATCH; j++) {
    const seed = jobSeed(s.batch, j);
    const rng = createRng(seed ^ 0x5bd1e995);
    const parent = rng() < 0.75 ? pickParent(rng, s, lineageSize, floor) : null;
    jobs.push({
      id: j,
      kind: parent ? 'mutate' : 'fresh',
      seed,
      parent: parent?.p,
      attempts: ATTEMPTS,
      minRating: MIN_RATING,
    });
    parents.push(parent);
  }
  return { jobs, parents };
}

function runJobs(workers: Worker[], jobs: Job[]): Promise<JobResult[]> {
  return new Promise((resolve, reject) => {
    const results: JobResult[] = new Array(jobs.length);
    let next = 0;
    let done = 0;
    const feed = (w: Worker) => {
      if (next < jobs.length) w.postMessage(jobs[next++]);
    };
    for (const w of workers) {
      w.removeAllListeners('message');
      w.removeAllListeners('error');
      w.on('message', (r: JobResult) => {
        results[r.id] = r;
        done++;
        if (done === jobs.length) resolve(results);
        else feed(w);
      });
      w.on('error', reject);
      feed(w);
    }
  });
}

function progress(s: State, started: number): string {
  const bank = selectBank(s.candidates);
  const parts = BUCKETS.map((b) => {
    const n = bank.filter((e) => e.r >= b.min - 1e-9 && e.r <= b.max + 1e-9).length;
    return `${b.name} ${n}/${b.quota}`;
  });
  const mins = ((Date.now() - started) / 60000).toFixed(1);
  return `batch ${s.batch}  attempts ${s.attempts}  found ${s.candidates.length}  ${parts.join('  ')}  ${mins} min`;
}

async function main() {
  const state = loadState();
  const seen = new Set(state.candidates.map((c) => fingerprint(parseDigits(c.p))));
  const workers = Array.from(
    { length: WORKERS },
    () => new Worker(new URL('./generate-worker-boot.mjs', import.meta.url)),
  );
  const started = Date.now();
  const total = BUCKETS.reduce((n, b) => n + b.quota, 0);
  console.log(`seed ${SEED}, ${WORKERS} workers, ${BATCH} jobs per batch`);
  try {
    for (;;) {
      const bank = selectBank(state.candidates);
      if (bank.length === total) {
        mkdirSync(dirname(values.out!), { recursive: true });
        writeBank(values.out!, bank);
        console.log(`done: ${bank.length} puzzles written to ${values.out}`);
        break;
      }
      const { jobs, parents } = planBatch(state);
      const results = await runJobs(workers, jobs);
      for (const r of results) {
        state.attempts += jobs[r.id].attempts;
        for (const f of r.found) {
          const fp = fingerprint(parseDigits(f.p));
          if (seen.has(fp)) continue;
          seen.add(fp);
          const parent = parents[r.id];
          const lineage = parent ? parent.lineage : state.nextLineage++;
          state.candidates.push({ ...f, lineage });
        }
      }
      state.batch++;
      saveState(state);
      console.log(progress(state, started));
    }
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
