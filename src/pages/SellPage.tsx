import { Link } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, ClipboardList, CreditCard, MessageCircle, Store } from 'lucide-react'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import content from '../../config/sell-page.json'
import './SellPage.css'

const benefitIcons = [Store, ClipboardList, CreditCard, MessageCircle]

export default function SellPage() {
  return (
    <div className="dh-sell-page flex min-h-[100svh] flex-col">
      <Header />
      <main id="main-content" className="dh-sell-wrap">
        <nav aria-label="Breadcrumb" className="dh-sell-breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><span>Sell on DigitalHood</span></nav>
        <section className="dh-sell-hero" aria-labelledby="sell-title">
          <div>
            <p className="dh-sell-eyebrow">{content.eyebrow}</p>
            <h1 id="sell-title">{content.heading}</h1>
            <p className="dh-sell-tagline">{content.tagline}</p>
            <p className="dh-sell-copy">{content.intro}</p>
            <div className="dh-sell-actions">
              <a className="dh-sell-primary" href={content.registerUrl}>Start selling <ArrowRight size={16} aria-hidden="true" /></a>
              <a className="dh-sell-secondary" href={content.loginUrl}>Seller sign in</a>
            </div>
            <p className="dh-sell-note">Seller and product approval required. Already selling? Sign in to your existing account.</p>
          </div>
          <aside className="dh-sell-start" aria-label="Your seller journey">
            <Store size={23} className="dh-sell-accent" aria-hidden="true" />
            <h2>A single seller application</h2>
            <p>{content.applicationNote}</p>
            <Link to="/shops">Explore marketplace stores <ArrowRight size={14} aria-hidden="true" /></Link>
          </aside>
        </section>
        <section aria-labelledby="sell-benefits-title" className="dh-sell-section">
          <div className="dh-sell-section-heading"><h2 id="sell-benefits-title">Made for your day-to-day business</h2><span>Connected from listing to order</span></div>
          <div className="dh-sell-benefits">{content.benefits.map((benefit, index) => {
            const Icon = benefitIcons[index]
            return <article key={benefit.title} className="dh-sell-card"><Icon size={20} className="dh-sell-accent" aria-hidden="true" /><h3>{benefit.title}</h3><p>{benefit.text}</p></article>
          })}</div>
        </section>
        <div className="dh-sell-details-grid">
          <section aria-labelledby="sell-steps-title" className="dh-sell-panel"><h2 id="sell-steps-title">From application to your first listing</h2><ol className="dh-sell-steps">{content.steps.map((step, index) => <li key={step.title}><span className="dh-sell-step-number" aria-hidden="true">{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></section>
          <section aria-labelledby="sell-ready-title" className="dh-sell-panel"><h2 id="sell-ready-title">Before you apply</h2><ul className="dh-sell-checklist">{content.requirements.map(item => <li key={item}><Check size={16} className="dh-sell-accent" aria-hidden="true" /><span>{item}</span></li>)}</ul><nav className="dh-sell-policy-links" aria-label="Seller guidance"><Link to="/seller-terms">Seller terms</Link><Link to="/prohibited-products">Restricted products</Link><Link to={content.supportUrl}>Ask seller support</Link></nav></section>
        </div>
        <section className="dh-sell-panel dh-sell-faq" aria-labelledby="sell-faq-title"><h2 id="sell-faq-title">A few things worth knowing</h2>{content.faqs.map(faq => <details key={faq.question}><summary>{faq.question}<ChevronDown size={16} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</section>
        <section className="dh-sell-finish" aria-label="Start your seller application"><div><h2>Let’s build your next chapter.</h2><p>Bring your business to DigitalHood. Start with your seller application.</p></div><a className="dh-sell-primary" href={content.registerUrl}>Start selling <ArrowRight size={16} aria-hidden="true" /></a></section>
      </main>
      <Footer />
    </div>
  )
}
