import content from '../../config/services.json'

export const marketplaceServices = content.services
export type MarketplaceService = typeof marketplaceServices[number]
export function getMarketplaceService(path: string) {
  return marketplaceServices.find(service => service.path === path.replace(/\/+$/, ''))
}
export function getServiceIntake(path: string) {
  return marketplaceServices.find(service => `${service.path}/request` === path.replace(/\/+$/, ''))
}
// Only release-controlled fields enter the message. Do not place contact/device
// details in URLs or extend the account support endpoint's identity boundary.
export function buildServiceMessage(service: MarketplaceService, details: Record<string, string>, message: string) {
  return [
    `Service enquiry: ${service.title}`,
    ...service.fields.map(field => `${field.label}: ${String(details[field.name] || '').trim().slice(0,240) || 'Not supplied'}`),
    '', message.trim().slice(0,3500),
  ].join('\n')
}
