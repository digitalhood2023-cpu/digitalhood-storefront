import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestCustomerPasswordReset } from '@/api/account'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!email.trim()) {
      setError('Enter the email address used for your DigitalHood account.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await requestCustomerPasswordReset(email.trim())
      setMessage(
        response.message ||
          'If an account exists for that email, a password reset link has been sent.'
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to request a password reset right now.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-dh-gray">
      <Header />
      <main className="px-4 py-10 lg:py-16">
        <section className="mx-auto max-w-lg rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-dh-primary hover:text-dh-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-black text-dh-primary">
            Recover your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-dh-dark-gray">
            Enter your account email. We will send a secure reset link that expires in 30 minutes.
          </p>

          {message ? (
            <div className="mt-6 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-800">
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-black">Check your email</p>
                  <p className="mt-1">{message}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div>
                <Label htmlFor="reset-email">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-1"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded-full bg-dh-primary font-black text-white hover:bg-dh-secondary"
              >
                {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
              </Button>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
