import type { Found } from '../src/engine/generator';

export interface Job {
  id: number;
  kind: 'fresh' | 'mutate';
  seed: number;
  parent?: string;
  attempts: number;
  minRating: number;
}

export interface JobResult {
  id: number;
  found: Found[];
}
