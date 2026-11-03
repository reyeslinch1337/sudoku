// Delivery of the device's own message: shown at launch and, for repeating messages, again when
// the app comes back after a long time in the background. A local copy keeps it working offline.

import { type MessageEntry, type OwnMessage, findOwnMessage } from './messages';
import type { KeyValueStore } from './storage';

export const INBOX_KEY = 'xsudoku.v1.inbox';
/** A repeating message shows again after the app was hidden at least this long. */
export const REPEAT_AFTER_MS = 30 * 60 * 1000;

interface Stored extends OwnMessage {
  shown: boolean;
}

export interface InboxDeps {
  storage: KeyValueStore;
  code: string;
  /** Message entries from the site; rejects when offline. */
  fetchEntries: () => Promise<MessageEntry[] | unknown>;
  /** Shows the text; returns false when it could not be shown now. */
  show: (text: string) => boolean;
}

export function createInbox(d: InboxDeps) {
  let local: Stored | null = load();
  let shownThisRound = false;

  function load(): Stored | null {
    try {
      const x = JSON.parse(d.storage.getItem(INBOX_KEY) ?? 'null') as Stored | null;
      return x && typeof x.id === 'string' && typeof x.text === 'string' ? x : null;
    } catch {
      return null;
    }
  }

  function save() {
    try {
      if (local) d.storage.setItem(INBOX_KEY, JSON.stringify(local));
      else d.storage.removeItem(INBOX_KEY);
    } catch {
      // Storage unavailable: the message still shows this session.
    }
  }

  function display() {
    if (!local || shownThisRound) return;
    if (!d.show(local.text)) return;
    shownThisRound = true;
    local = { ...local, shown: true };
    save();
  }

  const due = () => !!local && (local.repeat || !local.shown);

  async function refresh() {
    let entries: unknown;
    try {
      entries = await d.fetchEntries();
    } catch {
      return; // Offline: keep the local copy.
    }
    const own = await findOwnMessage(
      (entries as { messages?: unknown })?.messages ?? entries,
      d.code,
    );
    if (!own) {
      local = null;
      save();
      return;
    }
    const isNew = !local || local.id !== own.id || local.text !== own.text;
    local = { ...own, shown: isNew ? false : local!.shown };
    save();
    if (due()) display();
  }

  return {
    /** At launch: show the local copy if due, then look for news. */
    async start() {
      shownThisRound = false;
      if (due()) display();
      await refresh();
    },
    /** When the app becomes visible again after being hidden for hiddenMs. */
    async resume(hiddenMs: number) {
      shownThisRound = false;
      if (local?.repeat && hiddenMs >= REPEAT_AFTER_MS) display();
      else shownThisRound = true; // Only new messages may show on a short return.
      const before = local?.id;
      await refresh();
      if (local && local.id !== before) {
        shownThisRound = false;
        display();
      }
    },
  };
}
