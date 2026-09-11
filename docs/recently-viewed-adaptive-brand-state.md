# Recently viewed and adaptive brand upgrade

Status: implementation, validation and multi-repository release completed on 2026-09-11.

## Goals

- One compact recently viewed rail across marketplace entry points.
- A compact full-history page with selection and removal controls.
- Circular DigitalHood marks that remain intentional in light and dark appearance.
- System-aware browser-tab branding.

## Validation

Production build, release contracts, TypeScript and focused lint must pass before release.

## Delivered

- Shared compact, swipeable recently viewed rail on home, shop and product surfaces.
- Compact grid/list history manager with selection, individual removal and clear-history actions.
- Reduced product-to-history whitespace without weakening the mobile purchase controls.
- Circular appearance-aware brand mark in storefront, seller storefront, buyer/seller chat identity, loading, offline, error, seller portal and admin portal surfaces.
- System-aware SVG browser icon in customer, seller and admin applications.
- Release-contract coverage for recently viewed composition and adaptive branding.

## Validation results

- Storefront complete production build and release validations passed.
- Seller portal build, theme/zoom contract and performance budget passed.
- Admin portal production build and release contract passed.
- Focused lint passed for the new and directly edited component surfaces.
- Light and dark visual checks passed for the loader, header, history page and footer branding.

## Release

- Storefront merged to `main` at `6d9ccb2`.
- Seller portal merged to `main` at `900cfb2`.
- Admin portal merged to `main` at `ce24ff7`.
