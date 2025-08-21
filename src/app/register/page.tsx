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

    // 1) User anlegen
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        // data to be stored in auth.users.user_metadata
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

    // 2) Profil speichern (Policies erlauben Insert für eigenen User)
    const { error: pErr } = await supabase.from('profiles').insert({
      id: data.user.id, role, display_name: displayName
    })
    if (pErr) {
      setError(pErr.message);
      setLoading(false);
      // Optional: delete the user if profile creation fails
      // await supabase.auth.api.deleteUser(data.user.id)
      return
    }

    setSuccess(true)
    setLoading(false)
    // Redirect after a delay
    setTimeout(() => {
      window.location.href = '/login'
    }, 3000)
  }

  if (success) {
    return (
      <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Registrierung erfolgreich!
        </h2>
        <p className="mt-2 text-slate-600">
          Bitte überprüfe dein E-Mail-Postfach, um deine Registrierung zu bestätigen.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Du wirst in Kürze zum Login weitergeleitet...
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          Neuen Account erstellen
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Oder{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            melde dich bei deinem Account an
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div>
              <label className="block text-sm font-medium text-slate-700">Ich bin...</label>
              <select 
                value={role} 
                onChange={e => setRole(e.target.value as any)}
                className="mt-1 block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="CLIENT">... auf der Suche nach einer Hebamme</option>
                <option value="MIDWIFE">... eine Hebamme</option>
              </select>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">
                Anzeigename
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="mt-1 block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                E-Mail-Adresse
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            {error && <div className="text-sm text-red-600">{error}</div>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
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
