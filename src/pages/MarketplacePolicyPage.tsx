import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import SEO from '@/components/SEO'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import { MARKETPLACE_POLICY_PAGES, MARKETPLACE_POLICY_LINKS } from '@/lib/marketplacePolicies'

const surface = { background: 'var(--dh-ui-surface)', borderColor: 'var(--dh-ui-border)' }
const muted = { color: 'var(--dh-ui-text-muted)' }
const supportUrl = '/contact?type=SELLER_SUPPORT&subject=Seller%20support'

export default function MarketplacePolicyPage() {
  const location = useLocation()
  const policy = MARKETPLACE_POLICY_PAGES[location.pathname.replace(/^\/+|\/+$/g, '')]
  if (!policy) return <Navigate to="/marketplace-terms" replace />
  const sellerPolicy = ['seller-terms', 'prohibited-products'].includes(policy.slug)

  return <div className="dh-policy-page flex min-h-[100svh] flex-col" style={{ background: 'var(--dh-ui-page)', color: 'var(--dh-ui-text)' }}>
    <Header />
    <main id="main-content" className="dh-policy-wrap mx-auto w-full max-w-6xl px-3 py-4 sm:px-5">
      <SEO title={`${policy.title} | DigitalHood Marketplace Zambia`} description={policy.subtitle} path={`/${policy.slug}`} />
      <Link to={sellerPolicy ? '/sell' : '/'} className="inline-flex items-center gap-1.5 text-xs" style={muted}><ArrowLeft size={14} aria-hidden="true" />{sellerPolicy ? 'Seller guide' : 'Marketplace'}</Link>
      <header className="flex flex-wrap items-start justify-between gap-2 py-4">
        <div><p className="flex items-center gap-1.5 text-xs font-bold"><ShieldCheck size={14} aria-hidden="true" /> Marketplace policies</p><h1 className="my-2 text-2xl font-black sm:text-3xl">{policy.title}</h1><p className="max-w-3xl text-sm leading-6" style={muted}>{policy.subtitle}</p></div>
        <span className="text-xs" style={muted}>Policy updated {policy.lastUpdated}</span>
      </header>
      <div className="grid items-start gap-3 lg:grid-cols-[215px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-24"><nav aria-label="Marketplace policies" className="flex gap-1 overflow-x-auto lg:flex-col">{MARKETPLACE_POLICY_LINKS.map(item => <Link key={item.href} to={item.href} aria-current={item.href === `/${policy.slug}` ? 'page' : undefined} className={`shrink-0 rounded-lg px-3 py-2.5 text-xs font-bold lg:whitespace-normal ${item.href === `/${policy.slug}` ? 'bg-[#26248c] text-white' : 'whitespace-nowrap'}`}>{item.name}</Link>)}</nav></aside>
        <article className="dh-policy-body min-w-0 rounded-2xl border p-4 sm:p-5" style={surface}>
          {policy.highlights && <section aria-label="At a glance" className="rounded-xl p-3" style={{ background: 'var(--dh-ui-surface-muted)' }}><h2 className="text-sm font-extrabold">At a glance</h2><ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-6" style={muted}>{policy.highlights.map(item => <li key={item}>{item}</li>)}</ul></section>}
          <details className="mt-3 text-xs"><summary className="cursor-pointer font-bold">Jump to a section</summary><nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-2 py-3">{policy.sections.map((section, index) => <a key={section.title} href={`#policy-section-${index + 1}`} className="underline underline-offset-4">{section.title}</a>)}</nav></details>
          {policy.sections.map((section, index) => <section key={section.title} id={`policy-section-${index + 1}`} className="dh-policy-section scroll-mt-40 border-b py-4" style={{ borderColor: 'var(--dh-ui-border)' }}><h2 className="text-sm font-extrabold">{section.title}</h2>{section.body.map(paragraph => <p key={paragraph} className="mt-2 text-[13px] leading-7" style={muted}>{paragraph}</p>)}</section>)}
          <section className="flex flex-wrap items-center justify-between gap-3 pt-4"><div className="max-w-xl"><h2 className="text-sm font-extrabold">{sellerPolicy ? 'Not sure about a listing or responsibility?' : 'Need help with this policy?'}</h2><p className="mt-2 text-[13px] leading-6" style={muted}>{sellerPolicy ? 'Ask before listing. Tell us the product or seller question; never include passwords, PINs or full card details.' : 'Tell us which policy and situation you need help with. For an existing order, use its linked order support.'}</p></div><Link to={sellerPolicy ? supportUrl : '/contact'} className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold" style={{ borderColor: 'var(--dh-ui-border)' }}>{sellerPolicy ? 'Ask seller support' : 'Contact support'}<ArrowRight size={14} aria-hidden="true" /></Link></section>
        </article>
      </div>
    </main>
    <Footer />
  </div>
}
