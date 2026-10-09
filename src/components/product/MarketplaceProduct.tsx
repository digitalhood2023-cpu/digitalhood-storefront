import { createElement, useId, useMemo, useRef, type ReactNode } from 'react'
import { extractDescriptionSpecificationRows, mergeProductSpecificationRows } from './productSpecifications'
import './marketplace-product.css'

// Version 1: keep this file and its CSS byte-identical across all three apps.
export function MarketplaceProductLayout({ title, gallery, galleryFooter, children }: {
  title: ReactNode; gallery: ReactNode; galleryFooter?: ReactNode; children: ReactNode
}) {
  return <div className="dh-product-layout" data-product-template="digitalhood-v1">
    <section className="product-image dh-product-gallery"><div className="dh-product-title">{title}</div>{gallery}{galleryFooter}</section>
    <section className="product-info dh-product-info">{children}</section>
  </div>
}

export function MarketplaceSellerStrip({ name, avatar, avatarContent, nameContent, feedback, actions }: {
  name: string; avatar?: string; avatarContent?: ReactNode; nameContent?: ReactNode; feedback?: string; actions?: ReactNode
}) {
  return <div className="dh-product-seller">
    <span className="dh-product-avatar">{avatarContent || (avatar ? <img src={avatar} alt={name} loading="lazy" /> : name.slice(0, 2).toUpperCase())}</span>
    <div className="dh-product-seller-name"><strong>{nameContent || name}</strong>{feedback && <small>{feedback}</small>}</div>
    <div className="dh-product-seller-actions">{actions}</div>
  </div>
}

export function MarketplaceProductOffer({ price, regularPrice, shipping, meta }: {
  price: ReactNode; regularPrice?: ReactNode; shipping?: ReactNode; meta?: ReactNode
}) {
  return <div className="dh-product-offer"><div className="dh-product-price"><strong>{price}</strong>{regularPrice && <del>{regularPrice}</del>}{shipping}</div>{meta && <div className="dh-product-meta">{meta}</div>}</div>
}

const tabs = [['description', 'Description'], ['details', 'Details'], ['trust', 'Trust/Feedback']] as const
export function MarketplaceProductTabs({ value, onChange, description, details, trust }: {
  value: string; onChange: (value: string) => void; description: ReactNode; details: ReactNode; trust: ReactNode
}) {
  const id = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  return <div className="dh-product-tabs">
    <div role="tablist" aria-label="Product information" className="dh-product-tablist">
      {tabs.map(([key, label], index) => <button type="button" key={key} ref={(node) => { refs.current[index] = node }} role="tab"
        id={id + key} aria-controls={id + 'panel'} aria-selected={value === key} tabIndex={value === key ? 0 : -1}
        onClick={() => onChange(key)} onKeyDown={(event) => {
          const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1
          if (next < 0) return
          event.preventDefault(); onChange(tabs[next][0]); refs.current[next]?.focus()
        }}>{label}</button>)}
    </div>
    <div role="tabpanel" id={id + 'panel'} aria-labelledby={id + value} className="dh-product-tabpanel">
      {value === 'details' ? details : value === 'trust' ? trust : description}
    </div>
  </div>
}

// Render a narrow HTML allowlist as React nodes, never seller-provided executable HTML.
export function ProductDescription({ html }: { html: string }) {
  const content = useMemo(() => {
    if (!html) return 'No description added yet.'
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const allowed = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'H2', 'H3', 'H4', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH', 'DL', 'DT', 'DD', 'BLOCKQUOTE', 'SPAN', 'DIV', 'A', 'IMG'])
    const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA'])
    let remaining = 4000
    function walk(node: Node, key: string, depth: number): ReactNode {
      if (--remaining < 0 || depth > 30) return null
      if (node.nodeType === Node.TEXT_NODE) return node.textContent
      if (!(node instanceof Element) || blocked.has(node.tagName)) return null
      const children = Array.from(node.childNodes).map((child, index) => walk(child, key + '-' + index, depth + 1))
      if (!allowed.has(node.tagName)) return children
      const props: Record<string, unknown> = { key }
      if (node.tagName === 'A' || node.tagName === 'IMG') {
        const url = node.getAttribute(node.tagName === 'A' ? 'href' : 'src') || ''
        if (!/^(https?:\/\/|\/(?!\/))/i.test(url)) return children
        if (node.tagName === 'A') Object.assign(props, { href: url, target: '_blank', rel: 'noopener noreferrer' })
        else Object.assign(props, { src: url, alt: node.getAttribute('alt') || 'Product detail', loading: 'lazy', decoding: 'async' })
      }
      return createElement(node.tagName.toLowerCase(), props, node.tagName === 'IMG' || node.tagName === 'BR' ? undefined : children)
    }
    return Array.from(doc.body.childNodes).map((node, index) => walk(node, String(index), 0))
  }, [html])
  return <div className="dh-product-description">{content}</div>
}

export type PreviewProduct = {
  name: string; sellerStoreName?: string; mainImage?: string; images?: string[]; regularPrice?: string; salePrice?: string
  stockQuantity?: number; condition?: string; sku?: string; category?: string; brand?: string; productType?: string
  description?: string; shortDescription?: string; weight?: string | number
  dimensions?: { length?: string | number; width?: string | number; height?: string | number }
  attributes?: Array<{ name: string; value: string }>
  variationOptions?: Array<{ name: string; values: string[] }>
  variations?: Array<{ id: string; enabled?: boolean; attributes?: Record<string, string>; sku?: string; regularPrice?: string; salePrice?: string; stockQuantity?: number; condition?: string; image?: string }>
}
export function ProductSpecifications({ product, overrides = {} }: { product: PreviewProduct; overrides?: Record<string, string> }) {
  const selected = new Map(Object.entries(overrides).map(([name, value]) => [name.trim().toLowerCase(), value]))
  const rows = mergeProductSpecificationRows(
    Object.entries(overrides).map(([label, value]) => ({ label, value })),
    (product.attributes || []).map((row) => ({ label: row.name, value: row.value })),
    [
      { label: 'Brand', value: product.brand || '' }, { label: 'Condition', value: product.condition || '' }, { label: 'SKU', value: product.sku || '' },
      { label: 'Category', value: product.category || '' }, { label: 'Weight', value: String(product.weight || '') },
      { label: 'Dimensions', value: product.dimensions ? [product.dimensions.length, product.dimensions.width, product.dimensions.height].filter(Boolean).join(' × ') : '' },
    ],
    extractDescriptionSpecificationRows(product.description || '')
  ).map((row) => selected.has(row.label.toLowerCase()) ? { ...row, value: selected.get(row.label.toLowerCase())! } : row)
  return <><h2 className="dh-product-section-title">Item specifications</h2>{rows.length ? <dl className="dh-product-specs">{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl> : <p>No specifications added yet.</p>}</>
}
