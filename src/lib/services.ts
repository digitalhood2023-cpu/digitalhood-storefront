import content from '../../config/services.json'

export const marketplaceServices = content.services
export type MarketplaceService = typeof marketplaceServices[number]
export function getMarketplaceService(path: string) {
  return marketplaceServices.find(service => service.path === path.replace(/\/+$/, ''))
}
export function getServiceIntake(path: string) {
  return marketplaceServices.find(service => `${service.path}/request` === path.replace(/\/+$/, ''))
}
// Catalogue search also matches descriptions (e.g. a laptop that includes a
// charger). Gate accessory cards on whole title words, never incidental prose.
const accessoryTitleWords: Record<string,string[]> = {
  charging:['charger','chargers','charging','adapter','adapters','adaptor','adaptors','powerbank','powerbanks','battery','batteries'],
  protection:['case','cases','cover','covers','protector','protectors','sleeve','sleeves','pouch','pouches'],
  cables:['cable','cables','adapter','adapters','adaptor','adaptors','hub','hubs','connector','connectors','converter','converters'],
  audio:['headphone','headphones','earphone','earphones','earbud','earbuds','headset','headsets','speaker','speakers','audio','microphone','microphones'],
}
export function isAccessoryListingTitle(name: string, groupId: string) {
  const words = new Set(String(name || '').normalize('NFKC').toLowerCase().match(/[a-z0-9]+/g) || [])
  return (accessoryTitleWords[groupId] || []).some(word => words.has(word))
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
