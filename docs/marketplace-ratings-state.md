# Marketplace ratings and sales state

Last updated: 2026-10-02

## Goal

Make verified product ratings, seller/store ratings, product sold counts, and store sold totals consistent and current on every public marketplace surface, while keeping the homepage fast.

## Live diagnosis

- [x] Product `27769` proves the mismatch: the WooCommerce catalogue reports `0` ratings while verified feedback reports `4.0` from one published rating.
- [x] Seller `seller-14decc6f07f94b61` proves the store mismatch: the directory reports `0` sold and no rating, while the store detail reports `8` sold and verified seller feedback reports `5.0` from one rating.
- [x] The product page already replaces stale catalogue ratings with verified-feedback data; list and store surfaces do not.
- [x] Five-minute directory caches can keep otherwise-correct store totals stale.

## Delivery checklist

- [x] Add one cached server-side verified-rating state shared by product search, discovery, product lists, wishlists, recently viewed, seller stores, and the shops directory.
- [x] Preserve WooCommerce sold counts as the authoritative commerce totals and refresh search, homepage, store, and directory cards from live Woo product metrics.
- [x] Render rating counts and sold counts consistently on homepage product cards and recently viewed cards.
- [x] Refresh public seller/store aggregates after a one-minute freshness window and invalidate them immediately when feedback changes.
- [x] Add regression tests for product and seller aggregate precedence, zero-rating fallback, sold totals, batching, failure fallback, and response contracts.
- [x] Run focused tests, full backend checks, the complete storefront production build, and performance budgets.
- [ ] Commit and push both backend and storefront branches.
- [ ] Open, verify, and merge both pull requests.

## Implemented state flow

- Verified product feedback overrides stale catalogue ratings in a single batched query.
- Search and homepage results refresh sold totals from WooCommerce once per unique product batch, cached for 30 seconds.
- Homepage shelves share one final enrichment pass, avoiding repeated rating or sales lookups per shelf.
- Seller and official-store cards combine live WooCommerce sales with verified seller feedback.
- Product, discovery, seller, wishlist, and recently viewed routes fail open to their existing catalogue values if a live state source is temporarily unavailable.
- Feedback submissions and moderation clear affected rating and public-page caches immediately.

## Release state

- Payments API branch: `fix/live-marketplace-ratings`
- Storefront branch: `fix/live-marketplace-ratings`
- Deployment: not started by this task
