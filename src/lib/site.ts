export const SITE = {
  name: 'DigitalHood',
  legalName: 'DigitalHood Creations Limited',
  title: 'DigitalHood Zambia | Phones, Laptops, Accessories & Repairs',
  description:
    "Shop phones, laptops, accessories, repairs and trusted tech services in Zambia. DigitalHood is building Zambia's most reliable online marketplace.",
  url: 'https://store.digitalhood.info',
  productionUrl: 'https://store.digitalhood.info',
  phone: '+260 971 047 570',
  email: 'contact@digitalhood.info',
  locale: 'en_ZM',
  language: 'en-ZM',
  country: 'ZM',
  currency: 'ZMW',
  socialImage: '/logo.jpg',
} as const

export type JsonLdObject = Record<string, unknown>

export type SeoConfig = {
  title?: string
  description?: string
  path?: string
  image?: string
  noindex?: boolean
  ogType?: 'website' | 'article' | 'product' | 'profile'
  structuredData?: JsonLdObject | JsonLdObject[]
}
