# Customer Support pages — 2026-10-20

## Content and navigation

The footer's six Support destinations are `/support`, `/support/track`, `/help`, `/shipping`, `/returns` and `/warranty`. Customer guides now include practical next steps and links to the existing secure order/case tools. No refund or order write is performed by a policy page.

`config/customer-support.json` owns the new public help/shipping/returns/warranty copy. Existing marketplace policy bodies moved mechanically from the TypeScript source to `config/marketplace-policies.json`; only the dispute page was updated to link to the dedicated return policy and clarify remedy/payment separation. `/terms`, `/privacy` and `/faqs` resolve to the canonical detailed pages instead of maintaining competing short summaries.

The requested seven-calendar-day return-request window starts after actual receipt (delivery day zero, Lusaka end of day seven). It is prospective for purchases under this version. Earlier 14-day DigitalHood promises, longer purchase-time promises, valid warranties and applicable consumer rights are preserved. Fault priority at 30 days is not an automatic denial cutoff. The historical financial workflow policy/provenance and backend eligibility constants were not rewritten.

Public copy explains condition/exclusions, faulty/wrong/unsafe goods, request evidence, confirmed destinations, return transport, inspection, full/partial remedies, delivery allocation, no customer processing/restocking deduction, original-payment verification and DigitalHood Finance handling. No universal provider payout or repair deadline, automatic refund or seller-only right to refuse escalation is promised.

## Rendering and safety

- The server renders all ten public policies and a useful support/contact/tracking fallback into initial HTML without any account/catalogue/API dependency. Native links and section navigation remain usable without JavaScript.
- The same release-controlled policy object is embedded as escaped inert JSON outside the React root. Direct visits reuse it; internal navigation reads only the selected policy via a credential-free, GET-only, same-origin public endpoint. The short in-memory cache contains only allowlisted public policy text.
- Failed/invalid/timed-out internal reads show an explicit readable-page reload link, support email and phone. They never fall through to a blank screen or a different policy. Private order/case access, verification and Turnstile remain unchanged.
- Public endpoint and HTML response use no-store. Link targets are validated relative paths; JSON and HTML are independently escaped. Unknown policies return 404. No customer/order identifiers enter policy responses.
- Production Docker runtime now copies `config/`, which is required by the public document renderer as well as the existing seller landing renderer. No production setting or permission is changed by this file.

## Verification

- Ten policy-specific unit/contract tests pass, including prototype/unknown paths, aliases, markup/link injection, embedded copy, public-only fetches, caching and failure handling.
- Existing startup, assistant, catalogue, merchant feed and seller landing tests pass (88 tests with the policy additions); release/network/accessibility/security checks and TypeScript pass.
- Local GET checks cover every Support destination, all ten policy bodies, canonical redirects, matching public JSON, no-store and unknown-policy 404 (27 checks).
- Browser footer navigation, guest intake and case tracking were opened without submitting a case. Return policy checked in light/dark desktop and an actual 390×844 browser viewport: one main landmark, no horizontal page overflow, readable content. Proof remains in the task workspace, not the public bundle.
- Performance ceilings were not raised. A first eager-copy build exceeded the existing limit; moving public prose out of shopping JavaScript fixed it. Final local JS 1,617,298 bytes / 519,175 gzip; largest JS 381,162 bytes. CSS totals 232,624 bytes including the separately budgeted seller landing CSS (5,267 bytes). Production locked CI remains authoritative.

## Release / rollback

Publish only the reviewed storefront tree, wait for required CI and verify the exact deployed commit and live response contents. Do not activate refund execution or submit test claims as part of publication. Rollback is a normal storefront redeploy of the prior reviewed release; no customer data migration or financial rollback is required. Production publication evidence is recorded in the task-level `STATE_STOREFRONT_SUPPORT_POLICIES.md`.

## Research references

- CCPC consumer guidance: https://www.ccpc.org.zm/condetails (proof, seller contact, escalation and protections against blanket no-refund disclaimers).
- CCPC published Act: https://www.ccpc.org.zm/media/policy/CCPC-ACT-2010.pdf (legal reference, not an assertion that a voluntary seven-day change-of-mind limit removes other rights).
- eBay procedural guidance: https://www.ebay.com/help/returns-refunds/returning-item/return-item-refund?id=4041 (request/instructions/return evidence/remedy/escalation; brand guarantees and provider deadlines were not copied).

These references informed original DigitalHood wording. This release does not itself establish independent legal approval, provider acceptance or readiness of the separate refund-execution project.
