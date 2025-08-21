'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Role = 'MIDWIFE' | 'CLIENT' | 'ADMIN'
type Status = 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'PAID' | 'CANCELED'

type BookingRow = {
  id: string
  status: Status
  created_at: string
  client_id: string | null
  midwife_id: string | null // Add midwife_id
  paid_at: string | null
  checkout_url: string | null
}

type OtherPartyProfile = {
  display_name: string | null
  city: string | null
  phone: string | null
}

type Booking = {
  id: string
  status: Status
  created_at: string
  paid_at: string | null
  checkout_url: string | null
  otherParty?: OtherPartyProfile | null
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
    REQUESTED: 'bg-amber-600/70',
    CONFIRMED: 'bg-blue-600/80',
    DECLINED: 'bg-gray-600/80',
    PAID: 'bg-emerald-700/80',
    CANCELED: 'bg-neutral-700/70',
  }[status]
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-white ${cls}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function fmtDate(ts?: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

export function RequestDetailsSheet({
  id,
  role,
  onClose,
  onUpdated,
}: {
  id: string | null
  role: Role
  onClose: () => void
  onUpdated?: (s: Status) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Booking | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const { data: booking, error: be } = await supabase
        .from('bookings')
        .select('id,status,created_at,client_id,midwife_id,paid_at,checkout_url')
        .eq('id', id)
        .single<BookingRow>()
      if (be) throw be
      if (!booking) throw new Error('Buchung nicht gefunden')

      // Fetch the profile of the OTHER party in the booking
      const otherPartyId = role === 'CLIENT' ? booking.midwife_id : booking.client_id
      let otherParty: OtherPartyProfile | null = null
      if (otherPartyId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name,city,phone')
          .eq('id', otherPartyId)
          .maybeSingle<OtherPartyProfile>()
        if (profileData) otherParty = profileData
      }

      setData({
        id: booking.id,
        status: booking.status,
        created_at: booking.created_at,
        paid_at: booking.paid_at,
        checkout_url: booking.checkout_url,
        otherParty,
      })
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const updateStatus = useCallback(async (newStatus: Status, note?: string) => {
    if (!id) return
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus, note })
      .eq('id', id)               // ohne .single()
    if (error) { alert(error.message); return }
    onUpdated?.(newStatus)
    await fetchData()
  }, [id, fetchData, onUpdated])

  const isClient = role === 'CLIENT'
  const isMidwife = role === 'MIDWIFE'
  const isPaid = useMemo(() => Boolean(data?.paid_at || data?.status === 'PAID'), [data])
  const canClientPay = useMemo(
    () => isClient && !isPaid && data?.status === 'CONFIRMED' && Boolean(data?.checkout_url),
    [isClient, isPaid, data]
  )
  const canMidwifeCopyLink = useMemo(
    () => isMidwife && !isPaid && Boolean(data?.checkout_url),
    [isMidwife, isPaid, data]
  )

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Anfrage-Details</h2>
        <button className="rounded-md px-2 py-1 text-sm border border-neutral-700 hover:bg-neutral-800" onClick={onClose}>
          Schließen
        </button>
      </div>

      <div className="p-6 flex-1 overflow-auto text-sm">
        {loading && <div className="text-neutral-400">Lade…</div>}
        {error && <div className="text-red-400">Fehler: {error}</div>}
        {!loading && !error && data && (
          <>
            <dl className="grid grid-cols-3 gap-y-3">
              <dt className="text-neutral-400">ID</dt>
              <dd className="col-span-2 truncate">{data.id}</dd>

              <dt className="text-neutral-400">Status</dt>
              <dd className="col-span-2"><Badge status={data.status} /></dd>

              <dt className="text-neutral-400">Datum</dt>
              <dd className="col-span-2">{fmtDate(data.created_at)}</dd>

              <dt className="text-neutral-400">{role === 'CLIENT' ? 'Hebamme' : 'Klient'}</dt>
              <dd className="col-span-2">{data.otherParty?.display_name ?? '—'}</dd>

              <dt className="text-neutral-400">Stadt</dt>
              <dd className="col-span-2">{data.otherParty?.city ?? '—'}</dd>

              <dt className="text-neutral-400">Telefon</dt>
              <dd className="col-span-2">
                {isPaid ? (data.otherParty?.phone ?? '—') : <span className="text-red-400">Kontakt erst nach Zahlung sichtbar.</span>}
              </dd>

              <dt className="text-neutral-400">Nachricht</dt>
              <dd className="col-span-2">—</dd>
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              {isClient && canClientPay && (
                <button
                  className="rounded-md px-3 py-2 bg-blue-600 text-white hover:bg-blue-500"
                  onClick={() => {
                    if (data?.checkout_url) window.location.href = data.checkout_url
                    else alert('Zahlungslink nicht verfügbar.')
                  }}
                >
                  Jetzt bezahlen
                </button>
              )}
              {isMidwife && data.status === 'REQUESTED' && (
                <>
                  <button
                    className="rounded-md px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-500"
                    onClick={() => updateStatus('CONFIRMED')}
                  >
                    Bestätigen
                  </button>
                  <button
                    className="rounded-md px-3 py-2 bg-rose-600 text-white hover:bg-rose-500"
                    onClick={() => {
                      const note = prompt('Optionale Nachricht an den Klienten (Ablehnung):') ?? undefined
                      updateStatus('DECLINED', note)
                    }}
                  >
                    Ablehnen
                  </button>
                </>
              )}
              {isMidwife && canMidwifeCopyLink && (
                <button
                  className="rounded-md px-3 py-2 bg-neutral-700 text-white hover:bg-neutral-600"
                  onClick={async () => {
                    if (!data?.checkout_url) return alert('Kein Zahlungslink verfügbar.')
                    try { await navigator.clipboard.writeText(data.checkout_url); alert('Zahlungslink kopiert.') }
                    catch { alert('Kopieren nicht möglich.') }
                  }}
                >
                  Zahlungslink kopieren
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
