# Track order dark-mode and layout state

Updated: 2026-09-13 (Africa/Lusaka)

## Objective

Make the signed-in and guest tracking experience fully readable in light and dark
mode, fix the delayed-delivery contrast failure, and use the desktop viewport with
a deliberate two-column order layout.

## Completed scope

- Added semantic, theme-aware tracking surfaces instead of light-only utility
  combinations.
- Added distinct accessible colors for active, delayed, delivered, warning,
  success, error, and closed states.
- Rebuilt the tracking detail body into two desktop columns:
  - left: items and sellers, followed by the complete order summary;
  - right: delivery status, delivery address, feedback, and support.
- Kept the mobile flow in a natural single-column order.
- Updated the tracking list, guest lookup, filters, order cards, pagination, and
  feedback states to use the same adaptive color system.
- Preserved existing privacy, payment recovery, live refresh, feedback, seller,
  product, maps, and support behavior.
- Added release-contract checks for the layout order and dark-mode classes.

## Verification

- [x] TypeScript compilation
- [x] Storefront release contracts
- [x] Network and resilience validation
- [x] Accessibility and security validation
- [x] Production Vite build
- [x] Performance budget checks

## Release

The change is ready for the `main` release pipeline. The resulting commit is
recorded in the workspace state file and release handoff.

## Next separate phase

The cost-controlled OpenAI catalogue classification and taxonomy correction
programme remains a separate implementation phase. It must not create new public
categories automatically; classifications will be constrained to the approved
marketplace taxonomy with confidence thresholds and review gates.
