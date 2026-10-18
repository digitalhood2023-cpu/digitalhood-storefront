# Seller journey and policy presentation — 2026-10-17

- Public Sell page offers individual/business entry links matching the seller portal's typed registration journey. Server-rendered and React content use the same source.
- Seller support links carry a public support type and subject into the existing secure contact form. Account-linked contact and guest flows retain their existing validation/Turnstile controls; no identity or payment data is put in links.
- Seller terms and Restricted products include short summaries of existing requirements, compact policy navigation and section links, and actionable support. Other marketplace policies use the same theme-aware, compact layout.
- Removed the public internal “operational foundation / qualified legal professional” notice at the human's request. This is a presentation change, not a representation that independent legal approval has occurred. Existing policy body, dates, commercial/refund terms, statutory obligations and enforcement clauses remain unchanged.
- No new package dependency or authentication/payment/moderation changes. Existing performance ceilings must continue to pass.
- Tests cover pre-rendered links and safe escaping, all policy routes, navigation, contrast/overflow across themes/viewports, and no-JavaScript landing content. CI and live deployment evidence will be recorded in the release PR and task state file.

## 2026-10-18 follow-up: one account-type choice

The public Sell page now has a single generic registration entry rather than asking individual/business before account creation. Seller type is selected once in the authenticated seller application. Server-rendered no-JavaScript content and the hydrated page share this flow; legacy typed links remain compatible in Seller Center. Saved rejection corrections are handled by the seller/payments companion releases. Existing policy clauses and public indexing behaviour are unchanged.
