import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Edit3,
  Heart,
  Home,
  Loader2,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Plus,
  Save,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useAccount } from '@/context/AccountContext'
import { useWishlist } from '@/context/WishlistContext'

import {
  addCustomerSavedAddress,
  deleteCustomerSavedAddress,
  getCustomerOrders,
  getCustomerSavedAddresses,
  setDefaultCustomerSavedAddress,
  updateCustomerSavedAddress,
  type AccountOrder,
  type SavedCustomerAddress,
} from '@/api/account'

type AddressFormData = {
  label: string
  fullName: string
  phone: string
  address1: string
  address2: string
  city: string
  province: string
  postcode: string
  country: string
  isDefault: boolean
}

const emptyAddressForm: AddressFormData = {
  label: 'Delivery Address',
  fullName: '',
  phone: '',
  address1: '',
  address2: '',
  city: 'Lusaka',
  province: 'Lusaka',
  postcode: '10101',
  country: 'ZM',
  isDefault: false,
}

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

function getCustomerFullName(customer?: {
  firstName?: string
  lastName?: string
  email?: string
}) {
  if (!customer) return ''

  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim()

  return fullName || customer.email || ''
}

function addressToForm(address: SavedCustomerAddress): AddressFormData {
  return {
    label: address.label || 'Delivery Address',
    fullName: address.fullName || '',
    phone: address.phone || '',
    address1: address.address1 || '',
    address2: address.address2 || '',
    city: address.city || 'Lusaka',
    province: address.province || 'Lusaka',
    postcode: address.postcode || '10101',
    country: address.country || 'ZM',
    isDefault: Boolean(address.isDefault),
  }
}

function getAddressLine(address?: SavedCustomerAddress | null) {
  if (!address) return 'No default address yet'

  return [address.address1, address.address2, address.city, address.province]
    .filter(Boolean)
    .join(', ')
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
    <div className="rounded-3xl bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:p-5">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
        {icon}
      </div>

      <p className="text-sm font-medium text-dh-dark-gray">{label}</p>

      <p className="mt-1 line-clamp-1 font-display text-xl font-bold text-dh-primary sm:text-2xl">
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

function AddressCard({
  address,
  isDefault,
  isBusy,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  address: SavedCustomerAddress
  isDefault: boolean
  isBusy: boolean
  onEdit: () => void
  onSetDefault: () => void
  onDelete: () => void
}) {
  return (
    <article
      className={`rounded-3xl border bg-white p-4 shadow-sm transition-all sm:p-5 ${
        isDefault
          ? 'border-dh-primary ring-2 ring-dh-secondary/30'
          : 'border-dh-light-gray hover:border-dh-primary'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-bold text-dh-primary">
              {address.label || 'Delivery Address'}
            </h3>

            {isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                <Star className="h-3.5 w-3.5 fill-current" />
                Default
              </span>
            )}
          </div>

          <p className="mt-1 font-semibold text-dh-primary">
            {address.fullName}
          </p>

          <p className="mt-1 text-sm text-dh-dark-gray">{address.phone}</p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={isBusy}
            className="rounded-full bg-dh-gray p-2 text-dh-primary hover:bg-dh-secondary/20 disabled:opacity-50"
            aria-label="Edit address"
          >
            <Edit3 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy}
            className="rounded-full bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"
            aria-label="Delete address"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-dh-gray p-3 text-sm text-dh-dark-gray sm:p-4">
        <p>{address.address1}</p>

        {address.address2 && <p>{address.address2}</p>}

        <p>{[address.city, address.province].filter(Boolean).join(', ')}</p>

        <p>
          {[address.postcode, address.country || 'ZM'].filter(Boolean).join(', ')}
        </p>
      </div>

      {!isDefault && (
        <Button
          type="button"
          variant="outline"
          onClick={onSetDefault}
          disabled={isBusy}
          className="mt-4 h-10 rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white disabled:opacity-50"
        >
          <Star className="mr-2 h-4 w-4" />
          Use as default
        </Button>
      )}
    </article>
  )
}

export default function AccountPage() {
  const navigate = useNavigate()
  const savedAddressesSectionRef = useRef<HTMLElement | null>(null)

  const {
    customer,
    isAuthenticated,
    isLoading,
    updateCustomerInState,
    logout,
  } = useAccount()

  const { items: wishlistItems } = useWishlist()

  const [orders, setOrders] = useState<AccountOrder[]>([])
  const [savedAddresses, setSavedAddresses] = useState<SavedCustomerAddress[]>([])
  const [defaultAddressId, setDefaultAddressId] = useState('')
  const [isOrdersLoading, setIsOrdersLoading] = useState(false)
  const [isAddressesLoading, setIsAddressesLoading] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [busyAddressId, setBusyAddressId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false)
  const [isAddressManagerOpen, setIsAddressManagerOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState('')


  const [addressForm, setAddressForm] =
    useState<AddressFormData>(emptyAddressForm)

  const refreshSavedAddresses = useCallback(async () => {
    const response = await getCustomerSavedAddresses()

    setSavedAddresses(response.addresses || [])
    setDefaultAddressId(response.defaultAddressId || '')

    if (response.customer) {
      updateCustomerInState(response.customer)
    }

    return response
  }, [updateCustomerInState])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login?redirect=/account')
    }
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (!customer) return


    setSavedAddresses(customer.savedAddresses || [])
    setDefaultAddressId(customer.defaultAddressId || customer.savedAddresses?.[0]?.id || '')
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

    async function loadAddresses() {
      setIsAddressesLoading(true)

      try {
        const response = await getCustomerSavedAddresses()

        if (mounted) {
          setSavedAddresses(response.addresses || [])
          setDefaultAddressId(response.defaultAddressId || '')

          if (response.customer) {
            updateCustomerInState(response.customer)
          }
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load your saved addresses right now.'
          )
        }
      } finally {
        if (mounted) {
          setIsAddressesLoading(false)
        }
      }
    }

    loadOrders()
    loadAddresses()

    return () => {
      mounted = false
    }
  }, [isAuthenticated, updateCustomerInState])

  const displayName = useMemo(() => {
    return getCustomerFullName(customer || undefined)
  }, [customer])

  const recentOrders = orders.slice(0, 3)
  const wishlistCount = wishlistItems.length

  const displayAddresses = useMemo(() => {
    return savedAddresses
  }, [savedAddresses])

  const defaultAddress = useMemo(() => {
    return (
      displayAddresses.find((address) => address.id === defaultAddressId) ||
      displayAddresses.find((address) => address.isDefault) ||
      displayAddresses[0] ||
      null
    )
  }, [defaultAddressId, displayAddresses])

  const canAddAddress = displayAddresses.length < 5

  const scrollToSavedAddresses = () => {
    savedAddressesSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }



  const updateAddressField = (
    field: keyof AddressFormData,
    value: string | boolean
  ) => {
    setAddressForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const resetAddressForm = () => {
    const fullName = getCustomerFullName(customer || undefined)

    setAddressForm({
      ...emptyAddressForm,
      fullName,
      phone: customer?.billing?.phone || '',
      isDefault: displayAddresses.length === 0,
    })
    setEditingAddressId('')
  }

  const openNewAddressForm = () => {
    setErrorMessage('')
    setSuccessMessage('')
    resetAddressForm()
    setIsAddressManagerOpen(true)
    setIsAddressFormOpen(true)
  }

  const openEditAddressForm = (address: SavedCustomerAddress) => {
    setErrorMessage('')
    setSuccessMessage('')
    setEditingAddressId(address.id)
    setAddressForm(addressToForm(address))
    setIsAddressManagerOpen(true)
    setIsAddressFormOpen(true)
  }

  const closeAddressForm = () => {
    setIsAddressFormOpen(false)
    setEditingAddressId('')
    setAddressForm(emptyAddressForm)
  }

  const validateAddressForm = () => {
    if (!addressForm.label.trim()) return 'Address label is required.'
    if (!addressForm.fullName.trim()) return 'Full name is required.'
    if (!addressForm.phone.trim()) return 'Phone number is required.'
    if (!addressForm.address1.trim()) return 'Address line 1 is required.'
    if (!addressForm.city.trim()) return 'City is required.'
    if (!addressForm.province.trim()) return 'Province is required.'

    return ''
  }

  const handleSaveAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    const validationError = validateAddressForm()

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSavingAddress(true)

    const payload = {
      label: addressForm.label.trim(),
      fullName: addressForm.fullName.trim(),
      phone: addressForm.phone.trim(),
      address1: addressForm.address1.trim(),
      address2: addressForm.address2.trim(),
      city: addressForm.city.trim(),
      province: addressForm.province.trim(),
      postcode: addressForm.postcode.trim() || '10101',
      country: addressForm.country.trim() || 'ZM',
      isDefault: Boolean(addressForm.isDefault),
    }

    try {
      const response = editingAddressId
        ? await updateCustomerSavedAddress(editingAddressId, payload)
        : await addCustomerSavedAddress(payload)

      setSavedAddresses(response.addresses || [])
      setDefaultAddressId(response.defaultAddressId || '')

      if (response.customer) {
        updateCustomerInState(response.customer)
      }

      await refreshSavedAddresses()

      setSuccessMessage(
        editingAddressId
          ? 'Address updated successfully.'
          : 'Address saved successfully.'
      )

      closeAddressForm()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save address.'
      )
    } finally {
      setIsSavingAddress(false)
    }
  }

  const handleSetDefaultAddress = async (addressId: string) => {
    setErrorMessage('')
    setSuccessMessage('')
    setBusyAddressId(addressId)

    try {
      const response = await setDefaultCustomerSavedAddress(addressId)

      setSavedAddresses(response.addresses || [])
      setDefaultAddressId(response.defaultAddressId || addressId)

      if (response.customer) {
        updateCustomerInState(response.customer)
      }

      await refreshSavedAddresses()

      setSuccessMessage('Default address updated. Checkout will use this address.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to set default address.'
      )
    } finally {
      setBusyAddressId('')
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    const confirmed = window.confirm(
      'Delete this saved address? This cannot be undone.'
    )

    if (!confirmed) return

    setErrorMessage('')
    setSuccessMessage('')
    setBusyAddressId(addressId)

    try {
      const response = await deleteCustomerSavedAddress(addressId)

      setSavedAddresses(response.addresses || [])
      setDefaultAddressId(response.defaultAddressId || '')

      if (response.customer) {
        updateCustomerInState(response.customer)
      }

      await refreshSavedAddresses()

      setSuccessMessage('Address deleted successfully.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete address.'
      )
    } finally {
      setBusyAddressId('')
    }
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

      <main className="py-5 lg:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-dh-dark-gray">
            <Link to="/" className="hover:text-dh-primary">
              Home
            </Link>

            <ChevronRight className="h-4 w-4" />

            <span className="font-medium text-dh-primary">My Account</span>
          </nav>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-dh-secondary/15 text-dh-primary">
                  <UserRound className="h-7 w-7" />
                </div>

                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Active customer profile
                  </div>

                  <h1 className="font-display text-2xl font-bold leading-tight text-dh-primary sm:text-3xl">
                    Welcome back, {displayName}
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dh-dark-gray">
                    Access your orders, saved products, delivery addresses and
                    personal account settings.
                  </p>
                </div>
              </div>

            </div>

            <div className="mt-5 flex flex-wrap gap-3 border-t border-dh-light-gray pt-5">
              <Link to="/orders">
                <Button className="h-11 rounded-full bg-dh-primary px-6 font-semibold text-white hover:bg-dh-secondary">
                  <PackageCheck className="mr-2 h-5 w-5" />
                  View orders
                </Button>
              </Link>

              <Link to="/shop">
                <Button
                  variant="outline"
                  className="h-11 rounded-full border-dh-primary px-6 font-semibold text-dh-primary hover:bg-dh-primary hover:text-white"
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Continue shopping
                </Button>
              </Link>

              <Button
                type="button"
                variant="outline"
                onClick={scrollToSavedAddresses}
                className="h-11 rounded-full border-dh-primary px-6 font-semibold text-dh-primary hover:bg-dh-primary hover:text-white"
              >
                <MapPin className="mr-2 h-5 w-5" />
                Manage addresses
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                disabled={isSigningOut}
                className="h-11 rounded-full border-red-200 px-6 font-semibold text-red-600 hover:bg-red-50"
              >
                <LockKeyhole className="mr-2 h-5 w-5" />
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

            <button type="button" onClick={scrollToSavedAddresses} className="text-left">
              <DashboardCard
                icon={<Home className="h-6 w-6" />}
                label="Saved Addresses"
                value={`${displayAddresses.length}/5`}
                helper="Manage delivery locations."
              />
            </button>

            <DashboardCard
              icon={<UserRound className="h-6 w-6" />}
              label="Account details"
              value="Manage"
              helper="Update your personal information."
              href="/account/details"
            />
          </section>

          {(errorMessage || successMessage) && (
            <section className="mt-8">
              {errorMessage && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
                  <div className="flex gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{successMessage}</p>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8">
              <section ref={savedAddressesSectionRef} className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-dh-primary">
                      Delivery addresses
                    </h2>

                    <p className="mt-1 text-sm text-dh-dark-gray">
                      Your default delivery address is used automatically at checkout.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddressManagerOpen((current) => !current)}
                      className="rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white"
                    >
                      {isAddressManagerOpen ? (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Close manager
                        </>
                      ) : (
                        <>
                          <Edit3 className="mr-2 h-4 w-4" />
                          Manage addresses
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      onClick={openNewAddressForm}
                      disabled={!canAddAddress}
                      className="rounded-full bg-dh-primary text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add address
                    </Button>
                  </div>
                </div>

                <div className="rounded-3xl border border-dh-light-gray bg-dh-gray p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dh-secondary/20 text-dh-primary">
                        <MapPin className="h-6 w-6" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-lg font-bold text-dh-primary">
                            {defaultAddress?.label || 'No default address'}
                          </p>

                          {defaultAddress && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              Default
                            </span>
                          )}
                        </div>

                        {defaultAddress ? (
                          <>
                            <p className="mt-1 font-semibold text-dh-primary">
                              {defaultAddress.fullName}
                            </p>

                            <p className="mt-1 text-sm text-dh-dark-gray">
                              {defaultAddress.phone}
                            </p>

                            <p className="mt-2 max-w-xl text-sm text-dh-dark-gray">
                              {getAddressLine(defaultAddress)}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-sm text-dh-dark-gray">
                            Add an address to make checkout faster.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-dh-dark-gray shadow-sm">
                      <p className="font-semibold text-dh-primary">
                        {displayAddresses.length}/5 saved
                      </p>
                      <p>Address book</p>
                    </div>
                  </div>
                </div>

                {!canAddAddress && (
                  <div className="mb-5 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
                    You have reached the limit of 5 saved addresses. Delete one
                    address before adding another.
                  </div>
                )}

                {isAddressManagerOpen && (
                  <div className="mt-6 rounded-3xl border border-dh-light-gray bg-white p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl font-bold text-dh-primary">
                          Address book
                        </h3>
                        <p className="text-sm text-dh-dark-gray">
                          Choose your default address, edit saved addresses, or add a new one.
                        </p>
                      </div>

                      <span className="rounded-full bg-dh-gray px-4 py-2 text-sm font-semibold text-dh-primary">
                        {displayAddresses.length}/5 saved
                      </span>
                    </div>

                    {isAddressesLoading ? (
                  <div className="rounded-2xl bg-dh-gray p-8 text-center">
                    <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-dh-primary" />
                    <p className="text-sm text-dh-dark-gray">
                      Loading saved addresses...
                    </p>
                  </div>
                ) : displayAddresses.length > 0 ? (
                  <div className="grid gap-3">
                    {displayAddresses.map((address) => (
                      <AddressCard
                        key={address.id}
                        address={address}
                        isDefault={
                          address.id === defaultAddressId ||
                          Boolean(address.isDefault)
                        }
                        isBusy={busyAddressId === address.id}
                        onEdit={() => openEditAddressForm(address)}
                        onSetDefault={() => handleSetDefaultAddress(address.id)}
                        onDelete={() => handleDeleteAddress(address.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl bg-dh-gray p-8 text-center">
                    <MapPin className="mx-auto mb-4 h-10 w-10 text-dh-primary" />

                    <h3 className="font-display text-xl font-bold text-dh-primary">
                      No saved addresses yet
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm text-dh-dark-gray">
                      Add your first delivery address so checkout can fill it
                      automatically next time.
                    </p>

                    <Button
                      type="button"
                      onClick={openNewAddressForm}
                      className="mt-5 rounded-full bg-dh-primary text-white hover:bg-dh-secondary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add first address
                    </Button>
                  </div>
                )}
                  </div>
                )}

                {isAddressFormOpen && (
                  <form
                    onSubmit={handleSaveAddress}
                    className="mt-6 rounded-3xl border border-dh-light-gray bg-dh-gray p-5 sm:p-6"
                  >
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-display text-xl font-bold text-dh-primary">
                          {editingAddressId ? 'Edit address' : 'Add new address'}
                        </h3>

                        <p className="mt-1 text-sm text-dh-dark-gray">
                          This address can be selected as your checkout default.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeAddressForm}
                        className="rounded-full bg-white p-2 text-dh-primary hover:bg-red-50 hover:text-red-600"
                        aria-label="Close address form"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="addressLabel">Address label</Label>
                        <Input
                          id="addressLabel"
                          value={addressForm.label}
                          onChange={(event) =>
                            updateAddressField('label', event.target.value)
                          }
                          placeholder="Home, Office, Parents..."
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="addressFullName">Full name</Label>
                        <Input
                          id="addressFullName"
                          value={addressForm.fullName}
                          onChange={(event) =>
                            updateAddressField('fullName', event.target.value)
                          }
                          placeholder="Receiver name"
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="addressPhone">Phone number</Label>
                        <Input
                          id="addressPhone"
                          value={addressForm.phone}
                          onChange={(event) =>
                            updateAddressField('phone', event.target.value)
                          }
                          placeholder="+260 97X XXX XXX"
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="addressPostcode">Postcode</Label>
                        <Input
                          id="addressPostcode"
                          value={addressForm.postcode}
                          onChange={(event) =>
                            updateAddressField('postcode', event.target.value)
                          }
                          placeholder="10101"
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Label htmlFor="address1">Address line 1</Label>
                        <Input
                          id="address1"
                          value={addressForm.address1}
                          onChange={(event) =>
                            updateAddressField('address1', event.target.value)
                          }
                          placeholder="House number, road, area"
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Label htmlFor="address2">Address line 2</Label>
                        <Input
                          id="address2"
                          value={addressForm.address2}
                          onChange={(event) =>
                            updateAddressField('address2', event.target.value)
                          }
                          placeholder="Apartment, suite, landmark"
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="addressCity">City</Label>
                        <Input
                          id="addressCity"
                          value={addressForm.city}
                          onChange={(event) =>
                            updateAddressField('city', event.target.value)
                          }
                          placeholder="Lusaka"
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="addressProvince">Province</Label>
                        <Input
                          id="addressProvince"
                          value={addressForm.province}
                          onChange={(event) =>
                            updateAddressField('province', event.target.value)
                          }
                          placeholder="Lusaka"
                          className="mt-1 bg-white"
                        />
                      </div>
                    </div>

                    <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 text-sm text-dh-dark-gray">
                      <input
                        type="checkbox"
                        checked={addressForm.isDefault}
                        onChange={(event) =>
                          updateAddressField('isDefault', event.target.checked)
                        }
                        className="mt-1 h-4 w-4 rounded border-dh-light-gray"
                      />

                      <span>
                        Use this as my default delivery address for checkout.
                      </span>
                    </label>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="submit"
                        disabled={isSavingAddress}
                        className="h-12 rounded-full bg-dh-primary text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {isSavingAddress ? (
                          'Saving address...'
                        ) : (
                          <>
                            <Save className="mr-2 h-5 w-5" />
                            {editingAddressId ? 'Update address' : 'Save address'}
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeAddressForm}
                        className="h-12 rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </section>
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
                  Default checkout address
                </h2>

                <div className="mt-5 rounded-2xl bg-dh-gray p-4">
                  {defaultAddress ? (
                    <>
                      <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Default
                      </div>

                      <p className="font-semibold text-dh-primary">
                        {defaultAddress.label}
                      </p>

                      <p className="mt-1 text-sm text-dh-dark-gray">
                        {defaultAddress.fullName}
                      </p>

                      <p className="text-sm text-dh-dark-gray">
                        {defaultAddress.phone}
                      </p>

                      <p className="mt-2 text-sm text-dh-dark-gray">
                        {getAddressLine(defaultAddress)}
                      </p>
                    </>
                  ) : (
                    <>
                      <MapPin className="mb-3 h-8 w-8 text-dh-primary" />
                      <p className="font-semibold text-dh-primary">
                        No default address yet
                      </p>
                      <p className="mt-1 text-sm text-dh-dark-gray">
                        Add an address and set it as default for faster checkout.
                      </p>
                    </>
                  )}
                </div>
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