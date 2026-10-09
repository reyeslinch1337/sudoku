// Worker threads do not inherit the tsx loader; register it before loading the TypeScript worker.
import { register } from 'tsx/esm/api';

register();
await import('./generate-worker.ts');
