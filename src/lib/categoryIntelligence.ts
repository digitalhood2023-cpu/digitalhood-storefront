import type { WooCategory } from '@/lib/woocommerce'

export type CategoryVisual = {
  image: string
  tone: string
  label: string
}

const categoryImageRules: Array<{
  keywords: string[]
  image: string
  tone: string
  label: string
  demandBoost: number
}> = [
  {
    keywords: ['adapter', 'adaptor', 'charger adapter', 'wall charger', 'plug'],
    image:
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=1000&h=720&fit=crop&q=95',
    tone: 'from-orange-950/85 via-orange-800/30 to-transparent',
    label: 'Power essentials',
    demandBoost: 72,
  },
  {
    keywords: ['adhesive', 'glue', 'tape', 'repair adhesive', 'seal'],
    image:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&h=720&fit=crop&q=95',
    tone: 'from-slate-950/85 via-slate-700/30 to-transparent',
    label: 'Repair supplies',
    demandBoost: 52,
  },
  {
    keywords: ['battery', 'batteries', 'phone battery', 'replacement battery'],
    image:
      'https://images.unsplash.com/photo-1609592806596-b43bada2f569?w=1000&h=720&fit=crop&q=95',
    tone: 'from-emerald-950/85 via-emerald-700/30 to-transparent',
    label: 'Power & replacement',
    demandBoost: 82,
  },
  {
    keywords: ['bluetooth', 'speaker', 'wireless speaker'],
    image:
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=1000&h=720&fit=crop&q=95',
    tone: 'from-indigo-950/85 via-indigo-700/30 to-transparent',
    label: 'Wireless audio',
    demandBoost: 68,
  },
  {
    keywords: ['cable', 'cables', 'usb cable', 'charging cable', 'type c', 'type-c', 'lightning', 'data cable'],
    image:
      'https://images.unsplash.com/photo-1619362513491-3d00ec2467bb?w=1000&h=720&fit=crop&q=95',
    tone: 'from-blue-950/85 via-blue-700/30 to-transparent',
    label: 'Everyday essentials',
    demandBoost: 86,
  },
  {
    keywords: ['earphone', 'earphones', 'earbud', 'earbuds', 'headphone', 'headphones', 'audio'],
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&h=720&fit=crop&q=95',
    tone: 'from-yellow-950/85 via-yellow-700/30 to-transparent',
    label: 'Sound & audio',
    demandBoost: 74,
  },
  {
    keywords: ['screen protector', 'protector', 'tempered glass', 'glass protector'],
    image:
      'https://images.unsplash.com/photo-1604671368394-2240d0b1bb6c?w=1000&h=720&fit=crop&q=95',
    tone: 'from-cyan-950/85 via-cyan-700/30 to-transparent',
    label: 'Phone protection',
    demandBoost: 78,
  },
  {
    keywords: ['cover', 'case', 'phone case', 'back cover', 'silicone case', 'accessories'],
    image:
      'https://images.unsplash.com/photo-1601593346740-925612772716?w=1000&h=720&fit=crop&q=95',
    tone: 'from-purple-950/85 via-purple-700/30 to-transparent',
    label: 'Protection & style',
    demandBoost: 80,
  },
  {
    keywords: ['smartphone', 'smartphones', 'phone', 'phones', 'mobile phone', 'mobile phones', 'phone parts', 'smartphone parts'],
    image:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1000&h=720&fit=crop&q=95',
    tone: 'from-dh-primary/90 via-dh-primary/35 to-transparent',
    label: 'Most browsed',
    demandBoost: 95,
  },
  {
    keywords: ['iphone', 'apple'],
    image:
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=1000&h=720&fit=crop&q=95',
    tone: 'from-zinc-950/85 via-zinc-700/30 to-transparent',
    label: 'Apple picks',
    demandBoost: 88,
  },
  {
    keywords: ['samsung', 'galaxy'],
    image:
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=1000&h=720&fit=crop&q=95',
    tone: 'from-blue-950/85 via-blue-700/30 to-transparent',
    label: 'Galaxy picks',
    demandBoost: 84,
  },
  {
    keywords: ['laptop', 'laptops', 'computer', 'computers', 'macbook', 'notebook', 'pc', 'pc parts'],
    image:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1000&h=720&fit=crop&q=95',
    tone: 'from-slate-950/85 via-slate-700/30 to-transparent',
    label: 'Work & productivity',
    demandBoost: 70,
  },
  {
    keywords: ['tablet', 'tablets', 'ipad', 'e-reader', 'e reader'],
    image:
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=1000&h=720&fit=crop&q=95',
    tone: 'from-stone-950/85 via-stone-700/30 to-transparent',
    label: 'Portable screens',
    demandBoost: 58,
  },
  {
    keywords: ['camera', 'cameras', 'photography'],
    image:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1000&h=720&fit=crop&q=95',
    tone: 'from-neutral-950/85 via-neutral-700/30 to-transparent',
    label: 'Camera gear',
    demandBoost: 42,
  },
  {
    keywords: ['tv', 'television', 'home theater', 'home theatre', 'monitor', 'display'],
    image:
      'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1000&h=720&fit=crop&q=95',
    tone: 'from-violet-950/85 via-violet-700/30 to-transparent',
    label: 'Home entertainment',
    demandBoost: 46,
  },
  {
    keywords: ['game', 'gaming', 'console', 'playstation', 'xbox'],
    image:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1000&h=720&fit=crop&q=95',
    tone: 'from-fuchsia-950/85 via-fuchsia-700/30 to-transparent',
    label: 'Gaming zone',
    demandBoost: 55,
  },
  {
    keywords: ['watch', 'smartwatch', 'smart watch', 'wearable'],
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&h=720&fit=crop&q=95',
    tone: 'from-amber-950/85 via-amber-700/30 to-transparent',
    label: 'Wearable tech',
    demandBoost: 50,
  },
  {
    keywords: ['power bank', 'powerbank', 'portable charger', 'power pack'],
    image:
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=1000&h=720&fit=crop&q=95',
    tone: 'from-green-950/85 via-green-700/30 to-transparent',
    label: 'Backup power',
    demandBoost: 76,
  },
  {
    keywords: ['repair', 'spare', 'spares', 'parts', 'replacement', 'tools', 'tool'],
    image:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&h=720&fit=crop&q=95',
    tone: 'from-gray-950/85 via-gray-700/30 to-transparent',
    label: 'Repair & parts',
    demandBoost: 64,
  },
  {
    keywords: ['deal', 'deals', 'sale', 'offers', 'discount'],
    image:
      'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=1000&h=720&fit=crop&q=95',
    tone: 'from-red-950/85 via-red-700/30 to-transparent',
    label: 'Value deals',
    demandBoost: 66,
  },
]

const defaultCategoryVisuals: CategoryVisual[] = [
  {
    image:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1000&h=720&fit=crop&q=95',
    tone: 'from-dh-primary/90 via-dh-primary/30 to-transparent',
    label: 'Popular department',
  },
  {
    image:
      'https://images.unsplash.com/photo-1619362513491-3d00ec2467bb?w=1000&h=720&fit=crop&q=95',
    tone: 'from-blue-950/85 via-blue-700/30 to-transparent',
    label: 'Daily essentials',
  },
  {
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&h=720&fit=crop&q=95',
    tone: 'from-yellow-950/85 via-yellow-700/30 to-transparent',
    label: 'Trending picks',
  },
  {
    image:
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=1000&h=720&fit=crop&q=95',
    tone: 'from-indigo-950/85 via-indigo-700/30 to-transparent',
    label: 'Customer interest',
  },
]

function normalizeCategoryText(value = '') {
  return value
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSearchableText(category: WooCategory) {
  return `${normalizeCategoryText(category.slug)} ${normalizeCategoryText(
    category.name
  )} ${normalizeCategoryText(category.description)}`
}

function getMatchingRule(category: WooCategory) {
  const searchableText = getSearchableText(category)

  return categoryImageRules.find((rule) =>
    rule.keywords.some((keyword) =>
      searchableText.includes(normalizeCategoryText(keyword))
    )
  )
}

function readLocalInterestText() {
  if (typeof window === 'undefined') return ''

  const keys = [
    'digitalhood-recently-viewed',
    'digitalhood-search-history',
    'digitalhood-shop-searches',
    'digitalhood-wishlist',
  ]

  return keys
    .map((key) => {
      try {
        return window.localStorage.getItem(key) || ''
      } catch {
        return ''
      }
    })
    .join(' ')
    .toLowerCase()
}

function getCustomerInterestBoost(category: WooCategory, interestText: string) {
  if (!interestText) return 0

  const words = [
    normalizeCategoryText(category.name),
    normalizeCategoryText(category.slug),
    ...normalizeCategoryText(category.name)
      .split(' ')
      .filter((word) => word.length >= 4),
  ]

  return words.reduce((score, word) => {
    if (!word) return score
    return interestText.includes(word) ? score + 35 : score
  }, 0)
}

export function getCategoryVisual(
  category: WooCategory,
  index: number
): CategoryVisual {
  const currentImage = String(category.image || '')

  if (
    currentImage &&
    !currentImage.includes('/logo.jpg') &&
    !currentImage.endsWith('logo.jpg')
  ) {
    const rule = getMatchingRule(category)
    return {
      image: currentImage,
      tone: rule?.tone || defaultCategoryVisuals[index % defaultCategoryVisuals.length].tone,
      label: rule?.label || 'Featured department',
    }
  }

  const rule = getMatchingRule(category)

  if (rule) {
    return {
      image: rule.image,
      tone: rule.tone,
      label: rule.label,
    }
  }

  return defaultCategoryVisuals[index % defaultCategoryVisuals.length]
}

export function getCategoryDemandScore(
  category: WooCategory,
  interestText = readLocalInterestText()
) {
  const rule = getMatchingRule(category)
  const productCountScore = Math.min(Number(category.productCount || 0), 120)
  const interestScore = getCustomerInterestBoost(category, interestText)

  return productCountScore + (rule?.demandBoost || 20) + interestScore
}

export function sortCategoriesForMarketplace(categories: WooCategory[]) {
  const interestText = readLocalInterestText()

  return [...categories].sort((a, b) => {
    const scoreDifference =
      getCategoryDemandScore(b, interestText) -
      getCategoryDemandScore(a, interestText)

    if (scoreDifference !== 0) return scoreDifference

    return Number(b.productCount || 0) - Number(a.productCount || 0)
  })
}

export function getCategoryInsightLabel(category: WooCategory, index: number) {
  const visual = getCategoryVisual(category, index)

  if (getCategoryDemandScore(category) >= 145) return 'High demand'
  if (Number(category.productCount || 0) >= 20) return 'Popular'
  return visual.label
}
