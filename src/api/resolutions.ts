import { accountFetch } from './account'

export type ResolutionSummary = {
  resolution_id: string; order_id: string; kind: string; reason: string; status: string
  version: number; created_at: string; updated_at: string
}
export type OrderResolution = ResolutionSummary & {
  description: string; currency: string
  lines: Array<{ line_id: string; seller_id: string; name: string; unit_numbers: number[]; amount_minor: string }>
  events: Array<{ version: number; event_type: string; created_at: string; data: { note?: string; message?: string; role?: string } }>
  refund: null | { amount_minor: string; currency: string; status: string; completed_at: string | null }
}
export type ResolutionRequest = {
  kind: string; reason: string; description: string; items: Array<{ lineId: string; quantity: number }>
}
export function listResolutions(orderId?: string, before?: string) {
  const path = orderId ? `/api/account/orders/${encodeURIComponent(orderId)}/resolutions` : '/api/account/resolutions'
  return accountFetch<{ items: ResolutionSummary[]; nextCursor: string | null }>(path + (before ? `?before=${encodeURIComponent(before)}` : ''), { signal: AbortSignal.timeout(15000) })
}
export function getResolution(id: string) {
  return accountFetch<{ resolution: OrderResolution }>(`/api/account/resolutions/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(15000) })
}
export function createResolution(orderId: string, payload: ResolutionRequest, key: string) {
  return accountFetch<{ resolution: OrderResolution }>(`/api/account/orders/${encodeURIComponent(orderId)}/resolutions`, { method: 'POST', headers: { 'X-Idempotency-Key': key }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) })
}
export function sendResolutionMessage(id: string, message: string, key: string) {
  return accountFetch<{ version: number }>(`/api/account/resolutions/${encodeURIComponent(id)}/messages`, { method: 'POST', headers: { 'X-Idempotency-Key': key }, body: JSON.stringify({ message }), signal: AbortSignal.timeout(20000) })
}
export function actOnResolution(id: string, version: number, status: 'withdrawn' | 'appealed', note: string) {
  return accountFetch<{ resolution: OrderResolution }>(`/api/account/resolutions/${encodeURIComponent(id)}/actions`, { method: 'POST', body: JSON.stringify({version, status, note}), signal: AbortSignal.timeout(20000) })
}
export function resolutionLabel(value: string) {
  const labels: Record<string, string> = { requested: 'Request received', under_review: 'In review', awaiting_buyer: 'Your reply needed', awaiting_seller: 'Waiting for seller', approved: 'Approved', submitting: 'Confirming refund', unknown: 'Confirming refund', manual_review: 'Refund under review', reserved: 'Refund approved', processing: 'Refund processing', succeeded: 'Refund confirmed', failed: 'Refund needs attention', cancelled: 'Refund cancelled', declined: 'Request declined', appealed: 'Appeal received', withdrawn: 'Request withdrawn', resolved: 'Resolved' }
  return labels[value] || value.replaceAll('_', ' ')
}
