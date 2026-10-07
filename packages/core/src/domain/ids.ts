let counter = 0;

const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomChunk(length: number): string {
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  const bytes = new Uint8Array(length);
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[(bytes[i] ?? 0) % alphabet.length];
  return out;
}

/** Short, URL-safe, collision-resistant id with a readable prefix. */
export function newId(prefix: string): string {
  counter = (counter + 1) % 1296;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(2, "0")}${randomChunk(6)}`;
}
