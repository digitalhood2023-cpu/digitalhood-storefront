# Order resolution workspace

Updated 2026-09-21. In progress, not a production-complete cancellation/refund release.

Added lazy routes:

- `/account/orders/:orderId/resolutions` — item/quantity selection and request history.
- `/account/resolutions` — account-scoped history with cursor pagination.
- `/account/resolutions/:resolutionId` — case updates, replies and independent refund status.

Order support links only switch to this workspace when `VITE_RESOLUTION_INTAKE_ENABLED=true`. Existing support is unchanged by default. The API independently requires `MARKETPLACE_RESOLUTION_INTAKE_ENABLED=true`; this is review intake, not a money-movement switch.

Design: compact rows, two-column case detail on larger screens, explicit light/dark colours, 16px inputs, idempotency keys preserved for retries, no account case data persisted to browser storage. A request is never presented as a confirmed cancellation/refund.

Verification: TypeScript and the full storefront production build (SEO/release/network/accessibility/performance checks) passed. Visual browser/device acceptance is pending.

Still required: evidence uploads/private access, withdrawal/appeal controls, context-aware policy eligibility, seller/admin counterpart UIs, full money/fulfilment workflow and operational notifications. Follow the workspace master `STATE_CANCELLATIONS_RETURNS_REFUNDS.md`; do not enable as a complete release yet.
