'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { RequestDetailsSheet } from './RequestDetailsSheet'
import { RequestActions, type Status } from './RequestActions'

type Role = 'MIDWIFE' | 'CLIENT' | 'ADMIN'

type Profile = {
  id: string
  display_name: string | null
  role: Role
}

type BookingRow = {
  id: string
  status: Status
  created_at: string
  midwife_id: string
  client_id: string
  is_boosted: boolean
  midwife: { display_name: string | null } | null
  client: { display_name: string | null } | null
}

const TABLE_NAME = 'bookings'

function getStatusLabel(status: Status, role: Role) {
  if (role === 'MIDWIFE') {
    const map = {
      REQUESTED: 'Neue Anfrage',
      CONFIRMED: 'Bestätigt',
      DECLINED: 'Abgelehnt',
      PAID: 'Bezahlt',
      CANCELED: 'Storniert',
    } as const
    return map[status]
  }
  const map = {
    REQUESTED: 'Angefragt',
    CONFIRMED: 'Bestätigt',
    DECLINED: 'Abgelehnt',
    PAID: 'Bezahlt',
    CANCELED: 'Storniert',
  } as const
  return map[status]
}

function Badge({ status, role }: { status: Status; role: Role }) {
  const cls = {
    REQUESTED: 'bg-amber-600/70',
    CONFIRMED: 'bg-blue-600/80',
    DECLINED: 'bg-gray-600/80',
    PAID: 'bg-emerald-700/80',
    CANCELED: 'bg-neutral-700/70',
  }[status]
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-white ${cls}`}>
      {getStatusLabel(status, role)}
    </span>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rows, setRows] = useState<BookingRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Profil + initiale Buchungen
  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/login'; return }

        const { data: me, error: pe } = await supabase
          .from('profiles')
          .select('id, display_name, role')
          .eq('id', user.id)
          .single<Profile>()
        if (pe) throw pe
        if (!me) throw new Error('Profil nicht gefunden')
        setProfile(me)

        const query = supabase
          .from(TABLE_NAME)
          .select('id, status, created_at, midwife_id, client_id, is_boosted, midwife:midwife_id(display_name), client:client_id(display_name)')
          .order('created_at', { ascending: false })

        if (me.role === 'MIDWIFE') query.eq('midwife_id', me.id)
        else if (me.role === 'CLIENT') query.eq('client_id', me.id)

        const { data: bookings, error: be } = await query as { data: any[], error: any }
        if (be) throw be
        
        // Transformiere die Daten, um das Array-Problem zu lösen
        const transformedBookings = bookings.map(b => ({
          ...b,
          midwife: Array.isArray(b.midwife) ? b.midwife[0] : b.midwife,
          client: Array.isArray(b.client) ? b.client[0] : b.client,
        }))
        
        setRows(transformedBookings ?? [])
      } catch (e: any) {
        setError(e?.message ?? 'Unbekannter Fehler')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Realtime
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('bookings-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, (payload: any) => {
        setRows(prev => {
          const newRow = payload.new as BookingRow
          if (profile.role === 'MIDWIFE' && newRow.midwife_id !== profile.id) return prev
          if (profile.role === 'CLIENT' && newRow.client_id !== profile.id) return prev

          const idx = prev.findIndex(r => r.id === newRow.id)
          if (idx === -1) return [newRow, ...prev].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          const copy = [...prev]; copy[idx] = { ...copy[idx], ...newRow }
          return copy.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const infoText = useMemo(
    () => 'NACH ZAHLUNG Telefonnummer wird erst nach erfolgreicher Zahlung vollständig sichtbar.',
    []
  )

  function handleUpdated(id: string, status: Status) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, status } : r)))
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Anfragen</h1>
        <div className="text-xs rounded-md bg-neutral-800 px-3 py-1 text-neutral-300">{infoText}</div>
      </div>

      {loading && <div className="text-neutral-400">Lade…</div>}
      {error && <div className="text-red-400">Fehler: {error}</div>}

      {!loading && !error && profile && (
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-900/60 text-neutral-300">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{profile.role === 'CLIENT' ? 'Hebamme' : 'Klientin'}</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Anfragedatum</th>
                {profile.role === 'MIDWIFE' && <th className="px-4 py-3 text-left font-medium">Aktion</th>}
                <th className="px-4 py-3 text-left font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-900/40">
                  <td className="px-4 py-3 font-medium">
                    {profile.role === 'CLIENT' ? r.midwife?.display_name : r.client?.display_name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge status={r.status} role={profile.role} />
                      {profile.role === 'CLIENT' && r.is_boosted && (
                        <span title="Diese PRO-Anfrage wartet seit über 24 Stunden auf eine Antwort." className="text-base">🔥</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>

                  {profile.role === 'MIDWIFE' && (
                    <td className="px-4 py-3">
                      {r.status === 'REQUESTED'
                        ? <RequestActions id={r.id} onUpdated={(s: Status) => handleUpdated(r.id, s)} />
                        : <span className="text-neutral-500 text-xs">—</span>}
                    </td>
                  )}

                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedId(r.id)} className="text-sm underline decoration-dotted">
                      Ansehen
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={profile?.role === 'MIDWIFE' ? 5 : 4} className="px-4 py-6 text-center text-neutral-400">
                    Keine Anfragen vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && profile && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setSelectedId(null)} aria-hidden />
          <div className="w-[440px] max-w-full bg-neutral-950 border-l border-neutral-800">
            <RequestDetailsSheet
              id={selectedId}
              role={profile.role}
              onUpdated={(s: Status) => handleUpdated(selectedId, s)}
              onClose={() => setSelectedId(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
