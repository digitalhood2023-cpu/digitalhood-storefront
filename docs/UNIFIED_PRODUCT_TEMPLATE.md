# DigitalHood unified product presentation v1

The three independently deployed apps carry byte-identical presentational source and a SHA-256 manifest. Run `node scripts/validate-product-template.mjs` in every repository. A template revision must update these files and manifests in storefront, seller and admin together.

- MarketplaceProduct: compact gallery/title left; seller, offer and information tabs right; responsive, explicit light/dark colors, keyboard tabs, safe description formatting and specification tables.
- MarketplaceProductPreview: local, inactive buyer actions; complete deduplicated gallery, variant-specific image/price/stock/condition/SKU and specifications; focal-point image viewer.
- Storefront keeps actual cart/stock, chat, delivery, seller-domain checkout, recommendations and verified feedback. Admin controls and source/moderation records stay outside the buyer presentation.
- Seller edit fields occupy corresponding product positions. Buyer preview is lazy-loaded, does not submit a product or create orders, and does not make a preview API request. Durable photo upload, autosave, revision conflicts, recovery and submitted-product locks remain.
- Draft previews cannot know shopper-specific shipping or unpublished buyer feedback. They explicitly say delivery is confirmed at checkout and do not manufacture reviews.
- Seller-provided description HTML is converted to allowlisted React nodes. Script, iframe, form, event/style attributes and non-http(s)/local image/link URLs are not rendered.

## Acceptance

`scripts/check-product-template-ui.cjs` serves an isolated development fixture and blocks production traffic. Four desktop/mobile/light/dark scenarios cover variant switching, description-table specifications, safe HTML, tab keyboard navigation, fullscreen viewer focus restoration, no overflow, inactive purchase buttons and text contrast. The dev fixture is not a production build entry.

Admin retains approval browser acceptance: exactly one decision request, resumable status polling, missing-image errors and rejection guards. Seller adds real-route editor acceptance for local preview, concurrent image upload without lost fields, draft save/reopen, account-bound revisions and submitted locks. Existing order-resolution browser acceptance remains.

The seller preview is a separate lazy chunk so it does not inflate the editor's initial render. Initial JS, largest async chunk and gzip transfer budgets are unchanged. Total seller raw JS allowance is 600 KB (previously 590 KB); storefront raw CSS allowance is 220 KB (previously 210 KB) for the new shared presentation. These are explicit feature allocations, not claims of faster network transfers. All other existing budgets remain enforced.

No database schema, authorization, payment/stock authority or production fixture record changes are introduced. Rollback uses the preceding app image/commit; saved product records remain compatible.
