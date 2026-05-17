import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Heart,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Save,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useAccount } from '@/context/AccountContext'

import {
  getCustomerOrders,
  updateCustomerProfile,
  type AccountOrder,
} from '@/api/account'

function formatPrice(amount?: string | number, currency = 'ZMW') {
  const value = Number(amount || 0)

  if (currency === 'ZMW') {
    return `K${value.toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(date?: string | null) {
  if (!date) return 'Not available'

  try {
    return new Intl.DateTimeFormat('en-ZM', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date))
  } catch {
    return date
  }
}

function getStatusStyle(status?: string) {
  const value = String(status || '')
    .toLowerCase()
    .replace(/^wc-/, '')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')

  if (value === 'processing') {
    return 'bg-blue-50 text-blue-700 border-blue-100'
  }

  if (value === 'shipped') {
    return 'bg-purple-50 text-purple-700 border-purple-100'
  }

  if (value === 'out-for-delivery' || value === 'outfordelivery') {
    return 'bg-orange-50 text-orange-700 border-orange-100'
  }

  if (value === 'delivered' || value === 'completed') {
    return 'bg-green-50 text-green-700 border-green-100'
  }

  if (value === 'pending' || value === 'on-hold') {
    return 'bg-yellow-50 text-yellow-700 border-yellow-100'
  }

  if (value === 'failed' || value === 'cancelled' || value === 'refunded') {
    return 'bg-red-50 text-red-700 border-red-100'
  }

  return 'bg-gray-50 text-gray-700 border-gray-100'
}

function DashboardCard({
  icon,
  label,
  value,
  helper,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  helper: string
  href?: string
}) {
  const content = (
    <div className="rounded-3xl bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
        {icon}
      </div>

      <p className="text-sm font-medium text-dh-dark-gray">{label}</p>

      <p className="mt-1 font-display text-2xl font-bold text-dh-primary">
        {value}
      </p>

      <p className="mt-2 text-sm text-dh-dark-gray">{helper}</p>
    </div>
  )

  if (href) {
    return <Link to={href}>{content}</Link>
  }

  return content
}

export default function AccountPage() {
  const navigate = useNavigate()
  const {
    customer,
    isAuthenticated,
    isLoading,
    updateCustomerInState,
    logout,
  } = useAccount()

  const [orders, setOrders] = useState<AccountOrder[]>([])
  const [isOrdersLoading, setIsOrdersLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    billingAddress1: '',
    billingAddress2: '',
    billingCity: '',
    billingProvince: '',
    billingPostcode: '',
    shippingAddress1: '',
    shippingAddress2: '',
    shippingCity: '',
    shippingProvince: '',
    shippingPostcode: '',
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login?redirect=/account')
    }
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (!customer) return

    setFormData({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      phone: customer.billing?.phone || '',
      billingAddress1: customer.billing?.address1 || '',
      billingAddress2: customer.billing?.address2 || '',
      billingCity: customer.billing?.city || '',
      billingProvince: customer.billing?.province || '',
      billingPostcode: customer.billing?.postcode || '',
      shippingAddress1: customer.shipping?.address1 || '',
      shippingAddress2: customer.shipping?.address2 || '',
      shippingCity: customer.shipping?.city || '',
      shippingProvince: customer.shipping?.province || '',
      shippingPostcode: customer.shipping?.postcode || '',
    })
  }, [customer])

  useEffect(() => {
    if (!isAuthenticated) return

    let mounted = true

    async function loadOrders() {
      setIsOrdersLoading(true)

      try {
        const response = await getCustomerOrders()

        if (mounted) {
          setOrders(response.orders || [])
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load your orders right now.'
          )
        }
      } finally {
        if (mounted) {
          setIsOrdersLoading(false)
        }
      }
    }

    loadOrders()

    return () => {
      mounted = false
    }
  }, [isAuthenticated])

  const displayName = useMemo(() => {
    if (!customer) return ''

    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim()

    return fullName || customer.email
  }, [customer])

  const recentOrders = orders.slice(0, 3)
  const wishlistCount = customer?.wishlistProductIds?.length || 0

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    if (!formData.firstName.trim()) {
      setErrorMessage('First name is required.')
      return
    }

    if (!formData.lastName.trim()) {
      setErrorMessage('Last name is required.')
      return
    }

    setIsSaving(true)

    try {
      const response = await updateCustomerProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        billing: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: customer?.email || '',
          phone: formData.phone.trim(),
          address1: formData.billingAddress1.trim(),
          address2: formData.billingAddress2.trim(),
          city: formData.billingCity.trim(),
          province: formData.billingProvince.trim(),
          postcode: formData.billingPostcode.trim(),
          country: 'ZM',
        },
        shipping: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          address1: formData.shippingAddress1.trim(),
          address2: formData.shippingAddress2.trim(),
          city: formData.shippingCity.trim(),
          province: formData.shippingProvince.trim(),
          postcode: formData.shippingPostcode.trim(),
          country: 'ZM',
        },
      })

      updateCustomerInState(response.customer)
      setSuccessMessage('Your account details have been updated.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update your account details.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyBillingToShipping = () => {
    setFormData((current) => ({
      ...current,
      shippingAddress1: current.billingAddress1,
      shippingAddress2: current.billingAddress2,
      shippingCity: current.billingCity,
      shippingProvince: current.billingProvince,
      shippingPostcode: current.billingPostcode,
    }))
  }

  const handleLogout = async () => {
    setIsSigningOut(true)

    try {
      await logout()
      navigate('/')
    } finally {
      setIsSigningOut(false)
    }
  }

  if (isLoading || !customer) {
    return (
      <div className="min-h-screen bg-dh-gray">
        <Header />

        <main className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-dh-primary" />

            <h1 className="font-display text-xl font-bold text-dh-primary">
              Loading your account
            </h1>

            <p className="mt-2 text-sm text-dh-dark-gray">
              Please wait while we prepare your dashboard.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

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

          <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
                  <UserRound className="h-4 w-4" />
                  Customer dashboard
                </div>

                <h1 className="font-display text-3xl font-bold leading-tight text-dh-primary lg:text-5xl">
                  Welcome, {displayName}
                </h1>

                <p className="mt-4 max-w-2xl text-dh-dark-gray">
                  Manage your orders, wishlist, delivery information, and account
                  details from one place.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/orders">
                    <Button className="h-11 rounded-full bg-dh-primary px-6 text-white hover:bg-dh-secondary">
                      <ShoppingBag className="mr-2 h-5 w-5" />
                      View orders
                    </Button>
                  </Link>

                  <Link to="/wishlist">
                    <Button
                      variant="outline"
                      className="h-11 rounded-full border-dh-primary px-6 text-dh-primary hover:bg-dh-primary hover:text-white"
                    >
                      <Heart className="mr-2 h-5 w-5" />
                      Wishlist
                    </Button>
                  </Link>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLogout}
                    disabled={isSigningOut}
                    className="h-11 rounded-full border-red-200 px-6 text-red-600 hover:bg-red-50"
                  >
                    <LockKeyhole className="mr-2 h-5 w-5" />
                    {isSigningOut ? 'Signing out...' : 'Sign out'}
                  </Button>
                </div>
              </div>

              <div className="bg-dh-primary p-6 text-white sm:p-8 lg:p-10">
                <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
                  <ShieldCheck className="mb-5 h-12 w-12 text-dh-secondary" />

                  <h2 className="font-display text-2xl font-bold">
                    Your shopping profile
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed text-white/80">
                    Keep your details updated so checkout is faster and delivery
                    information stays accurate.
                  </p>

                  <div className="mt-7 grid gap-4 text-sm">
                    <div className="flex gap-3">
                      <Mail className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                      <div>
                        <p className="font-semibold">Email</p>
                        <p className="break-all text-white/70">{customer.email}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Phone className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                      <div>
                        <p className="font-semibold">Phone</p>
                        <p className="text-white/70">
                          {customer.billing?.phone || 'Not added yet'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                      <div>
                        <p className="font-semibold">Delivery city</p>
                        <p className="text-white/70">
                          {customer.shipping?.city ||
                            customer.billing?.city ||
                            'Not added yet'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                      <div>
                        <p className="font-semibold">Account status</p>
                        <p className="text-white/70">Active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              icon={<ShoppingBag className="h-6 w-6" />}
              label="Orders"
              value={String(orders.length)}
              helper="Purchases connected to your account."
              href="/orders"
            />

            <DashboardCard
              icon={<Heart className="h-6 w-6" />}
              label="Wishlist"
              value={String(wishlistCount)}
              helper="Products saved for later."
              href="/wishlist"
            />

            <DashboardCard
              icon={<Truck className="h-6 w-6" />}
              label="Delivery"
              value={customer.shipping?.city || customer.billing?.city || 'Set up'}
              helper="Saved delivery location."
            />

            <DashboardCard
              icon={<PackageCheck className="h-6 w-6" />}
              label="Tracking"
              value="Ready"
              helper="Track any order anytime."
              href="/track-order"
            />
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold text-dh-primary">
                    Account details
                  </h2>

                  <p className="mt-1 text-sm text-dh-dark-gray">
                    Update your profile and saved delivery information.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyBillingToShipping}
                  className="rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white"
                >
                  Copy billing to delivery
                </Button>
              </div>

              {errorMessage && (
                <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mb-5 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
                  <div className="flex gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{successMessage}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="grid gap-6">
                <div>
                  <h3 className="mb-4 font-display text-lg font-bold text-dh-primary">
                    Personal information
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(event) =>
                          updateField('firstName', event.target.value)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(event) =>
                          updateField('lastName', event.target.value)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={customer.email}
                        disabled
                        className="mt-1 bg-gray-100"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(event) =>
                          updateField('phone', event.target.value)
                        }
                        placeholder="+260 97X XXX XXX"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 font-display text-lg font-bold text-dh-primary">
                    Billing address
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="billingAddress1">Address line 1</Label>
                      <Input
                        id="billingAddress1"
                        value={formData.billingAddress1}
                        onChange={(event) =>
                          updateField('billingAddress1', event.target.value)
                        }
                        placeholder="House number, road, area"
                        className="mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="billingAddress2">Address line 2</Label>
                      <Input
                        id="billingAddress2"
                        value={formData.billingAddress2}
                        onChange={(event) =>
                          updateField('billingAddress2', event.target.value)
                        }
                        placeholder="Apartment, suite, landmark"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="billingCity">City</Label>
                      <Input
                        id="billingCity"
                        value={formData.billingCity}
                        onChange={(event) =>
                          updateField('billingCity', event.target.value)
                        }
                        placeholder="Lusaka"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="billingProvince">Province</Label>
                      <Input
                        id="billingProvince"
                        value={formData.billingProvince}
                        onChange={(event) =>
                          updateField('billingProvince', event.target.value)
                        }
                        placeholder="Lusaka"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="billingPostcode">Postcode</Label>
                      <Input
                        id="billingPostcode"
                        value={formData.billingPostcode}
                        onChange={(event) =>
                          updateField('billingPostcode', event.target.value)
                        }
                        placeholder="10101"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 font-display text-lg font-bold text-dh-primary">
                    Delivery address
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="shippingAddress1">Address line 1</Label>
                      <Input
                        id="shippingAddress1"
                        value={formData.shippingAddress1}
                        onChange={(event) =>
                          updateField('shippingAddress1', event.target.value)
                        }
                        placeholder="House number, road, area"
                        className="mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="shippingAddress2">Address line 2</Label>
                      <Input
                        id="shippingAddress2"
                        value={formData.shippingAddress2}
                        onChange={(event) =>
                          updateField('shippingAddress2', event.target.value)
                        }
                        placeholder="Apartment, suite, landmark"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="shippingCity">City</Label>
                      <Input
                        id="shippingCity"
                        value={formData.shippingCity}
                        onChange={(event) =>
                          updateField('shippingCity', event.target.value)
                        }
                        placeholder="Lusaka"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="shippingProvince">Province</Label>
                      <Input
                        id="shippingProvince"
                        value={formData.shippingProvince}
                        onChange={(event) =>
                          updateField('shippingProvince', event.target.value)
                        }
                        placeholder="Lusaka"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="shippingPostcode">Postcode</Label>
                      <Input
                        id="shippingPostcode"
                        value={formData.shippingPostcode}
                        onChange={(event) =>
                          updateField('shippingPostcode', event.target.value)
                        }
                        placeholder="10101"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="h-12 rounded-full bg-dh-primary text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSaving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Save account details
                    </>
                  )}
                </Button>
              </form>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-dh-primary">
                      Recent orders
                    </h2>

                    <p className="mt-1 text-sm text-dh-dark-gray">
                      Your latest purchases.
                    </p>
                  </div>

                  <Link
                    to="/orders"
                    className="text-sm font-semibold text-dh-primary hover:text-dh-secondary"
                  >
                    View all
                  </Link>
                </div>

                {isOrdersLoading ? (
                  <div className="rounded-2xl bg-dh-gray p-5 text-center">
                    <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-dh-primary" />
                    <p className="text-sm text-dh-dark-gray">
                      Loading orders...
                    </p>
                  </div>
                ) : recentOrders.length > 0 ? (
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <Link
                        key={order.id}
                        to={`/orders/${order.id}`}
                        className="block rounded-2xl border border-dh-light-gray p-4 transition-all hover:border-dh-primary hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-dh-primary">
                              Order #{order.number || order.id}
                            </p>

                            <p className="mt-1 text-xs text-dh-dark-gray">
                              {formatDate(order.dateCreated)}
                            </p>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {order.statusLabel || order.status}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-sm text-dh-dark-gray">
                            {order.items?.length || 0} item(s)
                          </p>

                          <p className="font-semibold text-dh-primary">
                            {formatPrice(order.total, order.currency)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-dh-gray p-5 text-center">
                    <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-dh-primary" />

                    <p className="font-semibold text-dh-primary">
                      No orders yet
                    </p>

                    <p className="mt-1 text-sm text-dh-dark-gray">
                      Your orders will appear here after checkout.
                    </p>

                    <Link
                      to="/shop"
                      className="mt-4 inline-flex items-center justify-center rounded-full bg-dh-primary px-5 py-2 text-sm font-semibold text-white hover:bg-dh-secondary"
                    >
                      Start shopping
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="font-display text-xl font-bold text-dh-primary">
                  Quick actions
                </h2>

                <div className="mt-5 grid gap-3">
                  <Link
                    to="/track-order"
                    className="flex items-center justify-between rounded-2xl bg-dh-gray p-4 font-semibold text-dh-primary hover:bg-dh-secondary/15"
                  >
                    Track an order
                    <PackageCheck className="h-5 w-5" />
                  </Link>

                  <Link
                    to="/wishlist"
                    className="flex items-center justify-between rounded-2xl bg-dh-gray p-4 font-semibold text-dh-primary hover:bg-dh-secondary/15"
                  >
                    View wishlist
                    <Heart className="h-5 w-5" />
                  </Link>

                  <Link
                    to="/shop"
                    className="flex items-center justify-between rounded-2xl bg-dh-gray p-4 font-semibold text-dh-primary hover:bg-dh-secondary/15"
                  >
                    Continue shopping
                    <ShoppingBag className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}