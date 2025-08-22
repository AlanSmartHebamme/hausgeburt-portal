'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type Role = 'MIDWIFE' | 'CLIENT' | 'ADMIN'
type Status = 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'PAID' | 'CANCELED'

type BookingRow = {
  id: string
  status: Status
  created_at: string
  client_id: string | null
  midwife_id: string | null
  paid_at: string | null
  checkout_url: string | null
}

type OtherPartyProfile = {
  display_name: string | null
  city: string | null
  phone: string | null
}

type Dispute = {
  id: string
  status: 'OPEN' | 'RESOLVED'
}

type Booking = {
  id: string
  status: Status
  created_at: string
  paid_at: string | null
  checkout_url: string | null
  otherParty?: OtherPartyProfile | null
  dispute?: Dispute | null
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
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Booking | null>(null)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false)

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

      const otherPartyId = role === 'CLIENT' ? booking.midwife_id : booking.client_id
      let otherParty: OtherPartyProfile | null = null
      if (otherPartyId) {
        const { data: profileData } = await supabase.from('profiles').select('display_name,city,phone').eq('id', otherPartyId).maybeSingle<OtherPartyProfile>()
        if (profileData) otherParty = profileData
      }

      const { data: disputeData } = await supabase.from('disputes').select('id, status').eq('booking_id', booking.id).maybeSingle<Dispute>()

      setData({
        id: booking.id,
        status: booking.status,
        created_at: booking.created_at,
        paid_at: booking.paid_at,
        checkout_url: booking.checkout_url,
        otherParty,
        dispute: disputeData,
      })
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [id, role])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDisputeSubmit = async () => {
    if (!id || !disputeReason) return
    setIsSubmittingDispute(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('disputes').insert({
      booking_id: id,
      reporter_id: user.id,
      reason: disputeReason,
    })

    if (error) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Problem konnte nicht gemeldet werden.' })
    } else {
      toast({ title: 'Problem gemeldet', description: 'Das Team wird sich den Fall ansehen.' })
      setShowDisputeForm(false)
      setDisputeReason('')
      fetchData() // Refresh data to show dispute status
    }
    setIsSubmittingDispute(false)
  }

  const updateStatus = useCallback(async (newStatus: Status, note?: string) => {
    if (!id) return
    const { error } = await supabase.from('bookings').update({ status: newStatus, note }).eq('id', id)
    if (error) { alert(error.message); return }
    onUpdated?.(newStatus)
    await fetchData()
  }, [id, fetchData, onUpdated])

  const isPaid = useMemo(() => Boolean(data?.paid_at || data?.status === 'PAID'), [data])

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
          <div className="space-y-6">
            {data.dispute && (
              <div className="p-3 rounded-md bg-yellow-900/50 text-yellow-200 border border-yellow-700">
                <p className="font-bold">Ein Problem wurde für diese Anfrage gemeldet.</p>
                <p className="text-xs">Status: {data.dispute.status}</p>
              </div>
            )}
            <dl className="grid grid-cols-3 gap-y-3">
              {/* ... other details ... */}
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              {/* ... other buttons ... */}
            </div>

            <div className="pt-6 border-t border-neutral-800">
              {!showDisputeForm && (
                <button
                  onClick={() => setShowDisputeForm(true)}
                  disabled={!!data.dispute}
                  className="text-xs text-neutral-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {data.dispute ? 'Problem bereits gemeldet' : 'Problem mit dieser Anfrage melden'}
                </button>
              )}
              {showDisputeForm && (
                <div className="space-y-3">
                  <Label htmlFor="dispute_reason" className="font-semibold">Problem beschreiben</Label>
                  <textarea
                    id="dispute_reason"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full p-2 rounded-md bg-neutral-800 border border-neutral-700 text-sm"
                    rows={4}
                    placeholder="Bitte beschreibe das Problem so genau wie möglich."
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleDisputeSubmit} disabled={isSubmittingDispute || !disputeReason}>
                      {isSubmittingDispute ? 'Wird gesendet...' : 'Absenden'}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowDisputeForm(false)}>Abbrechen</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
