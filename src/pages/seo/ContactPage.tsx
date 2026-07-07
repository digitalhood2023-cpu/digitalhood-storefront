import { Link } from 'react-router-dom'
import { ChevronRight, Clock, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

const contactCards = [
  {
    icon: Phone,
    title: 'Phone',
    value: '+260 971 047 570',
    helper: 'Mon-Sat, 8am-6pm',
    href: 'tel:+260971047570',
  },
  {
    icon: Mail,
    title: 'Email',
    value: 'contact@digitalhood.info',
    helper: 'We reply as soon as possible',
    href: 'mailto:contact@digitalhood.info',
  },
  {
    icon: MapPin,
    title: 'Location',
    value: 'Lusaka, Zambia',
    helper: 'DigitalHood Marketplace',
  },
  {
    icon: Clock,
    title: 'Business Hours',
    value: 'Monday - Saturday',
    helper: '8:00 AM - 6:00 PM',
  },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-dh-dark-gray">
            <Link to="/" className="hover:text-dh-primary">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-dh-primary">Contact Us</span>
          </nav>

          <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-dh-primary via-[#1d1a78] to-[#0f0d3d] p-5 text-white shadow-sm sm:p-7 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-dh-secondary">
                  <ShieldCheck className="h-4 w-4" />
                  Secure contact form
                </div>

                <h1 className="font-display text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  Contact DigitalHood Zambia
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                  Send us your question, quotation request, order inquiry, or seller support message.
                  Our WordPress WPForms contact form is protected with reCAPTCHA V2.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
                <p className="text-sm font-bold text-dh-secondary">Need quick help?</p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  Call us directly or use the form below. Required fields are Name, Email,
                  Phone Number, and Message.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contactCards.map((card) => {
              const Icon = card.icon
              const content = (
                <div className="h-full rounded-3xl bg-white p-5 shadow-sm ring-1 ring-dh-light-gray transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-wide text-dh-dark-gray">
                    {card.title}
                  </p>
                  <p className="mt-1 break-words font-display text-lg font-black text-dh-primary">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-dh-dark-gray">{card.helper}</p>
                </div>
              )

              return card.href ? (
                <a key={card.title} href={card.href}>
                  {content}
                </a>
              ) : (
                <div key={card.title}>{content}</div>
              )
            })}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <aside className="rounded-[2rem] bg-dh-gray p-5 sm:p-7">
              <h2 className="font-display text-2xl font-black text-dh-primary">
                Send us a message
              </h2>
              <p className="mt-3 text-sm leading-7 text-dh-dark-gray">
                This form is connected to the official WordPress WPForms form on digitalhood.info,
                so your submissions go through the same spam protection, notifications, and entries.
              </p>

              <div className="mt-5 rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-sm font-black text-dh-primary">Form protection</p>
                <p className="mt-2 text-sm leading-6 text-dh-dark-gray">
                  reCAPTCHA V2 is active. Complete the CAPTCHA before submitting.
                </p>
              </div>
            </aside>

            <div className="overflow-hidden rounded-[2rem] bg-white p-3 shadow-sm ring-1 ring-dh-light-gray sm:p-5">
              <iframe
                title="DigitalHood contact form"
                src="https://digitalhood.info/?digitalhood_contact_embed=1"
                className="h-[820px] w-full rounded-2xl border-0 bg-white"
                loading="lazy"
              />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
