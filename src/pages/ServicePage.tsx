import { lazy, Suspense } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, Check, MapPin, Package, Phone, RefreshCw, ShieldCheck, Wrench } from 'lucide-react'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'
import { marketplaceServices } from '@/lib/services'
import content from '../../config/services.json'
import './service-pages.css'

const AccessoryExplorer = lazy(() => import('@/components/services/AccessoryExplorer'))
const icons = { repair: Wrench, accessories: Package, swaps: RefreshCw }

export default function ServicePage({ kind }: { kind: string }) {
  const service = marketplaceServices.find(item => item.id === kind)
  if (!service) return <Navigate to="/help" replace />
  const Icon = icons[kind as keyof typeof icons]
  const requestPath = `${service.path}/request`
  return <>
    <Header />
    <main id="main-content" className="dh-services-page">
      <SEO title={`${service.title} in Zambia | DigitalHood`} description={service.description} path={service.path} />
      <div className="dh-services-wrap">
        <nav className="dh-service-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><span>{service.title}</span></nav>
        <nav className="dh-service-tabs" aria-label="DigitalHood services">{marketplaceServices.map(item => <Link key={item.id} to={item.path} aria-current={item.id === kind ? 'page' : undefined}>{item.title}</Link>)}</nav>
        <section className="dh-service-hero">
          <div><p className="dh-service-eyebrow">{service.eyebrow}</p><h1>{service.heading}</h1><p>{service.intro}</p><div className="dh-service-actions">
            {kind === 'accessories' ? <a className="dh-service-primary" href="#accessory-catalogue">Browse accessories <ArrowRight /></a> : <Link className="dh-service-primary" to={requestPath}>{service.action} <ArrowRight /></Link>}
            <Link className="dh-service-secondary" to={kind === 'accessories' ? requestPath : '/account/support-cases'}>{kind === 'accessories' ? service.action : 'Follow my enquiry'}</Link>
          </div></div>
          <aside className="dh-service-hero-note"><span className="dh-service-icon"><Icon aria-hidden="true" /></span><strong>{kind === 'accessories' ? 'Check the fit. Then checkout.' : 'Clear next steps. No guesswork.'}</strong><p>{kind === 'accessories' ? 'Real catalogue listings. Confirm the model, specification and seller before buying.' : 'Your enquiry creates a support case. Assessment, availability and any costs are confirmed by the team.'}</p><span><ShieldCheck /> {kind === 'swaps' ? 'Inspection before any offer' : kind === 'repair' ? 'Quote before approved work' : 'Keep payments on DigitalHood'}</span></aside>
        </section>
        {kind === 'accessories' && <Suspense fallback={<p role="status">Loading accessory catalogue…</p>}><AccessoryExplorer /></Suspense>}
        <section className="dh-service-panel-grid" aria-label={`${service.title} guidance`}>{service.panels.map(panel => <article className="dh-service-panel" key={panel.title}><h2>{panel.title}</h2><p>{panel.text}</p></article>)}</section>
        <div className="dh-service-detail-grid">
          <div className="dh-service-main-stack">
            <section className="dh-service-panel"><h2>How it works</h2><ol className="dh-service-steps">{service.steps.map((step,index) => <li key={step.title}><span aria-hidden="true">{index+1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></section>
            <section className="dh-service-panel"><h2>{kind === 'accessories' ? 'Before you buy' : 'Before your assessment'}</h2><ul className="dh-service-checklist">{service.checklist.map(item => <li key={item}><Check aria-hidden="true" /><span>{item}</span></li>)}</ul></section>
            <section className="dh-service-panel dh-service-faq"><h2>Good questions. Clear answers.</h2>{service.faqs.map(faq => <details key={faq.q}><summary>{faq.q}</summary><p>{faq.a}</p></details>)}</section>
          </div>
          <aside className="dh-service-side-stack">
            <section className="dh-service-panel dh-service-enquire"><span className="dh-service-eyebrow">Let us help</span><h2>{kind === 'accessories' ? 'Not sure which one fits?' : 'Ready for the next step?'}</h2><p>{service.requestIntro}</p><Link className="dh-service-primary" to={requestPath}>{service.action} <ArrowRight /></Link><Link className="dh-service-text-link" to="/support/track">Track a case with email + reference</Link></section>
            <section className="dh-service-panel"><h2>Find DigitalHood in Lusaka</h2><p>Contact us to confirm assessment arrangements and branch availability before visiting.</p>{content.locations.map(location => <div className="dh-service-location" key={location.name}><h3><MapPin /> {location.name}</h3><address>{location.address}</address><a href={location.map} target="_blank" rel="noopener noreferrer">Open exact map pin ↗</a></div>)}<a className="dh-service-text-link" href="tel:+260971047570"><Phone /> +260 971 047 570</a></section>
            <section className="dh-service-panel"><h2>Already bought an item?</h2><p>Returns, refunds and warranty claims belong to the original purchase—not a new repair or trade-in enquiry.</p><nav className="dh-service-policy-links" aria-label="Order and service help"><Link to="/orders">Open my orders</Link><Link to="/returns">7-day returns & refunds</Link><Link to="/warranty">Warranty & repairs</Link><Link to="/support">Support Center</Link></nav></section>
          </aside>
        </div>
      </div>
    </main>
    <Footer />
  </>
}
