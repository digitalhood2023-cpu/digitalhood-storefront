const RESIZE_QUERY_PARAMETERS = [
  'w',
  'width',
  'h',
  'height',
  'q',
  'quality',
  'resize',
  'crop',
  'fit',
  'auto',
]

export function getProductImageIdentity(input = '') {
  const rawUrl = String(input || '').trim()

  if (!rawUrl) return ''

  try {
    const baseUrl =
      typeof window === 'undefined'
        ? 'https://store.digitalhood.info'
        : window.location.origin
    const url = new URL(rawUrl, baseUrl)

    RESIZE_QUERY_PARAMETERS.forEach((parameter) => {
      url.searchParams.delete(parameter)
    })
    url.hash = ''
    url.pathname = url.pathname.replace(
      /-(?:\d+x\d+|scaled)(?=\.[a-z0-9]+$)/i,
      ''
    )

    const sortedSearch = Array.from(url.searchParams.entries()).sort(
      ([left], [right]) => left.localeCompare(right)
    )
    url.search = ''
    sortedSearch.forEach(([key, value]) => url.searchParams.append(key, value))

    return `${url.hostname.toLowerCase()}${url.pathname}${url.search}`
  } catch {
    return rawUrl
      .replace(/[?#].*$/, '')
      .replace(/-(?:\d+x\d+|scaled)(?=\.[a-z0-9]+$)/i, '')
      .toLowerCase()
  }
}

export function deduplicateProductImages(inputs: Array<string | null | undefined>) {
  const seen = new Set<string>()

  return inputs
    .map((input) => String(input || '').trim())
    .filter(Boolean)
    .filter((source) => {
      const identity = getProductImageIdentity(source)

      if (!identity || seen.has(identity)) return false
      seen.add(identity)
      return true
    })
}

export function getPinchOriginPercent(
  firstTouch: { clientX: number; clientY: number },
  secondTouch: { clientX: number; clientY: number },
  bounds: { left: number; top: number; width: number; height: number }
) {
  const midpointX = (firstTouch.clientX + secondTouch.clientX) / 2
  const midpointY = (firstTouch.clientY + secondTouch.clientY) / 2
  const x = bounds.width > 0
    ? ((midpointX - bounds.left) / bounds.width) * 100
    : 50
  const y = bounds.height > 0
    ? ((midpointY - bounds.top) / bounds.height) * 100
    : 50

  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  }
}
