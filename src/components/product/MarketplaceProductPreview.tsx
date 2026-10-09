import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Image as ImageIcon, MessageCircle, Shield, ShoppingCart, Star, Truck, X, Zap, ZoomIn, ZoomOut } from 'lucide-react'
import { usePointZoom } from '../../hooks/usePointZoom'
import { MarketplaceProductLayout, MarketplaceSellerStrip, MarketplaceProductOffer, MarketplaceProductTabs, ProductDescription, ProductSpecifications, type PreviewProduct } from './MarketplaceProduct'

// Version 1: identical preview in admin and seller; no commerce mutations.
function productMoney(value?: string | number) {
  const amount = Number(String(value || 0).replace(/,/g, ''))
  return 'K' + (Number.isFinite(amount) ? amount : 0).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
export function MarketplaceProductPreview({ product, sellerName, sellerAvatar }: { product: PreviewProduct; sellerName?: string; sellerAvatar?: string }) {
  const [tab, setTab] = useState('description')
  const [selectedImage, setSelectedImage] = useState('')
  const [variantId, setVariantId] = useState('')
  const [viewer, setViewer] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const priorFocus = useRef<HTMLElement | null>(null)
  const variations = product.productType === 'variable' ? (product.variations || []).filter((item) => item.enabled !== false) : []
  const variation = variations.find((item) => item.id === variantId) || variations[0]
  const images = [...new Set([variation?.image, product.mainImage, ...(product.images || [])].filter((item): item is string => Boolean(item)))]
  const image = images.includes(selectedImage) ? selectedImage : images[0]
  const stock = variation?.stockQuantity ?? product.stockQuantity ?? 0
  const regularPrice = variation?.regularPrice ?? product.regularPrice
  const salePrice = variation?.salePrice ?? product.salePrice
  const validSale = Number(salePrice) > 0 && Number(salePrice) < Number(regularPrice)
  function moveImage(offset: number) {
    if (images.length) setSelectedImage(images[(images.indexOf(image) + offset + images.length) % images.length])
  }
  const { viewportRef, viewportProps, imageRef, imageStyle, zoomIn, zoomOut, reset } = usePointZoom({ resetKey: viewer + ':' + image, onSwipeLeft: () => moveImage(1), onSwipeRight: () => moveImage(-1) })
  useEffect(() => {
    if (!viewer) return
    priorFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewer(false)
      if (event.key === 'Tab') {
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.dh-product-lightbox button'))
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        event.preventDefault(); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus()
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); priorFocus.current?.focus() }
  }, [viewer])
  return <>
    <MarketplaceProductLayout title={<h1>{product.name || 'Your product title'}</h1>} gallery={
      <div className="dh-product-photo">
        {image ? <button type="button" className="dh-product-photo-open" onClick={() => setViewer(true)} aria-label="Open product photo"><img src={image} alt={product.name || 'Product photo'} decoding="async" /><span>Tap to view</span></button> : <div className="dh-product-no-photo"><ImageIcon />Add product photos</div>}
        <span className={'dh-product-stock ' + (stock > 0 ? 'is-instock' : 'is-outofstock')}>{stock > 0 ? stock + ' in stock' : 'Out of stock'}</span>
        {images.length > 1 && <><button type="button" className="dh-product-prev" onClick={() => moveImage(-1)} aria-label="Previous product image"><ChevronLeft /></button><button type="button" className="dh-product-next" onClick={() => moveImage(1)} aria-label="Next product image"><ChevronRight /></button><span className="dh-product-photo-count">{images.indexOf(image) + 1} / {images.length}</span></>}
      </div>
    } galleryFooter={<div className="dh-product-dots">{images.map((url, index) => <button type="button" key={url} className={url === image ? 'is-active' : ''} onClick={() => setSelectedImage(url)} aria-label={'Show product image ' + (index + 1)} aria-pressed={url === image} />)}</div>}>
      <MarketplaceSellerStrip name={sellerName || product.sellerStoreName || 'Your store'} avatar={sellerAvatar} actions={<><button type="button" disabled>Visit store</button><button type="button" disabled><MessageCircle />Chat</button></>} />
      <MarketplaceProductOffer price={productMoney(validSale ? salePrice : regularPrice)} regularPrice={validSale ? productMoney(regularPrice) : undefined}
        shipping={<small><Truck />Delivery confirmed at checkout</small>} meta={<><span><Star />Buyer ratings appear after verified purchases</span>{product.category && <span>{product.category}</span>}</>} />
      {variations.length > 0 && <label className="dh-product-variant"><strong>Available variations</strong><select aria-label="Preview variation" value={variation?.id || ''} onChange={(event) => { setVariantId(event.target.value); setSelectedImage('') }}>{variations.map((item) => <option key={item.id} value={item.id}>{Object.values(item.attributes || {}).join(' / ') || item.id}</option>)}</select></label>}
      <div className="dh-product-purchase" aria-label="Inactive buyer actions"><button type="button" disabled><ShoppingCart />Add to Cart</button><button type="button" disabled><Zap />Buy it Now</button></div>
      <div className="dh-product-assurance"><span><Truck />Zambia delivery</span><span><Shield />Secure checkout</span></div>
      <MarketplaceProductTabs value={tab} onChange={setTab} description={<ProductDescription html={product.description || product.shortDescription || ''} />}
        details={<ProductSpecifications product={{ ...product, sku: variation?.sku || product.sku, condition: variation?.condition || product.condition, attributes: [...Object.entries(variation?.attributes || {}).map(([name, value]) => ({ name, value })), ...(product.attributes || [])] }} />}
        trust={<><h2 className="dh-product-section-title">Verified buyer feedback</h2><p>Feedback is attached to the published product and seller. It is not generated for a draft preview.</p></>} />
    </MarketplaceProductLayout>
    {viewer && image && <div className="dh-product-lightbox" role="dialog" aria-modal="true" aria-label="Product image viewer" onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); moveImage(-1) }
        if (event.key === 'ArrowRight') { event.preventDefault(); moveImage(1) }
        if (event.key === '+' || event.key === '=') zoomIn()
        if (event.key === '-') zoomOut()
        if (event.key === '0') reset()
      }}>
      <div className="dh-product-lightbox-controls"><button type="button" ref={closeRef} onClick={() => setViewer(false)} aria-label="Close image viewer"><X /></button><button type="button" onClick={zoomOut} aria-label="Zoom out"><ZoomOut /></button><button type="button" onClick={zoomIn} aria-label="Zoom in"><ZoomIn /></button>
        <button type="button" onClick={() => moveImage(-1)} aria-label="Previous photo"><ChevronLeft /></button><button type="button" onClick={() => moveImage(1)} aria-label="Next photo"><ChevronRight /></button></div>
      <div ref={viewportRef} {...viewportProps} className="dh-product-zoom"><img ref={imageRef} src={image} alt={product.name} style={imageStyle} draggable={false} /></div>
    </div>}
  </>
}
