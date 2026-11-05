# Mobile Money checkout follow-up — 5 November 2026

The reported order #29272 succeeded. Its read-only provider record and payment
ledger show the following timeline (Africa/Lusaka, UTC+02:00):

| Event | Local time |
| --- | --- |
| Lenco initiation | 21:21:56.366 |
| Lenco completion | 21:22:52.121 |
| Signed webhook received | 21:22:52.389 |
| Verified payment committed | 21:22:53.027 |
| Durable order operation completed | 21:22:56.181 |

The 55.755 seconds between initiation and provider completion includes delivery
of the phone prompt and customer authorization; no separate PIN timestamp was
available. The customer confirmed that success appeared shortly after approving
with their PIN. These timestamps do not establish a long delay after approval.
Webhook arrival took 268 ms after completion; verified ledger success followed
638 ms later (906 ms total). The order operation completed separately; checkout
success does not wait for that operation or email delivery.

The prior UI displayed an amber "Confirmation delayed" screen ten seconds after
initiation, even during normal customer approval. Checkout now keeps the approval
screen active instead. An "I've approved — check now" action refreshes the same
status watcher in place instead of navigating away. Automatic checking continues.
Focus return also refreshes immediately. Checks run every 500 ms for the first
90 seconds, then every two seconds. Requests never overlap; provider refresh
leases retain their existing minimum one-second interval. The five-minute watch
limit still offers the same order for recovery without another automatic debit.

No payment authentication, signatures, settlement assertions or duplicate guards
were relaxed. The button and timer cannot authorize success: paid=true from the
verified backend remains mandatory. No real charge or order mutation was used
for this investigation.

Verification: 116 runtime tests passed, including half-second authoritative
success, slow-network coalescing, explicit approval refresh, stale cancellation,
transient errors and timeout. TypeScript, release, network (10 scenarios), SEO,
accessibility/security, Vite build and performance budgets passed.
