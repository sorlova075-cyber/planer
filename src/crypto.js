// Шифрование данных на устройстве перед отправкой в облако (AES-GCM, ключ из пароля через PBKDF2).
// Сервер видит только зашифрованный набор байтов.
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(buf) {
  const a = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
  return btoa(s);
}
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const randomSalt = () => b64(crypto.getRandomValues(new Uint8Array(16)));

export async function deriveKey(password, saltB64) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: unb64(saltB64), iterations: 200000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const raw = b64(await crypto.subtle.exportKey('raw', key));
  return { key, raw };
}

export const importKey = (raw) => crypto.subtle.importKey('raw', unb64(raw), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

export async function encryptJson(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) });
}

export async function decryptJson(key, str) {
  const { iv, ct } = JSON.parse(str);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct));
  return JSON.parse(dec.decode(pt));
}
