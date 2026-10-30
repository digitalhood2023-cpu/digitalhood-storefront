// Private text drafts live only in this tab's memory. Never persist credentials,
// attachments or message text to localStorage. Account logout clears this cache.
const drafts = new Map<string,{text:string;expiresAt:number}>()
const MAX_DRAFTS = 20, TTL = 60 * 60 * 1000
export function clearBuyerChatDrafts() { drafts.clear() }
export function buyerChatDraftKey(customerId: string | number | undefined, conversationId: string | undefined) {
  return customerId && conversationId ? JSON.stringify([String(customerId),conversationId]) : ''
}
export function readBuyerChatDraft(key: string, now = Date.now()) {
  const row = drafts.get(key)
  if (!row || row.expiresAt <= now) { drafts.delete(key); return '' }
  return row.text
}
export function writeBuyerChatDraft(key: string, text: string, now = Date.now()) {
  if (!key) return
  drafts.delete(key)
  if (!text) return
  drafts.set(key,{text:text.slice(0,4000),expiresAt:now+TTL})
  while (drafts.size > MAX_DRAFTS) drafts.delete(drafts.keys().next().value!)
}
