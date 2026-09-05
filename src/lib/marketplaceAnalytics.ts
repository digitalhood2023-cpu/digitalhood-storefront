type MarketplaceEvent = {
  eventKey: string
  properties?: Record<string, string | number | boolean | null>
  experimentAssignments?: Record<string, string>
}

const CONSENT_KEY = 'digitalhood_analytics_consent_v1'
const SESSION_KEY = 'digitalhood_analytics_session_v1'

function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

export function hasMarketplaceAnalyticsConsent() {
  return localStorage.getItem(CONSENT_KEY) === 'granted'
}

export function setMarketplaceAnalyticsConsent(granted: boolean) {
  localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied')
  if (!granted) sessionStorage.removeItem(SESSION_KEY)
}

export async function emitMarketplaceEvent(event: MarketplaceEvent) {
  if (!hasMarketplaceAnalyticsConsent() || !navigator.onLine) return { accepted: false, reason: 'consent_or_network_unavailable' }
  const payload = {
    eventKey: event.eventKey,
    eventId: crypto.randomUUID(),
    sessionId: getSessionId(),
    properties: event.properties || {},
    experimentAssignments: event.experimentAssignments || {},
    occurredAt: new Date().toISOString(),
    consentGranted: true,
  }
  try {
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
    if (!response.ok) return { accepted: false, reason: `http_${response.status}` }
    return await response.json()
  } catch {
    return { accepted: false, reason: 'network_error' }
  }
}
