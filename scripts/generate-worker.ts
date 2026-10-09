import { parentPort } from 'node:worker_threads';
import { createRng } from '../src/engine/random';
import { searchFresh, searchMutations } from '../src/engine/generator';
import type { Job, JobResult } from './generate-protocol';

parentPort!.on('message', (job: Job) => {
  const rng = createRng(job.seed);
  const found =
    job.kind === 'fresh'
      ? searchFresh(rng, job.attempts, job.minRating)
      : searchMutations(rng, job.parent!, job.attempts, job.minRating);
  const result: JobResult = { id: job.id, found };
  parentPort!.postMessage(result);
});
