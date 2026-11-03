// Prints a link that opens the game with a greeting: npm run greeting-link -- "text" [--base URL]
// Use \n inside the text for a line break.

import { parseArgs } from 'node:util';
import { GREETING_MAX, GREETING_PARAM, encodeGreeting } from '../src/app/greeting';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { base: { type: 'string', default: 'https://reyeslinch1337.github.io/sudoku/' } },
});
const text = positionals.join(' ').replace(/\\n/g, '\n').trim();
if (!text) {
  console.error('usage: greeting-link "text" [--base URL]');
  process.exit(1);
}
if (text.length > GREETING_MAX) console.error(`note: text cut to ${GREETING_MAX} characters`);
const url = new URL(values.base!);
url.searchParams.set(GREETING_PARAM, encodeGreeting(text));
console.log(url.toString());
