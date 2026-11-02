import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';

// Only embedded raster images are accepted; chain metadata is untrusted.
const AVATAR_RE = /^data:image\/(webp|png|gif|jpeg);base64,[A-Za-z0-9+/=]+$/;
const BATCH = 50;
const cache = new Map<string, string | null>();
let queue: { name: string; resolve: (uri: string | null) => void }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function avatarFromMetadata(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const image = JSON.parse(raw)?.profile?.profile_image;
    return typeof image === 'string' && AVATAR_RE.test(image.trim())
      ? image.trim()
      : null;
  } catch {
    return null;
  }
}

async function flush() {
  timer = null;
  const pending = queue;
  queue = [];
  const names = [...new Set(pending.map((item) => item.name))];
  for (let i = 0; i < names.length; i += BATCH) {
    const chunk = names.slice(i, i + BATCH);
    try {
      const accounts = await HiveTxUtils.getData('condenser_api.get_accounts', [
        chunk,
      ]);
      if (!Array.isArray(accounts)) continue;
      for (const name of chunk) cache.set(name, null);
      for (const account of accounts) {
        cache.set(
          account.name,
          avatarFromMetadata(account.posting_json_metadata),
        );
      }
    } catch {
      // Retry on a later render when the node is available again.
    }
  }
  for (const item of pending) item.resolve(cache.get(item.name) ?? null);
}

export function loadAvatar(name: string): Promise<string | null> {
  if (!name) return Promise.resolve(null);
  if (cache.has(name)) return Promise.resolve(cache.get(name) ?? null);
  return new Promise((resolve) => {
    queue.push({ name, resolve });
    timer ??= setTimeout(flush, 16);
  });
}

export function identicon(name: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash >>>= 0;
  const cells: [number, number][] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if ((hash >>> (row * 3 + col)) & 1) {
        cells.push([col, row]);
        if (col < 2) cells.push([4 - col, row]);
      }
    }
  }
  return { cells, color: ['pink', 'amber', 'mint', 'sky'][(hash >>> 16) % 4] };
}
