// Greeting text carried in the page address (?g=...), so the text itself is never stored in
// the code. The parameter is base64url of the UTF-8 text.

export const GREETING_PARAM = 'g';
export const GREETING_MAX = 500;

export function encodeGreeting(text: string): string {
  const bytes = new TextEncoder().encode(text.slice(0, GREETING_MAX));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The greeting text, or null when the parameter is missing, empty or malformed. */
export function decodeGreeting(param: string | null | undefined): string | null {
  if (!param || !/^[A-Za-z0-9_-]+$/.test(param)) return null;
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim();
    return text ? text.slice(0, GREETING_MAX) : null;
  } catch {
    return null;
  }
}

/** Reads the greeting from a URL and returns the URL without the parameter. */
export function takeGreeting(href: string): { text: string | null; cleanUrl: string } {
  const url = new URL(href);
  const text = decodeGreeting(url.searchParams.get(GREETING_PARAM));
  url.searchParams.delete(GREETING_PARAM);
  return { text, cleanUrl: url.pathname + url.search + url.hash };
}
