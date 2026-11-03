// Messages addressed to one device. The text is encrypted with a key derived from the device
// code, so only the device holding that code can read it.

const ITERATIONS = 200_000;
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

export interface MessageEntry {
  id: string;
  /** base64 */
  salt: string;
  /** base64 */
  iv: string;
  /** base64 AES-GCM ciphertext of the UTF-8 text */
  data: string;
  /** Show on every launch instead of once. */
  repeat?: boolean;
}

export interface OwnMessage {
  id: string;
  text: string;
  repeat: boolean;
}

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function newDeviceCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** Uppercase, without dashes or spaces; null when it is not a device code. */
export function normalizeCode(code: string): string | null {
  const c = code.toUpperCase().replace(/[\s-]/g, '');
  return c.length === CODE_LENGTH && [...c].every((ch) => CODE_ALPHABET.includes(ch)) ? c : null;
}

export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

async function deriveKey(code: string, salt: BufferSource): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptMessage(
  code: string,
  id: string,
  text: string,
  repeat: boolean,
): Promise<MessageEntry> {
  const normalized = normalizeCode(code);
  if (!normalized) throw new Error(`Not a device code: ${code}`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(normalized, salt);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text),
  );
  return { id, salt: toB64(salt), iv: toB64(iv), data: toB64(new Uint8Array(data)), repeat };
}

/** The first entry this device can decrypt, or null. Malformed entries are skipped. */
export async function findOwnMessage(entries: unknown, code: string): Promise<OwnMessage | null> {
  const normalized = normalizeCode(code);
  if (!normalized || !Array.isArray(entries)) return null;
  for (const e of entries as MessageEntry[]) {
    try {
      if (typeof e?.id !== 'string') continue;
      const key = await deriveKey(normalized, fromB64(e.salt));
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64(e.iv) },
        key,
        fromB64(e.data),
      );
      const text = new TextDecoder().decode(plain).trim();
      if (text) return { id: e.id, text, repeat: e.repeat === true };
    } catch {
      // Not ours, or not a valid entry.
    }
  }
  return null;
}
