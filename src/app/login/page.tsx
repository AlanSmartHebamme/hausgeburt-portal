'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (signingIn || !email) return
    setError(null)
    setSigningIn(true)
    setMagicLinkSent(false)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // This URL needs to be added to your Supabase config under "Redirect URLs"
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    setSigningIn(false)

    if (error) {
      console.error('Magic link error:', error)
      setError('Magic Link konnte nicht gesendet werden. Bitte versuche es erneut.')
    } else {
      setMagicLinkSent(true)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (signingIn) return
    setError(null)
    setSigningIn(true)

    const normalizedEmail = email.trim().toLowerCase()

    const res = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    setSigningIn(false)

    if (res.error) {
      console.error('Login error:', res.error)
      setError('E-Mail oder Passwort ist ungültig.')
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
          Anmelden
        </h2>
        <p className="mt-2 text-center text-sm">
          Oder{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            erstelle einen neuen Account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border">
          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                E-Mail-Adresse
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border p-2"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Passwort
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border p-2"
                />
              </div>
            </div>
            
            {error && <div className="text-sm text-red-600">{error}</div>}

            <div>
              <button
                type="submit"
                disabled={signingIn}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {signingIn ? 'Wird eingeloggt…' : 'Anmelden'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Oder</span>
              </div>
            </div>

            <div className="mt-6">
              <form onSubmit={handleMagicLink}>
                <p className="text-sm text-center mb-2">
                  Kein Passwort? Erhalte einen Magic Link per E-Mail.
                </p>
                <div className="flex gap-2">
                  <input
                    id="email-magic"
                    name="email-magic"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="E-Mail-Adresse"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md border p-2"
                  />
                  <button
                    type="submit"
                    disabled={signingIn || !email}
                    className="rounded-md bg-gray-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-700 disabled:opacity-50"
                  >
                    Senden
                  </button>
                </div>
                {magicLinkSent && <p className="text-sm text-green-600 mt-2">Magic Link gesendet! Bitte überprüfe dein Postfach.</p>}
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
