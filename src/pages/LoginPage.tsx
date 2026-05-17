import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import GoogleSignInButton from '@/components/account/GoogleSignInButton'

import {
  loginCustomerAccount,
  loginCustomerWithGoogle,
} from '@/api/account'

import { useAccount } from '@/context/AccountContext'

function getRedirectPath(search: string) {
  const params = new URLSearchParams(search)
  const redirect = params.get('redirect')

  if (!redirect) return '/account'

  if (!redirect.startsWith('/')) return '/account'
  if (redirect.startsWith('//')) return '/account'

  return redirect
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSession } = useAccount()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const redirectPath = getRedirectPath(location.search)

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage('')

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your password.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await loginCustomerAccount({
        email: email.trim(),
        password,
      })

      setSession(response.token, response.customer)
      navigate(redirectPath)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to sign in. Please check your details and try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setErrorMessage('')
      setIsGoogleSubmitting(true)

      try {
        const response = await loginCustomerWithGoogle(credential)

        setSession(response.token, response.customer)
        navigate(redirectPath)
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to continue with Google. Please try again.'
        )
      } finally {
        setIsGoogleSubmitting(false)
      }
    },
    [navigate, redirectPath, setSession]
  )

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

            <span className="font-medium text-dh-primary">Sign in</span>
          </nav>

          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8 lg:p-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
                <LockKeyhole className="h-4 w-4" />
                Secure customer login
              </div>

              <h1 className="font-display text-3xl font-bold text-dh-primary lg:text-4xl">
                Welcome back to DigitalHood
              </h1>

              <p className="mt-3 text-dh-dark-gray">
                Sign in to view your orders, saved delivery details, wishlist,
                and faster checkout.
              </p>

              <div className="mt-8 rounded-2xl border border-dh-light-gray bg-dh-gray/40 p-4">
                <GoogleSignInButton
                  mode="login"
                  disabled={isGoogleSubmitting || isSubmitting}
                  onCredential={handleGoogleCredential}
                />
              </div>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-dh-light-gray" />
                <span className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                  or sign in with email
                </span>
                <div className="h-px flex-1 bg-dh-light-gray" />
              </div>

              {errorMessage && (
                <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="grid gap-4">
                <div>
                  <Label htmlFor="email">Email address</Label>

                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />

                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="password">Password</Label>

                    <Link
                      to="/forgot-password"
                      className="text-sm font-semibold text-dh-primary hover:text-dh-secondary"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative mt-1">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />

                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Your password"
                      className="pl-10 pr-11"
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dh-dark-gray hover:text-dh-primary"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="mt-2 h-12 rounded-full bg-dh-primary text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSubmitting ? (
                    'Signing in...'
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-dh-dark-gray">
                New to DigitalHood?{' '}
                <Link
                  to={`/register${location.search || ''}`}
                  className="font-semibold text-dh-primary hover:text-dh-secondary"
                >
                  Create an account
                </Link>
              </p>
            </section>

            <section className="overflow-hidden rounded-3xl bg-dh-primary text-white">
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                  <UserRound className="h-8 w-8 text-dh-secondary" />
                </div>

                <h2 className="font-display text-3xl font-bold">
                  Your DigitalHood account makes shopping easier.
                </h2>

                <p className="mt-4 text-white/80">
                  Save time at checkout, track your purchases, manage your
                  delivery details, and keep your favorite products in one place.
                </p>

                <div className="mt-8 grid gap-4">
                  <div className="flex gap-3 rounded-2xl bg-white/10 p-4">
                    <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                    <div>
                      <p className="font-semibold">Order history</p>
                      <p className="text-sm text-white/70">
                        See your orders, delivery progress, and expected delivery
                        dates.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-2xl bg-white/10 p-4">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                    <div>
                      <p className="font-semibold">Google sign-in</p>
                      <p className="text-sm text-white/70">
                        Continue quickly and securely with your Google account.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-2xl bg-white/10 p-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                    <div>
                      <p className="font-semibold">Protected customer session</p>
                      <p className="text-sm text-white/70">
                        Your account stays private and connected only to your
                        DigitalHood shopping experience.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-2xl bg-white/10 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                    <div>
                      <p className="font-semibold">Faster checkout</p>
                      <p className="text-sm text-white/70">
                        Use saved customer details for future orders.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
