# Product chat drawer

Status: In progress — 30 October 2026 (Africa/Lusaka).

## Requested outcome

Product Chat opens a right-side conversation drawer on desktop/larger tablets and a full-screen conversation on phones, without losing the product page. Improve usefulness while retaining the existing authenticated messaging system.

## Implementation / checks

- [ ] Reuse the existing buyer thread (attachments, receipts, replies, reconnect/retry), not a second messaging backend.
- [ ] Route-backed accessible modal: right drawer at tablet/desktop widths, full-screen mobile; background scroll/position, focus, Escape, Back and direct message links.
- [ ] Product reference, optional quick-question prompts, inbox expansion and bounded account/conversation-scoped draft recovery. Never auto-send a prompt or product card.
- [ ] Safe close/expand handling while sending or holding unsent attachments; preserve authentication and seller ownership boundaries.
- [ ] Light/dark, desktop/tablet/mobile, keyboard and failure/retry fixture acceptance; performance/build gates.
- [ ] Commit/PR/CI, deployment and safe live verification. No real seller messages or customer orders for QA.

Working repository: `work/repos/digitalhood-storefront-full`, branch `feat/product-chat-drawer`. Preserve unrelated untracked duplicate files. Existing open seller listing edits must remain untouched. The previous description/category project is complete and documented separately.

## Evidence / decisions

- Implemented route-backed Radix modal using the existing authenticated buyer thread. Product page stays mounted; direct message links remain full-page. Breakpoint: 768px; desktop drawer 490px, tablet 460px, phone full viewport.
- Product reference and explicit Share item; three optional quick questions only fill the composer. Existing attachments/read receipts/replies/retry IDs remain intact. Inline open failure and manual refresh added.
- Text drafts are memory-only, account/conversation scoped, capped at 20 × 4,000 characters and one-hour expiry; cleared on login/logout/session expiry. They are not written to localStorage or sent automatically. Refresh/unload warns when work remains.
- Close/expand buttons protect active sends/preparation and confirm discarding selected media/failed sends/unfinished edits. Browser Back uses ordinary route history; text draft remains recoverable in the tab. No new backend endpoints or permissions.
- Local route/draft unit tests pass; complete type/build/functional checks pass. Measured feature requires +5,000 bytes total JS gzip, +5,000 core CSS bytes and +1,000 core CSS gzip allocation. Other performance limits stay unchanged. No new dependency packages.
- Browser acceptance added for desktop/tablet/mobile in both themes, route/scroll/focus/Back behaviour, draft isolation, explicit send failure/retry and no automatic messages. It runs in the existing isolated CI browser environment; local headless Chromium is sandbox-blocked on this machine.
- Pending: CI, visual QA, merge/deploy, safe live UI check. Do not send real messages for QA.
