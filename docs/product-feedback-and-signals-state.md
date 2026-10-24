# Product feedback and shopper signals — 24 October 2026

Source branch: `fix/live-product-feedback-signals`.

The shared product preview previously rendered draft-only feedback text even for linked published listings. It now reads the same public `/api/products/:id/reviews` source as the main storefront, keyed only by the stable Woo product ID. Verified-only review cards include safe descriptions, published seller responses and approved media. Unpublished drafts remain honest empty previews.

Reads have a 12-second deadline and cancel on unmount/product changes. Responses are identity checked; malformed/failed responses show retry states rather than fabricated empty feedback. Refresh, pagination, throttled focus/visibility refresh and one-minute visible-page revalidation are included. No product, review, moderation, financial or permission writes are added.

Rating (gold), sales (indigo), delivery (green) and cutoff (orange) signals retain their real data and eligibility logic. Text/icons supplement colour and both themes have explicit contrast palettes. Shared assets and hashes remain aligned across storefront, seller and admin. Feedback-only styles are excluded from the shopper product route.

Local verification: three production builds and seven feedback unit cases pass; source parity is checked in all three repos. Browser CI covers draft/live feedback, refresh, failed/null responses, retries, pagination, stale responses, deadlines, responsive themes, contrast, zoom and inactive purchase actions. The local sandbox cannot launch headless Chrome; CI and normal signed-in browser checks are required before calling deployment complete.

Release and live-verification evidence is maintained in the workspace `STATE_PRODUCT_FEEDBACK_AND_SHOPPER_SIGNALS.md`. Publication/deployment is not implied by a local build.
