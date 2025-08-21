'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { RequestDetailsSheet } from './RequestDetailsSheet'
import PayButton from '@/components/Paybutton'

type Role = 'MIDWIFE' | 'CLIENT' | 'ADMIN'
type Status = 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'PAID' | 'CANCELED'

type BookingRow = {
  id: string
  status: Status
  created_at: string
}

type Profile = {
  id: string
  display_name: string | null
  role: Role
}

const STATUS_LABEL: Record<Status, string> = {
  REQUESTED: 'Angefragt',
  CONFIRMED: 'Bestätigt',
  DECLINED: 'Abgelehnt',
  PAID: 'Bezahlt',
  CANCELED: 'Storniert',
}

function Badge({ status }: { status: Status }) {
  const cls = {
    REQUESTED: 'bg-amber-100 text-amber-800 ring-amber-600/20',
    CONFIRMED: 'bg-blue-100 text-blue-800 ring-blue-600/20',
    DECLINED: 'bg-slate-100 text-slate-800 ring-slate-600/20',
    PAID: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
    CANCELED: 'bg-gray-100 text-gray-800 ring-gray-600/20',
  }[status]

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export default function RequestTable() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rows, setRows] = useState<BookingRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Profil und Anfragen laden
  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/login'
          return
        }

        const { data: me, error: pe } = await supabase
          .from('profiles')
          .select('id, display_name, role')
          .eq('id', user.id)
          .single<Profile>()

        if (pe) throw pe
        if (!me) throw new Error('Profil nicht gefunden')

        setProfile(me)

        let query = supabase
          .from('bookings')
          .select('id,status,created_at')
          .order('created_at', { ascending: false })

        if (me.role === 'MIDWIFE') {
          query = query.eq('midwife_id', me.id)
        } else if (me.role === 'CLIENT') {
          query = query.eq('client_id', me.id)
        }

        const { data: bookings, error: be } = await query
        if (be) throw be
        setRows(bookings ?? [])
      } catch (e: any) {
        setError(e?.message ?? 'Unbekannter Fehler')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Anfragen</h1>
        <p className="text-slate-600 mt-1">Hier findest du alle deine Anfragen und deren aktuellen Status.</p>
      </div>

      {loading && <div className="text-slate-500">Lade Anfragen…</div>}
      {error && <div className="text-red-600">Fehler: {error}</div>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Datum</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Aktion</th>
                <th className="px-4 py-3 text-left font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{new Date(r.created_at).toLocaleDateString('de-DE')}</td>
                  <td className="px-4 py-3"><Badge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {profile?.role === 'CLIENT' && r.status === 'CONFIRMED' ? (
                      <PayButton bookingId={r.id} />
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedId(r.id)} className="text-blue-600 hover:underline text-xs font-semibold">
                      Anzeigen
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    Keine Anfragen vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && profile && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedId(null)}>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden
          />
          <div 
            className="relative w-[440px] max-w-full bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <RequestDetailsSheet
              id={selectedId}
              role={profile.role}
              onClose={() => setSelectedId(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
