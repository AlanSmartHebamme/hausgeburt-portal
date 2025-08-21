'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserPlan } from '@/hooks/useUserPlan'

export default function UpgradeButton({ priceId, label = 'Jetzt auf Pro upgraden' }: {
  priceId: string
  label?: string
}) {
  const { loading: planLoading, plan } = useUserPlan()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handler to create a new checkout session for upgrading
  async function handleUpgrade() {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Nicht eingeloggt'); return }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, user_id: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout error')

      window.location.href = data.url
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Handler to open the Stripe Customer Portal
  async function handleOpenPortal() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Portal error')
      window.location.href = data.url
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (planLoading) {
    return (
      <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded animate-pulse">
        Lade Status…
      </div>
    )
  }

  if (plan === 'PRO') {
    return (
      <div>
        <button
          onClick={handleOpenPortal}
          disabled={loading}
          className="bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {loading ? 'Öffne Portal…' : 'Abo verwalten'}
        </button>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
      >
        {loading ? 'Öffne Stripe…' : label}
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  )
}
