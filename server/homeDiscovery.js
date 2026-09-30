const DEFAULT_FRESH_MS = 60_000;
const DEFAULT_STALE_MS = 10 * 60_000;
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 512 * 1024;
const SHELF_NAMES = [
  'hero',
  'newArrivals',
  'personalized',
  'deals',
  'bestSellers',
  'trending',
  'flashSales',
];

function failure(message, status = 503) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeLimit(value) {
  return Number(value) <= 4 ? 4 : 6;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || !payload.shelves || typeof payload.shelves !== 'object') {
    throw failure('Homepage catalogue response was incomplete.');
  }

  for (const shelf of SHELF_NAMES) {
    if (!Array.isArray(payload.shelves[shelf])) {
      throw failure(`Homepage catalogue shelf ${shelf} was incomplete.`);
    }
  }

  return payload;
}

export function createHomeDiscoveryService({
  apiBase,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  freshMs = DEFAULT_FRESH_MS,
  staleMs = DEFAULT_STALE_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_BYTES,
} = {}) {
  const base = String(apiBase || '').replace(/\/+$/, '');
  const snapshots = new Map();
  const pending = new Map();

  async function refresh(limit, previous) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(
        `${base}/api/discovery/home?limit=${limit}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw failure('Homepage catalogue is temporarily unavailable.', response.status);
      }

      const declaredBytes = Number(response.headers.get('content-length') || 0);
      if (declaredBytes > maxBytes) {
        throw failure('Homepage catalogue response was too large.');
      }

      const body = await response.arrayBuffer();
      if (body.byteLength > maxBytes) {
        throw failure('Homepage catalogue response was too large.');
      }

      let payload;
      try {
        payload = JSON.parse(new TextDecoder().decode(body));
      } catch {
        throw failure('Homepage catalogue response was invalid.');
      }

      const entry = {
        payload: validatePayload(payload),
        at: now(),
      };
      snapshots.set(limit, entry);

      return {
        ...entry,
        cacheStatus: previous ? 'REFRESH' : 'MISS',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function get(limitValue = 6) {
    const limit = normalizeLimit(limitValue);
    const saved = snapshots.get(limit);

    if (saved && now() - saved.at <= freshMs) {
      return { ...saved, cacheStatus: 'HIT' };
    }

    if (!pending.has(limit)) {
      const request = refresh(limit, saved).finally(() => {
        if (pending.get(limit) === request) pending.delete(limit);
      });
      pending.set(limit, request);
    }

    try {
      return await pending.get(limit);
    } catch (error) {
      if (saved && now() - saved.at <= staleMs) {
        return { ...saved, cacheStatus: 'STALE' };
      }
      throw error;
    }
  }

  return { get };
}
