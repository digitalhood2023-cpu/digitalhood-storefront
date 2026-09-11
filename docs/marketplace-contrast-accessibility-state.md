# Marketplace contrast accessibility state

Status: complete and released to `main`.

## Objective

Make notification and conversation content clearly readable in light and dark appearances, while strengthening the shared marketplace palette against future contrast regressions.

## Root causes

- Notification headings used a hard-coded navy foreground that was not part of the dark-theme remapping.
- The chat wallpaper was declared after the original dark rules, allowing its light canvas to override dark appearance.
- Notification category tones only defined light pastel colors.
- Several secondary labels used low-contrast foregrounds at compact font sizes.

## Implementation

- Added shared accessible page, surface, unread, foreground, muted, border, chat-canvas and incoming-message tokens.
- Applied the tokens to the notification drawer, full notification feed, conversation shell, thread, context cards, message canvas and composer.
- Added dark category tones for order, payment, delivery, message, support, account, offer and marketplace notifications.
- Added explicit dark chat wallpaper artwork instead of relying on the light wallpaper.
- Kept outgoing messages on the established indigo surface with white text and added an explicit high-contrast incoming bubble.
- Raised compact secondary text from the low-contrast light gray to a readable slate foreground.
- Added dark hover and input-focus treatments.
- Extended legacy dark-brand and amber mappings for remaining marketplace screens.
- Added release-contract coverage for the shared notification and conversation theme hooks.
- Added automated WCAG AA contrast-ratio checks for primary, secondary and compact marketplace text plus incoming and outgoing chat bubbles.

## Acceptance checklist

- [x] Notification drawer uses readable foregrounds in both appearances.
- [x] Full notification feed uses the same palette as the drawer.
- [x] Notification category icons remain distinguishable in dark mode.
- [x] Conversation background changes with appearance.
- [x] Incoming and outgoing message bubbles remain visually distinct and readable.
- [x] Composer, inputs, system notices, timestamps and context cards remain readable.
- [x] Shared marketplace brand and amber foreground mappings cover the previously omitted values.
- [x] Full production build and release validation completed.
- [x] Responsive light/dark visual inspection completed.
- [x] Feature branch committed, pushed and merged into `main`.

## Validation record

- Notification component ESLint: passed.
- TypeScript build: passed.
- Marketplace release contract: passed.
- Automated WCAG AA palette checks: passed.
- Full production build, including SEO, network, accessibility/security and performance gates: passed.
- Light notification and chat surfaces: visually verified.
- Desktop dark notification and chat surfaces: visually verified.
- Mobile dark notification and chat surfaces: visually verified at 390 × 844.

## Release record

- Feature commit: `0845321`
- Merge commit: `3cb36a5`
