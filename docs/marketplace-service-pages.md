# Marketplace service pages

The three homepage services now have dedicated public routes, with separate
noindex `/request` routes for their existing secure support-case workflow:

- `/services/repair`: device assessment, preparation, quotes and tracking.
- `/services/accessories`: bounded live catalogue selections, compatibility help.
- `/services/swaps`: inspection-led swap and upgrade-price-difference enquiries.

`config/services.json` is the release-controlled source for public copy, FAQs,
locations and intake fields. Never put customer content or credentials in it.
The server renders useful public HTML without catalogue or private API calls;
React supplies the live catalogue and verified enquiry forms.

## Safety and operations

No new backend permissions, support types or payment operations. Intakes use
`GENERAL_CONTACT`, predefined subjects and whitelisted plain-text device fields
within the existing 5,000-character support message limit. Account identity is
still server-derived. Guest verification, honeypot, timing and rate safeguards
remain in place. No personal fields enter URLs. An enquiry is not a booked
appointment, guaranteed valuation, stock promise or approval to start work.

Requests have a 30-second deadline and are never automatically retried. Ambiguous
failure asks the customer to check their cases/contact support before submitting
again. A confirmed case reference is required before showing success. Email
delivery is claimed only when the API confirms it. Team handling/replies use the
existing admin support queue and customer case tracking.

## Verification and release

`npm run build` includes service-route HTML/SEO/sitemap and bounded-message tests.
Resolution UI CI runs `scripts/check-service-pages-ui.cjs`: all three pages/forms
at 390/900/1440px in both themes, guest/account identity boundary, field validation,
manual retry, email-status honesty, case tracking, contrast, overflow and live
catalogue empty/error/retry states. All APIs and human-verification tokens in this
test are local fixtures; never submit real production enquiries as a test.

Production-build measurements: total JS 1,659,877 bytes / 534,522 gzip; core CSS
241,792 / 41,097 gzip. The aggregate route budgets increase to 1,680,000 / 542,000
JS and 244,000 / 42,000 core CSS. New service catalogue/layout content is lazy;
the largest-chunk and seller-landing stylesheet ceilings remain unchanged. No
new dependencies, tracking integrations or remote fonts are added.

Live verification found that the generic catalogue search can match a laptop's
description mentioning its included charger. Accessory cards therefore require
whole-word title evidence for the selected accessory type; description-only and
substring matches are excluded. This gate adds no API requests or AI calls and
does not imply device compatibility. A bounded search can show fewer than eight
cards; catalogue browsing and compatibility enquiry remain available.

Rollback: pin the storefront deployment to
`f883ae25c0658f97211250a975b5dc2effbc8e6f`. No database migration or data reversal.
Task progress and final release evidence are maintained in the workspace
`STATE_MARKETPLACE_SERVICE_PAGES.md`.
