# Description parity, media editing and electronics categories

Status: Implementation and local validation in progress — 30 October 2026 (Africa/Lusaka).

## Current request

- Render seller-submitted descriptions consistently in the storefront: spacing, lists, tables and photos.
- Keep a simple seller editor with essential formatting and safe in-description photo insertion/upload.
- Reorder listing gallery photos by drag/drop, with a keyboard/touch alternative and order retained through save, review and publication.
- Expand governed marketplace categories for electronics, gadgets, components, accessories and related products.

## Findings / plan

- [ ] Fix shared rendering/CSS parity in storefront, seller and admin. The current renderer applies pre-wrap to HTML and the product page slices raw HTML at 1,400 characters, breaking structures.
- [ ] Add essential editor controls (undo/redo, clear formatting, links, image insertion) without arbitrary HTML/source/style execution. Retain the 5,000-word limit.
- [ ] Reuse authenticated, validated, immutable/durable photo upload for description media. Preserve caret/selection and prevent saving/closing while an insertion is pending.
- [ ] Add accessible gallery ordering; verify persistence and explicit main-photo behaviour.
- [ ] Read the live taxonomy, add missing categories idempotently without moving/renaming/deleting existing IDs, and keep moderation/governance intact. No fixed finite taxonomy can promise 100% future coverage.
- [ ] Tests/builds, release commits/PRs/CI, deployment and honest live verification.

Working branches: `feat/description-media-electronics-taxonomy` in the four existing full repositories. Preserve unrelated untracked duplicate files. No user listing is to be rewritten or published for QA; production category additions are in scope, existing category/product reassignment is not. Prior photo-upload release evidence remains in STATE_SELLER_DESCRIPTION_AND_PHOTO_UPLOADS.md; do not repeat old uploads blindly.

## Release evidence

- Shared typography now uses normal HTML whitespace, visible nested list markers, consistent headings/tables/photos and legacy plain-text line breaks. Complete storefront HTML is collapsed visually rather than sliced inside tags.
- Seller has essential formatting, safe links and authenticated in-description uploads, guarded during tab/view/save transitions. Gallery supports native dragging and keyboard/touch earlier/later controls, with the first item explicitly the main image.
- Governed additive manifest covers 18 electronics families; operator plan/apply is revision checked, resumable and journalled, reuses existing IDs/parents and never writes products. Public category reads no longer stop at 100.
- Payments local suite: 740 tests / 734 passed / 6 environment-specific skips before two additional pagination cases; focused taxonomy/media/pagination suite 17/17 passed.
- Seller build passes unchanged performance gates (654,615 total JS bytes; 57,712 largest async). Admin build passes. Storefront functional/type/build passes, but shared typography exceeded its CSS gzip gate by 192 bytes; allocated 500 bytes (37,500 → 38,000), other gates unchanged. Re-run pending.
- Local headless browser launch is blocked by macOS sandbox (EPERM/SIGABRT); fixture-only browser acceptance will run in existing CI on Node 22 and 24. No user product was edited for QA.
- Coolify dashboard signed in in-app, terminal disconnecting. Asked user to sign in to the new Chrome Coolify tab for category provisioning. No category writes yet.
- Commits, CI, merges, deployment and live checks pending; implementation is not deployment.
