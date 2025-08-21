'use client'

import { useState } from 'react'

export default function PayButton({ bookingId, disabled = false }: { bookingId: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/checkout/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error ?? 'Fehler beim Starten der Zahlung')
        setLoading(false)
        return
      }
      const { url } = await res.json()
      window.location.href = url
    } catch (e: any) {
      alert(e?.message ?? 'Unbekannter Fehler')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading || disabled}
      className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
    >
      {loading ? 'Weiterleitung…' : 'Jetzt bezahlen'}
    </button>
  )
}
