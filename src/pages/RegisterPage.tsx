import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  Mail,
  PackageCheck,
  Phone,
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
  loginCustomerWithGoogle,
  registerCustomerAccount,
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

function getPasswordStrength(password: string) {
  let score = 0

  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (!password) {
    return {
      label: '',
      tone: 'bg-gray-200',
      score: 0,
    }
  }

  if (score <= 2) {
    return {
      label: 'Weak',
      tone: 'bg-red-500',
      score,
    }
  }

  if (score <= 4) {
    return {
      label: 'Good',
      tone: 'bg-yellow-500',
      score,
    }
  }

  return {
    label: 'Strong',
    tone: 'bg-green-600',
    score,
  }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSession } = useAccount()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const redirectPath = getRedirectPath(location.search)
  const passwordStrength = getPasswordStrength(formData.password)

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      return 'Please enter your first name.'
    }

    if (!formData.lastName.trim()) {
      return 'Please enter your last name.'
    }

    if (!formData.email.trim()) {
      return 'Please enter your email address.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      return 'Please enter a valid email address.'
    }

    if (!formData.phone.trim()) {
      return 'Please enter your phone number.'
    }

    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long.'
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match.'
    }

    if (!acceptTerms) {
      return 'Please accept the account terms to continue.'
    }

    return ''
  }

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage('')

    const validationError = validateForm()

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await registerCustomerAccount({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        billing: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          country: 'ZM',
        },
        shipping: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          country: 'ZM',
        },
      })

      setSession(response.token, response.customer)
      navigate(redirectPath)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create your account. Please try again.'
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

            <span className="font-medium text-dh-primary">
              Create Account
            </span>
          </nav>

          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8 lg:p-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
                <UserRound className="h-4 w-4" />
                Create your DigitalHood account
              </div>

              <h1 className="font-display text-3xl font-bold text-dh-primary lg:text-4xl">
                Join DigitalHood
              </h1>

              <p className="mt-3 text-dh-dark-gray">
                Create your customer account to manage orders, saved addresses,
                wishlist, and faster checkout.
              </p>

              <div className="mt-8 rounded-2xl border border-dh-light-gray bg-dh-gray/40 p-4">
                <GoogleSignInButton
                  mode="register"
                  disabled={isGoogleSubmitting || isSubmitting}
                  onCredential={handleGoogleCredential}
                />
              </div>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-dh-light-gray" />
                <span className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                  or create with email
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

              <form onSubmit={handleRegister} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName">First name</Label>

                    <div className="relative mt-1">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />

                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(event) =>
                          updateField('firstName', event.target.value)
                        }
                        placeholder="First name"
                        className="pl-10"
                        autoComplete="given-name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last name</Label>

                    <div className="relative mt-1">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />

                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(event) =>
                          updateField('lastName', event.target.value)
                        }
                        placeholder="Last name"
                        className="pl-10"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email address</Label>

                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />

                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        updateField('email', event.target.value)
                      }
                      placeholder="you@example.com"
                      className="pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone number</Label>

                  <div className="relative mt-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />

                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(event) =>
                        updateField('phone', event.target.value)
                      }
                      placeholder="+260 97X XXX XXX"
                      className="pl-10"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>

                  <div className="relative mt-1">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />

                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(event) =>
                        updateField('password', event.target.value)
                      }
                      placeholder="At least 8 characters"
                      className="pl-10 pr-11"
                      autoComplete="new-password"
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

                  {formData.password && (
                    <div className="mt-2">
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full transition-all ${passwordStrength.tone}`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(20, passwordStrength.score * 20)
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="mt-1 text-xs text-dh-dark-gray">
                        Password strength:{' '}
                        <span className="font-semibold">
                          {passwordStrength.label}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm password</Label>

                  <div className="relative mt-1">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />

                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(event) =>
                        updateField('confirmPassword', event.target.value)
                      }
                      placeholder="Repeat your password"
                      className="pl-10 pr-11"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dh-dark-gray hover:text-dh-primary"
                      aria-label={
                        showConfirmPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-dh-gray p-4 text-sm text-dh-dark-gray">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-dh-light-gray text-dh-primary"
                  />

                  <span>
                    I agree to create a DigitalHood customer account and receive
                    order, delivery, and account updates related to my purchases.
                  </span>
                </label>

                <Button
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="mt-2 h-12 rounded-full bg-dh-primary text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSubmitting ? (
                    'Creating account...'
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-dh-dark-gray">
                Already have an account?{' '}
                <Link
                  to={`/login${location.search || ''}`}
                  className="font-semibold text-dh-primary hover:text-dh-secondary"
                >
                  Sign in
                </Link>
              </p>
            </section>

            <section className="overflow-hidden rounded-3xl bg-dh-primary text-white">
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                  <Sparkles className="h-8 w-8 text-dh-secondary" />
                </div>

                <h2 className="font-display text-3xl font-bold">
                  Built for faster shopping and better delivery.
                </h2>

                <p className="mt-4 text-white/80">
                  Your customer account keeps your buying journey simple,
                  organized, and secure across DigitalHood.
                </p>

                <div className="mt-8 grid gap-4">
                  <div className="flex gap-3 rounded-2xl bg-white/10 p-4">
                    <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                    <div>
                      <p className="font-semibold">Your orders</p>
                      <p className="text-sm text-white/70">
                        View purchase history, order progress, and delivery
                        estimates.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-2xl bg-white/10 p-4">
                    <Heart className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                    <div>
                      <p className="font-semibold">Saved wishlist</p>
                      <p className="text-sm text-white/70">
                        Keep products you love and return to them later.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-2xl bg-white/10 p-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                    <div>
                      <p className="font-semibold">Secure account</p>
                      <p className="text-sm text-white/70">
                        Your account session is protected and private.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-2xl bg-white/10 p-4">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                    <div>
                      <p className="font-semibold">Faster checkout</p>
                      <p className="text-sm text-white/70">
                        Save customer and delivery information for future orders.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-2xl bg-white/10 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                    <div>
                      <p className="font-semibold">Buyer confidence</p>
                      <p className="text-sm text-white/70">
                        Know what you bought, when it is coming, and where it is
                        in the delivery process.
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
