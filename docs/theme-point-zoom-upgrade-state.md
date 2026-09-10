# Theme and point-zoom upgrade

Status: implementation, validation, and multi-repository release completed on 2026-09-10.

## Delivered

- Point-centred pinch zoom that preserves the image detail between the user's fingers.
- Bounded one-finger panning after zoom, pointer-centred mouse-wheel zoom, and point-centred double-tap/double-click zoom.
- Shared product gallery behavior on the central marketplace and every seller storefront domain.
- Matching in-app image behavior in buyer chat, seller chat, and admin product review.
- System appearance by default, plus a persistent System / Light / Dark manual control.
- Preference sharing across `*.digitalhood.info` through a non-sensitive first-party cookie, with local storage fallback and tab synchronization.
- Appearance initialization before React paints, preventing a bright flash when opening a dark page.
- Dark palettes for the customer marketplace, seller center, admin workspace, form controls, navigation, cards, chat surfaces, and the offline page.
- Transactional email metadata and safe dark-mode CSS that follows the recipient email client's supported appearance setting.

## Safety and accessibility

- Zoom is limited to 5× and panning is clamped to the rendered image bounds.
- Gallery navigation controls are excluded from pointer capture.
- Existing Escape, arrow, plus, minus, and reset keyboard behavior is preserved.
- Reduced-motion preferences remain respected.
- Theme controls expose the current and next appearance through accessible labels.

## Validation

- Storefront release, SEO, network resilience, accessibility/security, TypeScript, production build, and performance validation passed.
- Seller portal TypeScript, production build, theme/zoom contract, and performance budget passed.
- Admin portal TypeScript, production build, focused ESLint, and release contract passed.
- Payments server syntax, dark-email unit tests, and the complete 440-test backend suite passed.

## Release

- Storefront merged to `main` at `025565f`.
- Seller portal merged to `main` at `a624206`.
- Admin portal merged to `main` at `80b4a9f`.
- Payments service merged to `main` at `78cebed`.
