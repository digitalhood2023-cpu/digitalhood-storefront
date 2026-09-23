# Order resolution workspace

Updated 2026-09-23. In progress, not a production-complete cancellation/refund release.

Current continuation: buyers can review exact seller offers, explicitly accept or request support adjudication, and see that agreement is separate from payment confirmation. Server cancellation eligibility disables cancellation after preparation/shipping without hiding return/refund review. An agreed/disputed offer prevents misleading request-withdrawal controls. Full local production checks passed before this final control refinement; new four-variant browser acceptance and final build run in CI. Money movement remains disabled.

Added lazy routes:

- `/account/orders/:orderId/resolutions` — item/quantity selection and request history.
- `/account/resolutions` — account-scoped history with cursor pagination.
- `/account/resolutions/:resolutionId` — case updates, replies and independent refund status.

Order support links only switch to this workspace when `VITE_RESOLUTION_INTAKE_ENABLED=true`. Existing support is unchanged by default. The API independently requires `MARKETPLACE_RESOLUTION_INTAKE_ENABLED=true`; this is review intake, not a money-movement switch.

Design: compact rows, two-column case detail on larger screens, explicit light/dark colours, 16px inputs, idempotency keys preserved for retries, no account case data persisted to browser storage. A request is never presented as a confirmed cancellation/refund.

Verification: targeted lint, TypeScript and the full storefront production build (SEO/release/network/accessibility/performance checks) passed. Four synthetic Chromium mobile/desktop and light/dark cases passed [CI 35690227086](https://github.com/digitalhood2023-cpu/digitalhood-storefront/actions/runs/35690227086), implementation `0cfa82e`. External traffic was blocked and selected screenshots inspected. Physical device/network acceptance remains separate. Local Chrome launch was blocked by macOS sandboxing.

Added `/seller-resolutions?case=...` for private seller notifications. It accepts only a UUID and redirects to the fixed `https://seller.digitalhood.info/resolutions` origin; no user-supplied destination. Seller authentication/ownership checks still apply there. Backend in-app delivery is transactionally deduplicated and gated independently; email delivery remains pending.

Added eligibility-bound withdrawal and appeal controls with explicit confirmation/reason, fixed item-selection labels, and keyed the workspace by account identity/route to prevent stale case display after account changes. Replies cannot wipe text entered while sending.

Still required: evidence uploads/private access, context-aware policy eligibility, full money/fulfilment workflow and operational notifications. Seller/admin counterpart UIs are now implemented on their feature branches. Follow the workspace master `STATE_CANCELLATIONS_RETURNS_REFUNDS.md`; do not enable as a complete release yet.
