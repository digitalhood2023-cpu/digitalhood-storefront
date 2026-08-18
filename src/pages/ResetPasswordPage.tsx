import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetCustomerPassword } from '@/api/account'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!token) {
      setError('This reset link is incomplete. Request a new password reset email.')
      return
    }

    if (password.length < 8) {
      setError('Your new password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await resetCustomerPassword({ token, password })
      setMessage(response.message || 'Your password has been reset successfully.')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to reset your password.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-dh-gray">
      <Header />
      <main className="px-4 py-10 lg:py-16">
        <section className="mx-auto max-w-lg rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-black text-dh-primary">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-dh-dark-gray">
            Use at least 8 characters. After the reset, this link cannot be used again.
          </p>

          {message ? (
            <div className="mt-6 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-800">
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-black">Password updated</p>
                  <p className="mt-1">{message}</p>
                  <Link to="/login" className="mt-3 inline-block font-black underline">
                    Sign in now
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div>
                <Label htmlFor="new-password">New password</Label>
                <div className="relative mt-1">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dh-dark-gray"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="mt-1"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              {!token && (
                <Link to="/forgot-password" className="text-sm font-black text-dh-primary underline">
                  Request a new reset link
                </Link>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !token}
                className="h-12 rounded-full bg-dh-primary font-black text-white hover:bg-dh-secondary"
              >
                {isSubmitting ? 'Updating password...' : 'Reset password'}
              </Button>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
