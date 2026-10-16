# Sell on DigitalHood search landing

Release preparation: 2026-10-16. Deployment and Search Console indexing evidence will be recorded in the release PR and the task working state file.

## Implementation
- Public canonical URL: https://store.digitalhood.info/sell.
- Compact, responsive light/dark page. No paid imagery, large media, fake sales figures or guaranteed sales/approval/payout claims.
- Shared content in config/sell-page.json: benefits, application steps, preparation checklist, fee/settlement guidance and native expandable FAQs.
- Actual seller portal registration and sign-in links. No duplicate signup process or authentication/moderation changes.
- Public HTML includes meaningful text and real application links before JavaScript, rendered identically for crawlers and visitors. No catalogue/payment/account API needed for that content.
- React takes over the static content on startup. Native no-JavaScript FAQs and links continue to work if scripting is unavailable; existing JS failure recovery is preserved.
- Server/client canonical metadata, social previews and WebPage/BreadcrumbList schema. No retired search-action markup or promises of FAQ rich results.
- Header (including mobile menu), homepage and footer link to the public landing page. Seller-domain routing and central-origin security controls remain unchanged.
- Static and generated XML sitemaps include /sell.

## Performance
- Route-scoped CSS: only the seller page loads the new stylesheet; the server reads its fingerprinted URL from the build manifest for no-JavaScript styling.
- Existing core CSS budgets remain unchanged. Separate bounded allowance for this new page: 6,000 raw / 1,600 gzip bytes. The measured stylesheet is approximately 5.5 KB raw / 1.5 KB gzip. Existing JavaScript budgets remain unchanged.
- No new runtime package dependency.

## Verification
- Five server tests cover canonical metadata, pre-rendered content, real CTA URLs, escaped content and sitemap fallback during catalogue failure.
- CI checks server-rendered page HTML and sitemap discovery.
- Isolated browser acceptance checks light/dark and mobile/desktop layouts, readable contrast, FAQs, real CTA destinations, overflow and runtime errors. All API activity is intercepted with fixtures; no production writes.
- Full project tests, TypeScript/build/release/accessibility/network and performance checks required before merge.

## Google setup
- Human approved Search Console ownership for only https://store.digitalhood.info/ under digitalhood2023@gmail.com.
- Google auto-verified ownership using the existing HTML verification file. Keep that file in place.
- Submit sitemap and request indexing only after live deployment passes.
- Google decides indexing, ranking and organic sitelinks. No guaranteed position or instant inclusion; no ad spending/campaign/billing changes.
