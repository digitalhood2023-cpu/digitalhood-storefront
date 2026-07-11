import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Loader2,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useAccount } from '@/context/AccountContext'
import { updateCustomerProfile } from '@/api/account'

export default function AccountDetailsPage() {
  const navigate = useNavigate()

  const {
    customer,
    isAuthenticated,
    isLoading,
    updateCustomerInState,
  } = useAccount()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login?redirect=/account/details')
    }
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (!customer) return

    setForm({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      phone:
        customer.billing?.phone ||
        customer.shipping?.phone ||
        '',
    })
  }, [customer])

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    if (!form.firstName.trim()) {
      setErrorMessage('First name is required.')
      return
    }

    if (!form.lastName.trim()) {
      setErrorMessage('Last name is required.')
      return
    }

    setIsSaving(true)

    try {
      const response = await updateCustomerProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
      })

      updateCustomerInState(response.customer)
      setSuccessMessage('Your account details were updated successfully.')
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

  if (isLoading || !customer) {
    return (
      <div className="min-h-screen bg-dh-gray">
        <Header />

        <main className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-dh-primary" />

            <p className="mt-4 text-sm font-semibold text-dh-dark-gray">
              Loading account details...
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
        <div className="container mx-auto max-w-4xl px-4 sm:px-6">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-dh-dark-gray">
            <Link to="/" className="hover:text-dh-primary">
              Home
            </Link>

            <ChevronRight className="h-4 w-4" />

            <Link to="/account" className="hover:text-dh-primary">
              My Account
            </Link>

            <ChevronRight className="h-4 w-4" />

            <span className="font-semibold text-dh-primary">
              Account details
            </span>
          </nav>

          <Link
            to="/account"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-dh-primary hover:text-dh-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to account
          </Link>

          <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
                  <UserRound className="h-6 w-6" />
                </div>

                <div>
                  <h1 className="font-display text-2xl font-bold text-dh-primary sm:text-3xl">
                    Account details
                  </h1>

                  <p className="mt-1 text-sm leading-6 text-dh-dark-gray">
                    Update the personal details connected to your DigitalHood
                    customer account.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-7">
              {errorMessage && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {successMessage && (
                <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-semibold text-green-700">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{successMessage}</p>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="account-first-name">
                    First name
                  </Label>

                  <Input
                    id="account-first-name"
                    value={form.firstName}
                    onChange={(event) =>
                      updateField('firstName', event.target.value)
                    }
                    autoComplete="given-name"
                    className="mt-2 h-12 rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="account-last-name">
                    Last name
                  </Label>

                  <Input
                    id="account-last-name"
                    value={form.lastName}
                    onChange={(event) =>
                      updateField('lastName', event.target.value)
                    }
                    autoComplete="family-name"
                    className="mt-2 h-12 rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="account-email">
                    Email address
                  </Label>

                  <Input
                    id="account-email"
                    value={customer.email}
                    disabled
                    className="mt-2 h-12 rounded-xl bg-slate-50"
                  />

                  <p className="mt-2 text-xs leading-5 text-dh-dark-gray">
                    Your email is used for sign-in, orders and account
                    notifications.
                  </p>
                </div>

                <div>
                  <Label htmlFor="account-phone">
                    Phone number
                  </Label>

                  <Input
                    id="account-phone"
                    value={form.phone}
                    onChange={(event) =>
                      updateField('phone', event.target.value)
                    }
                    placeholder="+260 97X XXX XXX"
                    autoComplete="tel"
                    className="mt-2 h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-dh-primary" />

                  <p className="text-xs font-medium leading-5 text-dh-dark-gray">
                    Your account information is used to identify your orders,
                    support cases and marketplace activity.
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-5">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="h-12 rounded-full bg-dh-primary px-7 font-semibold text-white hover:bg-dh-secondary disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Save account details
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
