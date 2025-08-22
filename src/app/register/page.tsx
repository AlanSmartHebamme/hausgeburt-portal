'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<'CLIENT' | 'MIDWIFE'>('CLIENT')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          display_name: displayName,
        }
      }
    })
    if (error || !data.user) {
      setError(error?.message ?? 'Registrierung fehlgeschlagen');
      setLoading(false);
      return
    }

    const { error: pErr } = await supabase.from('profiles').insert({
      id: data.user.id, role, display_name: displayName
    })
    if (pErr) {
      setError(pErr.message);
      setLoading(false);
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Registrierung erfolgreich!
        </h2>
        <p className="mt-2">
          Bitte überprüfe dein E-Mail-Postfach, um deine Registrierung zu bestätigen.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">Weiter zum Login</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
          Neuen Account erstellen
        </h2>
        <p className="mt-2 text-center text-sm">
          Oder{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            melde dich bei deinem Account an
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border">
          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div>
              <label className="block text-sm font-medium">Ich bin...</label>
              <select 
                value={role} 
                onChange={e => setRole(e.target.value as any)}
                className="mt-1 block w-full rounded-md border p-2"
              >
                <option value="CLIENT">... auf der Suche nach einer Hebamme</option>
                <option value="MIDWIFE">... eine Hebamme</option>
              </select>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium">
                Anzeigename
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="mt-1 block w-full rounded-md border p-2"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                E-Mail-Adresse
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border p-2"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border p-2"
              />
            </div>
            
            {error && <div className="text-sm text-red-600">{error}</div>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Wird erstellt…' : 'Account erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
