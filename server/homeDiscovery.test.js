import assert from 'node:assert/strict';
import test from 'node:test';

import { createHomeDiscoveryService } from './homeDiscovery.js';

function payload(label = 'product') {
  const product = { id: 1, name: label };
  return {
    shelves: {
      hero: [product],
      newArrivals: [product],
      personalized: [],
      deals: [product],
      bestSellers: [product],
      trending: [product],
      flashSales: [],
    },
    personalization: { active: false, interestCount: 0 },
  };
}

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  });
}

test('serves a compact six-item homepage request and reuses its fresh snapshot', async () => {
  let calls = 0;
  let requestedUrl = '';
  const service = createHomeDiscoveryService({
    apiBase: 'https://payments.example',
    fetchImpl: async (url) => {
      calls += 1;
      requestedUrl = url;
      return jsonResponse(payload());
    },
  });

  const first = await service.get(12);
  const second = await service.get(6);

  assert.equal(calls, 1);
  assert.match(requestedUrl, /\/api\/discovery\/home\?limit=6$/);
  assert.equal(first.cacheStatus, 'MISS');
  assert.equal(second.cacheStatus, 'HIT');
});

test('deduplicates concurrent cold homepage requests', async () => {
  let calls = 0;
  let release;
  const wait = new Promise((resolve) => { release = resolve; });
  const service = createHomeDiscoveryService({
    apiBase: 'https://payments.example',
    fetchImpl: async () => {
      calls += 1;
      await wait;
      return jsonResponse(payload());
    },
  });

  const first = service.get(6);
  const second = service.get(6);
  release();
  await Promise.all([first, second]);

  assert.equal(calls, 1);
});

test('uses a bounded stale homepage snapshot when refresh fails', async () => {
  let time = 1_000;
  let fail = false;
  const service = createHomeDiscoveryService({
    apiBase: 'https://payments.example',
    now: () => time,
    freshMs: 100,
    staleMs: 1_000,
    fetchImpl: async () => {
      if (fail) throw new Error('offline');
      return jsonResponse(payload('saved'));
    },
  });

  await service.get(6);
  time += 200;
  fail = true;
  const result = await service.get(6);

  assert.equal(result.cacheStatus, 'STALE');
  assert.equal(result.payload.shelves.hero[0].name, 'saved');
});

test('rejects malformed and oversized homepage responses', async () => {
  const malformed = createHomeDiscoveryService({
    apiBase: 'https://payments.example',
    fetchImpl: async () => jsonResponse({ shelves: {} }),
  });
  const oversized = createHomeDiscoveryService({
    apiBase: 'https://payments.example',
    maxBytes: 20,
    fetchImpl: async () => jsonResponse(payload()),
  });

  await assert.rejects(malformed.get(6), /shelf/);
  await assert.rejects(oversized.get(6), /too large/);
});
