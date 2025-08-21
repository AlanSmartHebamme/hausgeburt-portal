'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Props = { midwifeId: string }
type Status = 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'PAID' | 'CANCELED'

export default function RequestButton({ midwifeId }: Props) {
  const [checking, setChecking] = useState(true)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // immer neueste Buchung laden
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setChecking(false); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('bookings')
        .select('id,status,created_at')
        .eq('client_id', user.id)
        .eq('midwife_id', midwifeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) { setBookingId(data.id); setStatus(data.status as Status) }
      setChecking(false)
    })()
  }, [midwifeId])

  // Realtime nur für diese Buchung
  useEffect(() => {
    if (!bookingId) return
    const ch = supabase
      .channel(`booking-${bookingId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload: any) => payload?.new?.status && setStatus(payload.new.status as Status)
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [bookingId])

  const sendRequest = async () => {
    if (!userId) return alert('Bitte zuerst einloggen.')
    setSending(true)
    const { data, error } = await supabase
      .from('bookings')
      .insert({ client_id: userId, midwife_id: midwifeId, status: 'REQUESTED' })
      .select('id,status')
      .maybeSingle()
    setSending(false)
    if (error) return alert('Fehler: ' + error.message)
    if (data) { setBookingId(data.id); setStatus(data.status as Status) }
  }

  if (checking) return <button disabled className="rounded-md bg-gray-500 text-white px-3 py-2">Lade…</button>
  if (status === 'REQUESTED') return <button disabled className="rounded-md bg-yellow-600 text-white px-3 py-2">Angefragt</button>
  if (status === 'CONFIRMED') return <button disabled className="rounded-md bg-blue-600 text-white px-3 py-2">Bestätigt</button>
  if (status === 'PAID')      return <button disabled className="rounded-md bg-green-600 text-white px-3 py-2">Bezahlt</button>
  if (status === 'DECLINED')  return <button disabled className="rounded-md bg-rose-700 text-white px-3 py-2">Abgelehnt</button>
  if (status === 'CANCELED')  return <button disabled className="rounded-md bg-neutral-600 text-white px-3 py-2">Storniert</button>

  return (
    <button
      onClick={sendRequest}
      disabled={sending}
      className="rounded-md bg-emerald-600 text-white px-3 py-2 hover:bg-emerald-500 disabled:opacity-50"
    >
      {sending ? 'Sende…' : 'Anfrage senden'}
    </button>
  )
}
