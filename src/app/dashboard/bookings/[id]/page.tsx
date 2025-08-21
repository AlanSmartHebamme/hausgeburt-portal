'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Contact = { phone_masked: string | null; phone_full: string | null }

export default function ClientBookingDetail() {
  const { id } = useParams<{ id: string }>()
  const [booking, setBooking] = useState<any>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      // Buchung laden
      const { data: b } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single()
      setBooking(b)

      // Hebammen-Kontakt (maskiert bis PAID)
      const { data: c } = await supabase
        .rpc('get_midwife_contact', { p_booking_id: id })
        .maybeSingle()
      setContact((c ?? null) as Contact | null)

      setLoading(false)
    })()
  }, [id])

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Lädt…</div>
  if (!booking) return <div className="p-4">Buchung nicht gefunden.</div>

  const phone = contact?.phone_full ?? contact?.phone_masked ?? '—'
  const locked = !contact?.phone_full

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <a href="/dashboard" className="text-sm underline">→ Zurück</a>
      <h1 className="text-lg font-semibold">Buchung {booking.id}</h1>

      <div>Status: <b>{booking.status}</b></div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Hebamme – Telefon:</span>
        <span className="font-medium">{phone}</span>
        {locked && (
          <span
            className="text-[11px] border rounded-full px-2 py-0.5 bg-muted/40 cursor-help"
            title="Voll sichtbar nach erfolgreicher Zahlung."
          >
            🔒 nach Zahlung
          </span>
        )}
      </div>
    </div>
  )
}
