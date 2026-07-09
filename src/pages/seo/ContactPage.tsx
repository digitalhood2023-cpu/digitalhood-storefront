import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Clock3,
  LifeBuoy,
  Mail,
  MapPin,
  PackageSearch,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react'

import SEO from '@/components/SEO'

const contactCards = [
  {
    icon: Phone,
    label: 'Phone',
    value: '+260 971 047 570',
    href: 'tel:+260971047570',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'contact@digitalhood.info',
    href: 'mailto:contact@digitalhood.info',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Lusaka, Zambia',
    href: null,
  },
]

const supportCards = [
  {
    icon: Send,
    title: 'Create support case',
    text: 'Get help with orders, payments, delivery, warranty, returns, quotations, seller support and marketplace issues.',
    href: '/support',
    cta: 'Open Support Center',
  },
  {
    icon: PackageSearch,
    title: 'Track existing case',
    text: 'Already contacted us? Use your case number and email to check status and DigitalHood replies.',
    href: '/support/track',
    cta: 'Track Case',
  },
]

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f8ff] via-white to-[#fff7ec]/60">
      <SEO
        title="Contact DigitalHood Zambia | Support Center"
        description="Contact DigitalHood Marketplace Zambia or create and track a support case for orders, payments, delivery, warranty, returns, quotations and seller support."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-12">
        <div className="overflow-hidden rounded-[2rem] bg-[#26248c] text-white shadow-2xl shadow-[#26248c]/15">
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_380px] lg:p-8">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#ffb54a]">
                <LifeBuoy className="h-4 w-4" />
                DigitalHood Contact & Support
              </p>

              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-5xl">
                Need help? Start from the DigitalHood Support Center.
              </h1>

              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/72">
                For marketplace support, every message should create a trackable support case. This helps DigitalHood follow up professionally with case numbers, status updates and email replies.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/support"
                  className="inline-flex items-center gap-2 rounded-full bg-[#ffb54a] px-5 py-3 text-sm font-black text-[#26248c] transition hover:bg-white"
                >
                  Create support case
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/support/track"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white hover:text-[#26248c]"
                >
                  Track existing case
                  <PackageSearch className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <aside className="rounded-[1.5rem] bg-white/10 p-5 ring-1 ring-white/10">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
                Support workflow
              </p>
              <div className="mt-4 space-y-3">
                {[
                  ['1', 'Create a case from /support'],
                  ['2', 'Keep your case number'],
                  ['3', 'Track status using email + case number'],
                  ['4', 'DigitalHood replies from the admin desk'],
                ].map(([step, text]) => (
                  <div key={step} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffb54a] text-xs font-black text-[#26248c]">
                      {step}
                    </span>
                    <p className="text-xs font-bold leading-5 text-white/72">{text}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-10 lg:grid-cols-2 lg:px-6">
        {supportCards.map((card) => {
          const Icon = card.icon

          return (
            <Link
              key={card.title}
              to={card.href}
              className="group rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#26248c] text-[#ffb54a]">
                <Icon className="h-6 w-6" />
              </span>

              <h2 className="mt-5 text-2xl font-black text-[#26248c]">{card.title}</h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{card.text}</p>

              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#fff7ec] px-4 py-2 text-xs font-black text-[#7a4a00] transition group-hover:bg-[#ffb54a] group-hover:text-[#26248c]">
                {card.cta}
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          )
        })}
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-12 lg:grid-cols-[1fr_420px] lg:px-6">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            <Building2 className="h-4 w-4 text-[#ffb54a]" />
            Direct business contact
          </p>

          <h2 className="mt-3 text-2xl font-black text-[#26248c]">
            For business, quotations and partnerships.
          </h2>

          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            For formal quotations, partnerships, tenders or company inquiries, you can still contact DigitalHood directly. For customer support, use the Support Center so the request is tracked.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {contactCards.map((card) => {
              const Icon = card.icon
              const content = (
                <div className="rounded-2xl bg-slate-50 p-4 transition hover:bg-[#fff7ec]">
                  <Icon className="h-5 w-5 text-[#26248c]" />
                  <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    {card.label}
                  </p>
                  <p className="mt-1 break-words text-sm font-black text-slate-800">
                    {card.value}
                  </p>
                </div>
              )

              return card.href ? (
                <a key={card.label} href={card.href}>
                  {content}
                </a>
              ) : (
                <div key={card.label}>{content}</div>
              )
            })}
          </div>
        </div>

        <aside className="rounded-[2rem] bg-[#fff7ec] p-6 ring-1 ring-[#ffb54a]/25">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#7a4a00]/60">
            <ShieldCheck className="h-4 w-4" />
            Why support cases?
          </p>

          <h3 className="mt-3 text-2xl font-black text-[#7a4a00]">
            Better tracking for every customer.
          </h3>

          <div className="mt-5 space-y-3">
            {[
              'You receive a DigitalHood case number.',
              'Our admin team can update status and priority.',
              'Replies are saved against the case and sent by email.',
              'You can track the case later using your email address.',
            ].map((item) => (
              <p key={item} className="flex gap-2 text-sm font-bold leading-6 text-[#7a4a00]/80">
                <CheckIcon />
                <span>{item}</span>
              </p>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-black text-[#26248c]">
              <Clock3 className="h-4 w-4 text-[#ffb54a]" />
              Support response
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Our team reviews marketplace support cases from the DigitalHood admin support desk.
            </p>
          </div>
        </aside>
      </section>
    </main>
  )
}

function CheckIcon() {
  return (
    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ffb54a] text-[#26248c]">
      <ShieldCheck className="h-3 w-3" />
    </span>
  )
}
