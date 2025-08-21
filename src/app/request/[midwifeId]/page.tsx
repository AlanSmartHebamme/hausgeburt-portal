'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const TABLE_NAME = 'bookings' // ggf. anpassen

type Status = 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'PAID' | 'CANCELED'

type Booking = {
  id: string
  status: Status
  client_id: string
  midwife_id: string
  created_at: string
}

export default function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [row, setRow] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<null | Status>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, status, client_id, midwife_id, created_at')
      .eq('id', id)
      .single()
    if (error) setError(error.message)
    setRow((data as Booking) ?? null)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function setStatus(status: Exclude<Status, 'REQUESTED'>) {
    setSaving(status)
    const { error } = await supabase.from(TABLE_NAME).update({ status }).eq('id', id)
    if (error) setError(error.message)
    await load()
    setSaving(null)
  }

  if (loading) return <div className="p-4">Lädt…</div>
  if (!row) return <div className="p-4">Anfrage nicht gefunden.</div>

  return (
    <div className="p-4 space-y-4">
      <button className="text-sm underline" onClick={() => router.push('/dashboard/requests')}>
        ← Zurück
      </button>

      <h1 className="text-xl font-semibold">Anfrage {row.id}</h1>
      <div className="text-sm opacity-80">Status: {row.status}</div>
      <div className="text-sm opacity-80">Erstellt: {new Date(row.created_at).toLocaleString()}</div>
      <div className="text-sm opacity-80">Kunde: {row.client_id}</div>

      {error && <div className="text-red-500">{error}</div>}

      {row.status === 'REQUESTED' && (
        <div className="flex gap-2">
          <button
            className="border px-3 py-2 rounded text-sm"
            disabled={!!saving}
            onClick={() => setStatus('CONFIRMED')}
          >
            {saving === 'CONFIRMED' ? '…' : 'Bestätigen'}
          </button>
          <button
            className="border px-3 py-2 rounded text-sm"
            disabled={!!saving}
            onClick={() => setStatus('DECLINED')}
          >
            {saving === 'DECLINED' ? '…' : 'Ablehnen'}
          </button>
        </div>
      )}
    </div>
  )
}
