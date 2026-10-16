# Google Merchant catalogue sync

Updated: 2026-10-16
Status: Feed recovery tested locally against the live catalogue; release and Google re-fetch pending.

## Existing connections (verified in authenticated Merchant Center)

- Account: DigitalHood, 5857752325.
- Online store: `store.digitalhood.info`, verified and claimed.
- DigitalHood Ltd Business Profile is already listed as verified under Business info / Stores. No new Business Manager delegation or account permissions were granted.
- One primary URL source, 10744153634, named PRODUCTS SOURCE 1, English / Zambia / feed label ZM.
- URL: `https://store.digitalhood.info/google-merchant-feed.xml`.
- Active daily scheduled fetch at midnight, Africa/Lusaka. The UI offers daily, weekly or monthly, not hourly. Keep daily active.
- Existing source enables free listings and Shopping ads; no campaign, spend, billing or marketing-method settings changed.

## Failure and recovery

- Latest Google import: connection failed. Live storefront feed returned 503.
- Runtime logs: Merchant feed source returned HTTP 500.
- Reproduced WooCommerce Store API page 4 with 100 products returning a WordPress critical error. The corresponding two 50-product pages succeeded.
- Recovery: 50-product batches, two concurrent requests, only feed-related response fields, stable ID ordering, and one transient network/5xx retry with a short abortable backoff and shared 25-second deadline.
- Authentication, rate-limit and other 4xx responses are not retried or bypassed. Failed snapshots are not partially published. Duplicates, changing pagination totals, missing IDs and incomplete totals are rejected. Last-good-cache / single-flight safeguards remain intact.
- Maintains the original 2,000-product bound (40 pages of 50). Above that, fail closed and migrate to a separately reviewed scalable source / Merchant API; do not silently truncate.
- Live local generation: all 473 source products fetched across 10 successful pages in 20.2 seconds; 471 valid feed entries, 2 excluded because no image. No product records were modified.
- Online marketplace feed is not a physical-store inventory assertion. Do not reuse it as local inventory for other sellers' stock. No local-inventory programme or unsupported Zambia feature was enabled.

## Verification / release

- [x] Existing source, website and profile linkage inspected; no duplicate source added.
- [x] Failure reproduced and live full-catalogue recovery demonstrated.
- [x] Automated checks: 73 tests passed (10 merchant-feed cases), server syntax, TypeScript, production Vite build, SEO/release/network/accessibility/security validations and performance budgets.
- [ ] Commit, push, merge and deploy reviewed source.
- [ ] Public endpoint returns XML with correct product count and central storefront links.
- [ ] Merchant Center fetch succeeds and processes all valid entries.
- [ ] Record release hashes and final Google diagnostics in working state.

## Google-controlled product eligibility

The account overview initially showed 365 approved and 106 not approved, with image promotional-overlay issues reported. Successful feed processing does not mean every item is approved or guaranteed visible. Do not invent identifiers, replace merchant photos, change returns/shipping policies or clear Google policy diagnostics without a separately scoped review.
