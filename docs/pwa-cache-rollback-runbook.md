# PWA cache and rollback runbook

The executable classification is `public/network-cache-policy.js`. Only the versioned application shell, immutable build assets and explicitly public catalogue/status GET responses can be cached. Account, authentication, seller, admin, chat, checkout, payment, order and tracking paths are network-only. Mutations are never intercepted by the service worker.

Each release retains the current public cache and exactly one previous public cache version. To roll back, redeploy the prior storefront revision and verify its service worker becomes active; do not manually restore private data because none belongs in these caches. A new release must increment the policy version, keep the immediately previous version in `retainedVersions`, pass `npm run validate:network`, and remain within the checked performance budgets.

Acceptance covers offline shell fallback, stale public catalogue reads, network-only sensitive failures, reconnect, no duplicate mutations, cache-size bounds and cache-control rejection. Physical device and carrier testing is recorded separately using the owner acceptance worksheet.
