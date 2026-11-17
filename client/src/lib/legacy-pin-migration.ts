import type { PinLength } from './pin-types';

export interface LegacyPinRecord {
  version: 1;
  length: PinLength;
  iterations: number;
  salt: string;
  verifier: string;
}

export function legacyPinStorageKey(userId: string): string {
  return `ll_pin_record:${userId}`;
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

async function deriveVerifier(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuffer, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export function readLegacyPinRecord(userId: string): LegacyPinRecord | null {
  const stored = localStorage.getItem(legacyPinStorageKey(userId));
  if (!stored) return null;

  const record = JSON.parse(stored) as Partial<LegacyPinRecord>;
  if (
    record.version !== 1 ||
    (record.length !== 4 && record.length !== 6) ||
    typeof record.iterations !== 'number' ||
    record.iterations < 1 ||
    record.iterations > 1_000_000 ||
    typeof record.salt !== 'string' ||
    typeof record.verifier !== 'string'
  ) {
    throw new Error('The saved PIN information is invalid. Use password recovery to remove it.');
  }

  const salt = fromBase64(record.salt);
  const verifier = fromBase64(record.verifier);
  if (salt.length !== 16 || verifier.length !== 32) {
    throw new Error('The saved PIN information is invalid. Use password recovery to remove it.');
  }
  return record as LegacyPinRecord;
}

export async function matchesLegacyPin(pin: string, record: LegacyPinRecord): Promise<boolean> {
  if (!new RegExp(`^\\d{${record.length}}$`).test(pin)) return false;

  const candidate = await deriveVerifier(pin, fromBase64(record.salt), record.iterations);
  const expected = fromBase64(record.verifier);
  if (candidate.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    difference |= candidate[index] ^ expected[index];
  }
  return difference === 0;
}

export function clearLegacyPinRecord(userId: string): void {
  try {
    localStorage.removeItem(legacyPinStorageKey(userId));
  } catch {
    // The database PIN remains authoritative if local cleanup is unavailable.
  }
}