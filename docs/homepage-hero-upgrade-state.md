# Homepage hero upgrade state

Status: implementation and validation complete; release in progress.

## Objective

Replace the permanently dark, oversized homepage hero with a compact DigitalHood marketplace entry point that follows the visitor's selected light or dark appearance.

## Implementation

- Added explicit light and dark hero surfaces, text, controls, chips and marketplace-picks treatments.
- Reduced the headline from the previous 4.7rem desktop size to a compact 3.35rem maximum.
- Reduced hero padding, call-to-action height, product feature height and supporting-product card size.
- Kept the useful marketplace, store, trending and popular-search routes.
- Removed the redundant checkout, payment and delivery feature strip and all six of its labels.
- Added a release-contract check to prevent the obsolete strip or oversized heading from returning.

## Acceptance checklist

- [x] Light mode uses a light marketplace surface with readable dark text.
- [x] Dark mode retains a polished dark treatment with readable light text.
- [x] Headline and hero footprint are materially smaller on mobile and desktop.
- [x] Redundant feature strip is removed.
- [x] Marketplace and store actions remain available.
- [x] Popular-search and curated-product discovery remain available.
- [ ] Production branch push completed.

## Validation record

- Focused Hero ESLint: passed.
- Marketplace release contract: passed.
- Full production build, including SEO, network, accessibility/security and performance checks: passed.
- Desktop light appearance: visually verified.
- Mobile light appearance: visually verified at 390 × 844.
- Mobile dark appearance: visually verified at 390 × 844.
