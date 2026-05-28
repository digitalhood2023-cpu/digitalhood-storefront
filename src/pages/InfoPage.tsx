import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Mail, Phone, ShieldCheck } from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'

const pageContent: Record<
  string,
  {
    title: string
    eyebrow: string
    description: string
    sections: Array<{ title: string; text: string }>
  }
> = {
  '/help': {
    eyebrow: 'Customer support',
    title: 'Help centre',
    description: 'Find quick help for shopping, orders, delivery, payments and account support.',
    sections: [
      { title: 'Orders and checkout', text: 'Use your account and order pages to review purchases, payment status and order details.' },
      { title: 'Product support', text: 'Check product pages carefully for descriptions, stock status, prices and available options.' },
      { title: 'Need help?', text: 'Contact DigitalHood using the phone or email shown below and our team will assist you.' },
    ],
  },
  '/faqs': {
    eyebrow: 'Questions',
    title: 'Frequently asked questions',
    description: 'Answers to common DigitalHood marketplace questions.',
    sections: [
      { title: 'How do I place an order?', text: 'Browse products, add available items to cart, then complete checkout securely.' },
      { title: 'Can I track my order?', text: 'Yes. Use the Track Order page or your account order history.' },
      { title: 'Can I sell on DigitalHood?', text: 'Yes. Sellers apply through seller.digitalhood.info and must be approved first.' },
    ],
  },
  '/shipping': {
    eyebrow: 'Delivery',
    title: 'Shipping information',
    description: 'Delivery and pickup options for DigitalHood orders.',
    sections: [
      { title: 'Delivery coverage', text: 'DigitalHood is building reliable delivery support across Zambia, starting with key customer locations.' },
      { title: 'Delivery fees', text: 'Delivery fees may depend on product, location and order type. Final details are shown during checkout or order support.' },
      { title: 'Order updates', text: 'Use your order page or Track Order page to follow order progress.' },
    ],
  },
  '/returns': {
    eyebrow: 'After sales',
    title: 'Returns and refunds',
    description: 'How returns and refund support works on DigitalHood.',
    sections: [
      { title: 'Return request', text: 'Contact DigitalHood support with your order details and reason for return.' },
      { title: 'Product condition', text: 'Returned items should be in the condition required for the specific product and issue.' },
      { title: 'Refund handling', text: 'Approved refunds are handled according to the payment method and marketplace review.' },
    ],
  },
  '/warranty': {
    eyebrow: 'Protection',
    title: 'Warranty policy',
    description: 'Warranty support depends on the product, supplier and listed warranty terms.',
    sections: [
      { title: 'Check product details', text: 'Warranty information should be reviewed on the product page or confirmed with support.' },
      { title: 'Keep order records', text: 'Your DigitalHood order record helps verify purchase details for support.' },
      { title: 'Support review', text: 'Warranty claims are reviewed based on product terms and issue details.' },
    ],
  },
  '/terms': {
    eyebrow: 'Legal',
    title: 'Terms and conditions',
    description: 'DigitalHood marketplace terms for customers, sellers and visitors.',
    sections: [
      { title: 'Marketplace use', text: 'Use DigitalHood responsibly and provide accurate account, order and contact information.' },
      { title: 'Orders and payments', text: 'Orders are subject to product availability, pricing, payment confirmation and marketplace checks.' },
      { title: 'Updates', text: 'DigitalHood may update marketplace policies as services expand.' },
    ],
  },
  '/privacy': {
    eyebrow: 'Legal',
    title: 'Privacy policy',
    description: 'How DigitalHood handles customer account, order and marketplace information.',
    sections: [
      { title: 'Data we use', text: 'We use account, order and contact information to provide marketplace services and support.' },
      { title: 'Account protection', text: 'Keep your account details secure and contact support if you suspect unauthorized access.' },
      { title: 'Support', text: 'Contact us for privacy-related questions or account support.' },
    ],
  },
  '/cookies': {
    eyebrow: 'Legal',
    title: 'Cookie policy',
    description: 'How cookies and local storage support the DigitalHood shopping experience.',
    sections: [
      { title: 'Shopping experience', text: 'Cookies and local storage may help remember cart, wishlist, recently viewed products and preferences.' },
      { title: 'Analytics and performance', text: 'DigitalHood may use privacy-conscious tools to improve speed, reliability and customer experience.' },
      { title: 'Browser control', text: 'You can manage cookies through your browser settings.' },
    ],
  },
  '/sitemap': {
    eyebrow: 'Navigate',
    title: 'Sitemap',
    description: 'Main DigitalHood pages and marketplace links.',
    sections: [
      { title: 'Marketplace', text: 'Home, Shop, Categories, Wishlist, Recently Viewed, Cart and Checkout.' },
      { title: 'Account', text: 'Login, Register, Account, Orders and Track Order.' },
      { title: 'Support', text: 'Help, FAQs, Shipping, Returns, Warranty, Contact and Legal pages.' },
    ],
  },
  '/blog': {
    eyebrow: 'DigitalHood updates',
    title: 'Blog',
    description: 'Marketplace news, product guides and DigitalHood updates will appear here.',
    sections: [
      { title: 'Buying guides', text: 'Helpful guides for phones, laptops, accessories and digital products.' },
      { title: 'Marketplace updates', text: 'DigitalHood feature updates, seller news and customer improvements.' },
      { title: 'Coming soon', text: 'The blog foundation is ready and can be expanded with real posts later.' },
    ],
  },
}

export default function InfoPage() {
  const location = useLocation()
  const content = pageContent[location.pathname] || pageContent['/help']

  return (
    <div className="min-h-screen bg-dh-gray">
      <SEO title={content.title} description={content.description} path={location.pathname} />
      <Header />

      <main className="py-8 lg:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <section className="overflow-hidden rounded-3xl bg-dh-primary text-white shadow-sm">
            <div className="p-6 md:p-10">
              <p className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-dh-secondary">
                {content.eyebrow}
              </p>
              <h1 className="font-display text-3xl font-bold md:text-5xl">
                {content.title}
              </h1>
              <p className="mt-4 max-w-3xl text-white/75">
                {content.description}
              </p>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {content.sections.map((section) => (
              <article key={section.title} className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-dh-secondary/20 text-dh-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="font-display text-xl font-bold text-dh-primary">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-dh-dark-gray">
                  {section.text}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-dh-primary">
                  Need direct support?
                </h2>
                <p className="mt-1 text-sm text-dh-dark-gray">
                  Contact DigitalHood and we’ll help with your marketplace request.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="tel:+260971047570"
                  className="inline-flex items-center rounded-full bg-dh-primary px-5 py-3 text-sm font-semibold text-white"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  +260971047570
                </a>
                <a
                  href="mailto:contact@digitalhood.info"
                  className="inline-flex items-center rounded-full border border-dh-primary px-5 py-3 text-sm font-semibold text-dh-primary"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  contact@digitalhood.info
                </a>
                <Link
                  to="/shop"
                  className="inline-flex items-center rounded-full bg-dh-secondary px-5 py-3 text-sm font-semibold text-dh-primary"
                >
                  Continue shopping
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
