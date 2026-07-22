import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import SEO from '@/components/SEO'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import {
  MARKETPLACE_POLICY_PAGES,
  MARKETPLACE_POLICY_LINKS,
} from '@/lib/marketplacePolicies'

export default function MarketplacePolicyPage() {
  const location = useLocation()
  const policySlug = location.pathname.replace(/^\/+|\/+$/g, '')
  const policy = MARKETPLACE_POLICY_PAGES[policySlug]

  if (!policy) {
    return <Navigate to="/marketplace-terms" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="min-h-screen bg-slate-50">
      <SEO
        title={`${policy.title} | DigitalHood Marketplace Zambia`}
        description={policy.subtitle}
        path={`/${policy.slug}`}
      />

      <section className="bg-[#26248c] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm font-bold text-white/90 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to marketplace
          </Link>

          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black uppercase tracking-[0.22em] text-[#ffb54a]">
                <ShieldCheck className="h-4 w-4" />
                Trust & Safety
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
                {policy.title}
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-white/80">
                {policy.subtitle}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-bold text-white/85">
              Last updated: {policy.lastUpdated}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              Marketplace policies
            </h2>
            <nav className="mt-4 space-y-2">
              {MARKETPLACE_POLICY_LINKS.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    item.href === `/${policy.slug}`
                      ? 'bg-[#26248c] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </aside>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-8">
              {policy.sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-2xl font-black text-slate-950">
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
              <strong>Important:</strong> These marketplace policies are an
              operational foundation for DigitalHood. They should be reviewed by
              a qualified legal professional before being treated as final legal
              advice or used for high-risk enforcement.
            </div>
          </article>
        </div>
      </section>
      </main>

      <Footer />
    </div>
  )
}
