/** Bounded public GETs. The deadline includes reading and parsing the response body. */
export async function requestCatalogueJson<T>(
  url: string,
  parse: (response: Response) => Promise<T>,
  options: RequestInit = {},
  timeoutMs = 25000,
): Promise<T> {
  if (options.method && options.method.toUpperCase() !== 'GET') {
    throw new Error('Catalogue helper only accepts read-only GET requests.')
  }
  const controller = new AbortController()
  const externalSignal = options.signal
  const cancel = () => controller.abort()
  if (externalSignal?.aborted) controller.abort()
  else externalSignal?.addEventListener('abort', cancel, { once: true })
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      // Reject first so the useful timeout message wins over a generic AbortError.
      reject(new Error('Products are taking longer than usual. Please try again or open the low-data catalogue.'))
      controller.abort()
    }, timeoutMs)
  })
  try {
    return await Promise.race([
      fetch(url, { ...options, method: 'GET', credentials: 'omit', signal: controller.signal }).then(parse),
      deadline,
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    externalSignal?.removeEventListener('abort', cancel)
  }
}
