import { BadgeCheck, RefreshCw, Star } from 'lucide-react'
import { ProductDescription } from './MarketplaceProduct'
import type { useProductFeedback } from './useProductFeedback'
import './marketplace-product-feedback.css'

export function MarketplaceProductFeedback({ feedback }: { feedback: ReturnType<typeof useProductFeedback> }) {
  const { productId, data, loading, error, refresh, loadMore } = feedback
  return <section className="dh-product-feedback" aria-label="Verified buyer feedback" aria-busy={loading}>
    <div className="dh-product-feedback-heading"><h2 className="dh-product-section-title">Verified buyer feedback</h2>{productId && <button type="button" onClick={refresh} disabled={loading}><RefreshCw />{loading ? 'Updating…' : 'Refresh feedback'}</button>}</div>
    {!productId ? <p>Buyer feedback will appear here after this listing is published and receives verified purchase reviews.</p> : <>
      <p className="dh-product-feedback-note">Live feedback from the published marketplace listing.</p>
      {data && data.count > 0 && <p className="dh-product-feedback-summary"><span className="dh-product-signal dh-product-signal--rating"><Star />{data.averageRating.toFixed(1)} out of 5</span><span>{data.count} verified purchase review{data.count === 1 ? '' : 's'}</span></p>}
      {loading && !data && <p role="status">Loading buyer feedback…</p>}
      {error && <div role="alert" className="dh-product-feedback-error"><p>{error}{data && ' Previously loaded feedback is shown below.'}</p><button type="button" onClick={refresh}>Retry feedback</button></div>}
      {!loading && !error && data?.count === 0 && <p>No verified purchase feedback has been posted for this product yet.</p>}
      {data?.reviews.map(review => <article key={review.id} className="dh-product-feedback-card">
        <div className="dh-product-feedback-heading"><strong>{review.reviewer}</strong><span className="dh-product-verified"><BadgeCheck />Verified purchase</span></div>
        <p className="dh-product-feedback-stars" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={index < review.rating ? 'is-filled' : ''} />)}</p>
        {review.title && <strong>{review.title}</strong>}
        {review.review && <ProductDescription html={review.review} />}
        {review.media.length > 0 && <div className="dh-product-feedback-media">{review.media.map((media, index) => media.type === 'image' ? <a key={media.url} href={media.url} target="_blank" rel="noopener noreferrer"><img src={media.url} alt={`Buyer photo ${index + 1}`} loading="lazy" /></a> : <video key={media.url} controls preload="none" src={media.url} aria-label="Buyer feedback video" />)}</div>}
        {review.response && <blockquote><strong>Seller response</strong><p>{review.response}</p></blockquote>}
      </article>)}
      {data && data.page < data.pages && <button type="button" onClick={loadMore} disabled={loading}>{loading ? 'Loading…' : 'Load more feedback'}</button>}
    </>}
  </section>
}
