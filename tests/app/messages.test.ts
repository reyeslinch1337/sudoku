import { describe, expect, it } from 'vitest';
import {
  encryptMessage,
  findOwnMessage,
  formatCode,
  newDeviceCode,
  normalizeCode,
} from '../../src/app/messages';
import { INBOX_KEY, REPEAT_AFTER_MS, createInbox } from '../../src/app/inbox';
import type { KeyValueStore } from '../../src/app/storage';

const CODE = 'K7Q2MX4P';
const OTHER = 'ABCD2345';
const TEXT = 'Самой лучшей\nЛегенде';

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('device codes', () => {
  it('are 8 unambiguous characters', () => {
    for (let k = 0; k < 50; k++) {
      const c = newDeviceCode();
      expect(c).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
      expect(normalizeCode(formatCode(c))).toBe(c);
    }
    expect(normalizeCode(' k7q2-mx4p ')).toBe(CODE);
    expect(normalizeCode('K7Q2-MX4O')).toBeNull();
    expect(normalizeCode('SHORT')).toBeNull();
  });
});

describe('message encryption', () => {
  it('is readable only with its code', async () => {
    const e = await encryptMessage('K7Q2-MX4P', 'm1', TEXT, true);
    expect(JSON.stringify(e)).not.toContain('Легенд');
    expect(await findOwnMessage([e], CODE)).toEqual({ id: 'm1', text: TEXT, repeat: true });
    expect(await findOwnMessage([e], OTHER)).toBeNull();
  });

  it('skips malformed entries and finds the own one among others', async () => {
    const mine = await encryptMessage(CODE, 'mine', 'hi', false);
    const theirs = await encryptMessage(OTHER, 'theirs', 'not for you', true);
    const junk = [null, { id: 'x', salt: '!!', iv: '', data: '' }, 'str'];
    expect(await findOwnMessage([...junk, theirs, mine], CODE)).toEqual({
      id: 'mine',
      text: 'hi',
      repeat: false,
    });
    expect(await findOwnMessage('nope', CODE)).toBeNull();
  });
});

describe('inbox', () => {
  async function setup(entries: () => Promise<unknown>, storage = memoryStore()) {
    const shown: string[] = [];
    const inbox = createInbox({
      storage,
      code: CODE,
      fetchEntries: entries,
      show: (t) => (shown.push(t), true),
    });
    return { inbox, shown, storage };
  }

  it('repeating message shows at every launch, and after a long time away', async () => {
    const file = { messages: [await encryptMessage(CODE, 'k', TEXT, true)] };
    const storage = memoryStore();
    const a = await setup(() => Promise.resolve(file), storage);
    await a.inbox.start();
    expect(a.shown).toEqual([TEXT]);
    await a.inbox.resume(60_000);
    expect(a.shown).toHaveLength(1);
    await a.inbox.resume(REPEAT_AFTER_MS);
    expect(a.shown).toHaveLength(2);
    // Next launch, offline: the local copy still shows.
    const b = await setup(() => Promise.reject(new Error('offline')), storage);
    await b.inbox.start();
    expect(b.shown).toEqual([TEXT]);
  });

  it('a one-time message shows once', async () => {
    const file = { messages: [await encryptMessage(CODE, 'o', 'once', false)] };
    const storage = memoryStore();
    const a = await setup(() => Promise.resolve(file), storage);
    await a.inbox.start();
    await a.inbox.resume(REPEAT_AFTER_MS);
    const b = await setup(() => Promise.resolve(file), storage);
    await b.inbox.start();
    expect([...a.shown, ...b.shown]).toEqual(['once']);
  });

  it('a removed message disappears; foreign and broken files show nothing', async () => {
    const storage = memoryStore();
    const file = { messages: [await encryptMessage(CODE, 'k', TEXT, true)] };
    await (await setup(() => Promise.resolve(file), storage)).inbox.start();
    const c = await setup(() => Promise.resolve({ messages: [] }), storage);
    await c.inbox.start();
    expect(storage.getItem(INBOX_KEY)).toBeNull();
    const foreign = { messages: [await encryptMessage(OTHER, 'x', 'no', true)] };
    const d = await setup(() => Promise.resolve(foreign));
    await d.inbox.start();
    const e = await setup(() => Promise.resolve('garbage'));
    await e.inbox.start();
    expect([...d.shown, ...e.shown]).toEqual([]);
  });

  it('a new message arriving on a short return shows', async () => {
    let file: unknown = { messages: [] };
    const a = await setup(() => Promise.resolve(file));
    await a.inbox.start();
    file = { messages: [await encryptMessage(CODE, 'new', 'fresh', true)] };
    await a.inbox.resume(1000);
    expect(a.shown).toEqual(['fresh']);
  });
});
