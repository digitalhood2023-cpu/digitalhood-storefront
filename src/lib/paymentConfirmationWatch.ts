export type ConfirmationState = { paid?: boolean; failed?: boolean; terminal?: boolean }
type Options<T extends ConfirmationState> = {
  check: (signal: AbortSignal) => Promise<T>
  onResult: (result: T) => void
  onError: (error: unknown) => void
  onDelayed?: () => void
  onTimeout?: () => void
  now?: () => number
  schedule?: (callback: () => void, delay: number) => number
  cancel?: (id: number) => void
}

// Fixed cadence includes request duration. Only one request can be in flight;
// stopping invalidates its callback and aborts network/body reads.
export function startPaymentConfirmationWatch<T extends ConfirmationState>(options: Options<T>) {
  const now = options.now || Date.now
  const schedule = options.schedule || ((callback, delay) => window.setTimeout(callback, delay))
  const cancel = options.cancel || (id => window.clearTimeout(id))
  const started = now()
  const controller = new AbortController()
  let active = true
  let running = false
  let timer: number | undefined
  let wakeRequested = false
  const delayed = schedule(() => { if (active) options.onDelayed?.() }, 10_000)
  const deadline = schedule(() => { if (active) { stop(); options.onTimeout?.() } }, 5 * 60_000)
  function stop() {
    active = false
    controller.abort()
    if (timer !== undefined) cancel(timer)
    cancel(delayed)
    cancel(deadline)
  }
  async function poll() {
    if (!active || running) return
    running = true
    const requestStarted = now()
    try {
      const result = await options.check(controller.signal)
      if (!active) return
      options.onResult(result)
      if (result.paid === true || result.failed === true || result.terminal === true) { stop(); return }
    } catch (error) {
      if (active) options.onError(error)
    } finally {
      running = false
      if (active) {
        const interval = now() - started < 90_000 ? 500 : 2000
        const delay = wakeRequested ? 0 : Math.max(0, interval - (now() - requestStarted))
        wakeRequested = false
        timer = schedule(() => { void poll() }, delay)
      }
    }
  }
  function refresh() {
    if (!active) return
    if (running) { wakeRequested = true; return }
    if (timer !== undefined) cancel(timer)
    void poll()
  }
  // Start now rather than imposing an initial delay after phone authorization.
  void poll()
  return { stop, refresh }
}
