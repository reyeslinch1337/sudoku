// Manages messages addressed to one device in public/messages.json.
//
//   npm run message -- add --id ID --code XXXX-XXXX --text "text" [--once]
//   npm run message -- remove --id ID
//
// Use \n inside the text for a line break. Publish the change through a PR as usual.

import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { type MessageEntry, encryptMessage, findOwnMessage } from '../src/app/messages';

const FILE = 'public/messages.json';
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    id: { type: 'string' },
    code: { type: 'string' },
    text: { type: 'string' },
    once: { type: 'boolean', default: false },
  },
});
const [command] = positionals;
const file = JSON.parse(readFileSync(FILE, 'utf8')) as { messages: MessageEntry[] };
const usage = () => {
  console.error('usage: message add --id ID --code CODE --text TEXT [--once] | remove --id ID');
  process.exit(1);
};
if (!values.id) usage();
const rest = file.messages.filter((m) => m.id !== values.id);

if (command === 'add') {
  if (!values.code || !values.text) usage();
  const text = values.text!.replace(/\\n/g, '\n').trim();
  const entry = await encryptMessage(values.code!, values.id!, text, !values.once);
  // Check the round trip before writing.
  const back = await findOwnMessage([entry], values.code!);
  if (back?.text !== text) throw new Error('round trip failed');
  file.messages = [...rest, entry];
  console.log(`added ${values.id} (${values.once ? 'once' : 'every launch'})`);
} else if (command === 'remove') {
  if (rest.length === file.messages.length) console.log(`no message ${values.id}`);
  file.messages = rest;
} else usage();

writeFileSync(FILE, JSON.stringify(file, null, 2) + '\n');
