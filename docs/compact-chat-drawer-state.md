# Compact chat drawer — release preflight

31 October 2026. Base/rollback: `66b4e6a077a801149aadb81ec98601f414d8ec6d`.

Requested: smaller typing font, automatic seven-line composer, one horizontally scrollable quick-question row, smaller heading, product reference removed after successful sharing, actual positive-feedback percentage beside seller name.

Implemented using the existing authenticated buyer thread. Public reputation uses the conversation's seller/store identity, without forwarding account credentials; missing/failed/empty feedback displays `—%`, never a fabricated score. Reads have an eight-second deadline and abort on unmount. Successful matching product shares remove the reference; failed shares retain the original retry ID. Loaded history prevents the matching card returning on reopen. The mobile iOS 16px input exception prevents focus zoom; other typing uses 14px. No zoom restrictions or backend/permission changes.

Verification before merge: complete build/type/security-boundary/performance checks and the six light/dark × 390/900/1440 fixture browser scenarios. Expanded acceptance covers seven lines, overflow, shrinking, soft wrapping, one-row/keyboard questions, compact heading, real/no/failed reputation, share failure/retry/success/reopen, and previous draft/focus/Back/media protections. No real messages or product shares for QA.

Measured first build: JS gzip 525,304 bytes and core CSS gzip 39,041 bytes. Intentional feature allocation: JS gzip cap 526,000 (+1,000); core CSS gzip cap 39,500 (+500). Raw and per-chunk limits unchanged. Messaging stays lazy-loaded.

Authoritative task state and final deployment/live proof are tracked in workspace `STATE_CHAT_DRAWER_COMPACT_REFINEMENTS.md`. This is a committed preflight snapshot, not a claim of deployment.
