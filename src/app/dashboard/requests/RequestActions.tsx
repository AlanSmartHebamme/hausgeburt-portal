'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type Status = 'REQUESTED'|'CONFIRMED'|'DECLINED'|'PAID'|'CANCELED'

export function RequestActions({ id, onUpdated }: { id: string; onUpdated?: (s: Status) => void }) {
  const [loading, setLoading] = useState<Status | null>(null)

  async function updateStatus(newStatus: Status, note?: string) {
  setLoading(newStatus)

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: newStatus, note })
    .eq('id', id)
    .select('id,status')     // sorgt für return=representation
    .maybeSingle()           // kein "cannot coerce ..." Popup

  setLoading(null)

  if (error) {
    alert(error.message)     // würdest du sehen, falls RLS blockt
    return
  }
  if (!data) {
    console.warn('Update hat keinen Datensatz zurückgegeben (RLS?)')
    // optional: hier fetch() der Zeile nachholen
  }

  onUpdated?.(newStatus)     // optimistic UI
}


  return (
    <div className="flex gap-2">
      <button
        onClick={() => updateStatus('CONFIRMED')}
        disabled={loading !== null}
        className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading==='CONFIRMED' ? 'Bestätige…' : 'Bestätigen'}
      </button>
      <button
        onClick={() => {
          const note = prompt('Optionale Nachricht an den Klienten (Ablehnung):') ?? undefined
          updateStatus('DECLINED', note)
        }}
        disabled={loading !== null}
        className="rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
      >
        {loading==='DECLINED' ? 'Lehne ab…' : 'Ablehnen'}
      </button>
    </div>
  )
}
