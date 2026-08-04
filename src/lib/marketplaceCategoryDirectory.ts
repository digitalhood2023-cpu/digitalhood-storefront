import type { WooCategory } from '@/lib/woocommerce'

export type MarketplaceDepartment = {
  slug: string
  name: string
  description: string
  liveCategorySlugs: string[]
  keywords: string[]
  future?: boolean
}

export type ResolvedMarketplaceDepartment =
  MarketplaceDepartment & {
    categories: WooCategory[]
    productCount: number
    available: boolean
    url: string
  }

export const marketplaceDepartments: MarketplaceDepartment[] = [
  {
    slug: 'phones-smartphones',
    name: 'Phones & Smartphones',
    description:
      'Smartphones, feature phones, iPhone and Samsung devices.',
    liveCategorySlugs: [
      'phones',
      'smartphones',
      'iphone',
      'samsung',
    ],
    keywords: [
      'phone',
      'mobile',
      'smartphone',
      'iphone',
      'samsung',
    ],
  },
  {
    slug: 'tablets-e-readers',
    name: 'Tablets & E-Readers',
    description:
      'Portable tablets and larger-screen mobile devices.',
    liveCategorySlugs: ['tablet', 'tab'],
    keywords: ['tablet', 'ipad', 'tab', 'e-reader'],
  },
  {
    slug: 'laptops-computers',
    name: 'Laptops & Computers',
    description:
      'Windows laptops, MacBooks and personal computers.',
    liveCategorySlugs: ['pc-laptops', 'macbook'],
    keywords: ['laptop', 'computer', 'pc', 'macbook'],
  },
  {
    slug: 'computer-components',
    name: 'Computer Components',
    description:
      'RAM, PC parts, power supplies and upgrade components.',
    liveCategorySlugs: [
      'pc-parts',
      'ram',
      'power-supply',
    ],
    keywords: [
      'ram',
      'pc parts',
      'component',
      'power supply',
    ],
  },
  {
    slug: 'storage-drives',
    name: 'Storage & Drives',
    description:
      'SSDs, external drives, enclosures and portable storage.',
    liveCategorySlugs: [
      'storage',
      'storage-drive',
      'ssd',
      'harddrive',
      'external-drive',
      'external-storage',
      'portable-drive',
      'hdd-case',
      'hdd-enclosure',
      'harddrive-case',
    ],
    keywords: [
      'storage',
      'ssd',
      'hard drive',
      'external drive',
    ],
  },
  {
    slug: 'phone-accessories',
    name: 'Phone Accessories',
    description:
      'Cases, holders, screen protection and mobile accessories.',
    liveCategorySlugs: [
      'accessories',
      'cases',
      'casing',
      'phone-cases',
      'iphone-case',
      'phone-holder',
      'screen-protectors',
      'camera-protector',
      'lens-protector',
      'protector',
    ],
    keywords: [
      'case',
      'protector',
      'holder',
      'phone accessory',
    ],
  },
  {
    slug: 'charging-power',
    name: 'Charging & Power',
    description:
      'Chargers, cables, power banks, batteries and power packs.',
    liveCategorySlugs: [
      'chargers',
      'chargers-2',
      'charger-head',
      'charging-cable',
      'charging-hub',
      'fast-charging',
      'wireless-charger',
      'power-bank',
      'power-pack',
      'battery',
      'laptop-batteries',
      'laptop-charger',
      'power-cable',
      'car-adapter',
    ],
    keywords: [
      'charger',
      'battery',
      'power bank',
      'charging',
      'power',
    ],
  },
  {
    slug: 'cables-adapters-hubs',
    name: 'Cables, Adapters & Hubs',
    description:
      'USB, Type-C, OTG, data cables, adapters and docking hubs.',
    liveCategorySlugs: [
      'cable',
      'data-cables',
      'adapter',
      'usb',
      'type-c',
      'otg',
      'usb-hub',
      'dock-station',
    ],
    keywords: [
      'cable',
      'adapter',
      'usb',
      'hub',
      'dock',
    ],
  },
  {
    slug: 'audio-headphones',
    name: 'Audio & Headphones',
    description:
      'Earphones, headphones, microphones and speakers.',
    liveCategorySlugs: [
      'audio',
      'bluetooth',
      'earphones',
      'earphones-2',
      'wireless-earphones',
      'wired-earphones',
      'headphones',
      'pods',
      'speakers',
      'portable-speakers',
      'bluetooth-speaker',
      'microphone',
      'wireless-microphone',
    ],
    keywords: [
      'audio',
      'headphones',
      'earphones',
      'speaker',
      'microphone',
    ],
  },
  {
    slug: 'gaming-consoles',
    name: 'Gaming & Consoles',
    description:
      'Games, PlayStation products, controllers and gamepads.',
    liveCategorySlugs: [
      'console',
      'games',
      'playstation',
      'ps',
      'controllers',
      'gamepad',
    ],
    keywords: [
      'gaming',
      'console',
      'playstation',
      'controller',
      'game',
    ],
  },
  {
    slug: 'wearables',
    name: 'Smartwatches & Wearables',
    description:
      'Smartwatches, trackers and wearable accessories.',
    liveCategorySlugs: [
      'smartwatches',
      'watch',
      'trackers',
      'watch-cases',
      'watches-accessories',
    ],
    keywords: [
      'watch',
      'smartwatch',
      'tracker',
      'wearable',
    ],
  },
  {
    slug: 'repair-parts-tools',
    name: 'Repair Parts & Tools',
    description:
      'Replacement screens, smartphone parts and repair tools.',
    liveCategorySlugs: [
      'smartphone-parts',
      'replacement-parts',
      'screen-replacement',
      'smartphone-lcd',
      'lcd',
      'smartphone-housing',
      'charging-port',
      'smartphone-repair',
      'repair-tools',
      'toolkit',
      'tools',
      'adhesive',
      'glue',
    ],
    keywords: [
      'repair',
      'replacement',
      'lcd',
      'screen',
      'tool',
    ],
  },
  {
    slug: 'office-equipment',
    name: 'Office Equipment',
    description:
      'Office technology, accessories and productivity equipment.',
    liveCategorySlugs: [
      'office-equipment',
      'office-accessories',
    ],
    keywords: [
      'office',
      'equipment',
      'productivity',
    ],
  },
  {
    slug: 'car-electronics',
    name: 'Car Electronics & Accessories',
    description:
      'Adapters, holders and electronic accessories for vehicles.',
    liveCategorySlugs: [
      'car-accessories',
      'car-adapter',
    ],
    keywords: ['car', 'vehicle', 'automotive'],
  },
  {
    slug: 'home-personal-tech',
    name: 'Home & Personal Technology',
    description:
      'Home accessories, humidifiers, massage and personal devices.',
    liveCategorySlugs: [
      'home-accessories',
      'humidifier',
      'health-beauty',
      'massage',
    ],
    keywords: [
      'home',
      'personal',
      'health',
      'humidifier',
    ],
  },
  {
    slug: 'networking-internet',
    name: 'Networking & Internet',
    description:
      'Routers, access points, switches and connectivity equipment.',
    liveCategorySlugs: [],
    keywords: [
      'router',
      'network',
      'wifi',
      'internet',
    ],
    future: true,
  },
  {
    slug: 'cameras-photography',
    name: 'Cameras & Photography',
    description:
      'Digital cameras, lenses and photography accessories.',
    liveCategorySlugs: [],
    keywords: ['camera', 'photography', 'lens'],
    future: true,
  },
  {
    slug: 'tv-monitors-displays',
    name: 'TVs, Monitors & Displays',
    description:
      'Televisions, monitors, display panels and viewing equipment.',
    liveCategorySlugs: [],
    keywords: ['tv', 'monitor', 'display'],
    future: true,
  },
  {
    slug: 'printers-scanners',
    name: 'Printers & Scanners',
    description:
      'Printers, scanners, consumables and document equipment.',
    liveCategorySlugs: [],
    keywords: ['printer', 'scanner', 'toner'],
    future: true,
  },
  {
    slug: 'projectors-presentation',
    name: 'Projectors & Presentation',
    description:
      'Projectors, screens and presentation equipment.',
    liveCategorySlugs: [],
    keywords: [
      'projector',
      'presentation',
      'screen',
    ],
    future: true,
  },
  {
    slug: 'security-surveillance',
    name: 'Security & Surveillance',
    description:
      'CCTV, smart cameras and security technology.',
    liveCategorySlugs: [],
    keywords: [
      'security',
      'surveillance',
      'cctv',
    ],
    future: true,
  },
  {
    slug: 'smart-home-iot',
    name: 'Smart Home & IoT',
    description:
      'Connected appliances, sensors and automation devices.',
    liveCategorySlugs: [],
    keywords: [
      'smart home',
      'iot',
      'automation',
    ],
    future: true,
  },
  {
    slug: 'drones-robotics',
    name: 'Drones & Robotics',
    description:
      'Drones, robotics kits and intelligent devices.',
    liveCategorySlugs: [],
    keywords: ['drone', 'robot', 'robotics'],
    future: true,
  },
]

function buildCategorySearchUrl(
  slugs: string[]
) {
  const params = new URLSearchParams()

  for (const slug of slugs) {
    params.append('category', slug)
  }

  return params.size > 0
    ? `/shop?${params.toString()}`
    : '/categories'
}

export function resolveMarketplaceDepartments(
  liveCategories: WooCategory[]
): ResolvedMarketplaceDepartment[] {
  const liveMap = new Map(
    liveCategories.map((category) => [
      category.slug.toLowerCase(),
      category,
    ])
  )

  return marketplaceDepartments.map(
    (department) => {
      const categories =
        department.liveCategorySlugs
          .map((slug) =>
            liveMap.get(slug.toLowerCase())
          )
          .filter(
            (
              category
            ): category is WooCategory =>
              Boolean(category)
          )

      return {
        ...department,
        categories,
        productCount: categories.reduce(
          (total, category) =>
            total +
            category.productCount,
          0
        ),
        available: categories.length > 0,
        url: buildCategorySearchUrl(
          categories.map(
            (category) =>
              category.slug
          )
        ),
      }
    }
  )
}
