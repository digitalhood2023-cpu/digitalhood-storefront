import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Box,
  ChevronRight,
  Heart,
  LockKeyhole,
  Mail,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserRound,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

import { Button } from '@/components/ui/button'

const WORDPRESS_ACCOUNT_URL = 'https://digitalhood.info/my-account/'
const WORDPRESS_REGISTER_URL = 'https://digitalhood.info/my-account/'
const WORDPRESS_GOOGLE_LOGIN_URL = 'https://digitalhood.info/my-account/'
const WORDPRESS_LOST_PASSWORD_URL =
  'https://digitalhood.info/my-account/lost-password/'

function AccountActionCard({
  icon,
  title,
  description,
  href,
  buttonText,
  external = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  buttonText: string
  external?: boolean
}) {
  const className =
    'group rounded-3xl border border-dh-light-gray bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-xl'

  const content = (
    <>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
        {icon}
      </div>

      <h3 className="font-display text-lg font-bold text-dh-primary">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-dh-dark-gray">
        {description}
      </p>

      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-dh-primary">
        {buttonText}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </>
  )

  if (external) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    )
  }

  return (
    <Link to={href} className={className}>
      {content}
    </Link>
  )
}

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-dh-gray">
      <Header />

      <main className="py-8 lg:py-12">
        <div className="container mx-auto px-4">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-dh-dark-gray">
            <Link to="/" className="hover:text-dh-primary">
              Home
            </Link>

            <ChevronRight className="h-4 w-4" />

            <span className="font-medium text-dh-primary">My Account</span>
          </nav>

          <section className="overflow-hidden rounded-3xl bg-white">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
                  <UserRound className="h-4 w-4" />
                  DigitalHood Account
                </div>

                <h1 className="font-display text-3xl font-bold leading-tight text-dh-primary lg:text-5xl">
                  Your marketplace account, orders, and wishlist in one place.
                </h1>

                <p className="mt-4 max-w-2xl text-dh-dark-gray">
                  Sign in or create an account using your DigitalHood account.
                  Google login is handled securely through DigitalHood&apos;s
                  WordPress account system.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href={WORDPRESS_ACCOUNT_URL}>
                    <Button className="h-12 rounded-full bg-dh-primary px-7 text-white hover:bg-dh-secondary">
                      <LockKeyhole className="mr-2 h-5 w-5" />
                      Sign in to account
                    </Button>
                  </a>

                  <a href={WORDPRESS_GOOGLE_LOGIN_URL}>
                    <Button
                      variant="outline"
                      className="h-12 rounded-full border-dh-primary px-7 text-dh-primary hover:bg-dh-primary hover:text-white"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Continue with Google
                    </Button>
                  </a>
                </div>

                <div className="mt-5 flex flex-wrap gap-4 text-sm text-dh-dark-gray">
                  <a
                    href={WORDPRESS_REGISTER_URL}
                    className="font-semibold text-dh-primary hover:text-dh-secondary"
                  >
                    Create account
                  </a>

                  <a
                    href={WORDPRESS_LOST_PASSWORD_URL}
                    className="font-semibold text-dh-primary hover:text-dh-secondary"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              <div className="bg-dh-primary p-6 text-white sm:p-8 lg:p-10">
                <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
                  <ShieldCheck className="mb-5 h-12 w-12 text-dh-secondary" />

                  <h2 className="font-display text-2xl font-bold">
                    Secure customer access
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed text-white/80">
                    We keep account login on DigitalHood&apos;s WordPress system
                    so Google login, registration, and password management stay
                    secure and compatible with WooCommerce.
                  </p>

                  <div className="mt-7 grid gap-4 text-sm">
                    <div className="flex gap-3">
                      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                      <div>
                        <p className="font-semibold">Google login ready</p>
                        <p className="text-white/70">
                          Uses your existing Nextend Social Login setup.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                      <div>
                        <p className="font-semibold">WooCommerce compatible</p>
                        <p className="text-white/70">
                          Works with your existing customer/order system.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Mail className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                      <div>
                        <p className="font-semibold">Email support ready</p>
                        <p className="text-white/70">
                          WPForms can be connected later for account support.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <AccountActionCard
              icon={<PackageCheck className="h-6 w-6" />}
              title="Track an order"
              description="Check payment, processing, shipping, delivery, and expected delivery date."
              href="/track-order"
              buttonText="Track order"
            />

            <AccountActionCard
              icon={<Box className="h-6 w-6" />}
              title="My WooCommerce account"
              description="View your WordPress/WooCommerce account dashboard, orders, and details."
              href={WORDPRESS_ACCOUNT_URL}
              buttonText="Open account"
              external
            />

            <AccountActionCard
              icon={<Heart className="h-6 w-6" />}
              title="Wishlist"
              description="View products you saved while shopping on DigitalHood."
              href="/wishlist"
              buttonText="View wishlist"
            />

            <AccountActionCard
              icon={<MapPin className="h-6 w-6" />}
              title="Saved addresses"
              description="Address management is coming soon for faster checkout and delivery."
              href="/account"
              buttonText="Coming soon"
            />
          </section>

          <section className="mt-8 rounded-3xl bg-white p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <h2 className="font-display text-2xl font-bold text-dh-primary">
                  What we are building next
                </h2>

                <p className="mt-3 text-dh-dark-gray">
                  This is the foundation for full customer accounts on the React
                  storefront. We will keep improving it step by step without
                  breaking the working checkout and payment flow.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  'React account dashboard',
                  'My orders inside storefront',
                  'Saved delivery addresses',
                  'Persistent wishlist for logged-in users',
                  'Account support form',
                  'Delivery notifications',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl bg-dh-gray p-4 text-sm font-semibold text-dh-primary"
                  >
                    <BadgeCheck className="h-5 w-5 shrink-0 text-dh-secondary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}