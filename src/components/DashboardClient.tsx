// src/components/DashboardClient.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import UpgradeButton from '@/components/UpgradeButton'

type Role = 'MIDWIFE' | 'CLIENT' | 'ADMIN'
type Profile = { id: string; display_name: string | null; role: Role }
type Status = 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'PAID' | 'CANCELED'
type BookingRow = { id: string; status: Status; midwife_id: string; client_id?: string }

// Stripe Price IDs
const PRICE_ID_MONTH = 'price_1Ry6zlFi50BYTrK6uG6CZU8d'
const PRICE_ID_YEAR  = 'price_1Ry6zlFi50BYTrK6jbqmr90R'

export default function DashboardClient({
  initialProfile,
  initialPlan,
}: {
  initialProfile: Profile
  initialPlan: 'FREE' | 'PRO'
}) {
  const [profile] = useState<Profile>(initialProfile)
  const [plan, setPlan] = useState<'FREE' | 'PRO'>(initialPlan)

  // MIDWIFE: offene (=REQUESTED) Anfragen
  const [pendingCount, setPendingCount] = useState<number>(0)

  // CLIENT: eigene Anfragen
  const [clientOpenCount, setClientOpenCount] = useState<number>(0)       // REQUESTED + CONFIRMED
  const [clientPayableCount, setClientPayableCount] = useState<number>(0) // CONFIRMED (nicht bezahlt)

  const [toast, setToast] = useState<string | null>(null)
  const myIdRef = useRef<string | null>(profile.id)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    audioRef.current = new Audio('/mixkit-long-pop-2358.wav')

    // initiale Zählungen
    if (profile.role === 'MIDWIFE') refreshPendingCount(profile.id)
    if (profile.role === 'CLIENT') refreshClientCounts(profile.id)

    // Optional: Plan zyklisch aktualisieren
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', profile.id)
        .single()
      if (!error && data?.plan && data.plan !== plan) setPlan(data.plan)
    }, 60000) // alle 60s
    return () => clearInterval(interval)
  }, [])

  // 🔁 Sofort nach Rückkehr vom Checkout (…/dashboard?upgraded=1) einmalig refetchen
  useEffect(() => {
    if (searchParams.get('upgraded') !== '1') return
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', profile.id)
        .single()
      if (!error && data?.plan) setPlan(data.plan as 'FREE' | 'PRO')
    })()
  }, [searchParams, profile.id])

  const prevPlanRef = useRef(plan)
  useEffect(() => {
    if (prevPlanRef.current === 'FREE' && plan === 'PRO') {
      triggerToast('Upgrade erfolgreich! Du bist jetzt Pro-Mitglied.')
    }
    prevPlanRef.current = plan
  }, [plan])

  // 🔴 Realtime: auf Plan-Änderungen in profiles hören (Webhook → UI aktualisiert sich sofort)
  useEffect(() => {
    const ch = supabase
      .channel(`profiles-plan-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` },
        (payload) => {
          const newPlan = (payload.new as any)?.plan
          if (newPlan && newPlan !== plan) setPlan(newPlan)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [profile.id, plan])

  // Realtime listener – MIDWIFE
  useEffect(() => {
    if (profile.role !== 'MIDWIFE' || !myIdRef.current) return

    const channel = supabase
      .channel(`bookings-badge-midwife-${myIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `midwife_id=eq.${myIdRef.current}` },
        (payload) => {
          const evt = payload.eventType
          const newRow = payload.new as BookingRow | null
          const oldRow = payload.old as BookingRow | null

          if (evt === 'INSERT' && newRow?.status === 'REQUESTED') {
            setPendingCount(c => c + 1)
            triggerToast('Neue Anfrage eingegangen!')
            return
          }
          if (evt === 'UPDATE') {
            const was = oldRow?.status, now = newRow?.status
            if (was === now) return
            if (was === 'REQUESTED' && now !== 'REQUESTED') {
              setPendingCount(c => Math.max(0, c - 1)); return
            }
            if (was !== 'REQUESTED' && now === 'REQUESTED') {
              setPendingCount(c => c + 1); triggerToast('Anfrage ist wieder offen!'); return
            }
          }
          if (evt === 'DELETE' && oldRow?.status === 'REQUESTED') {
            setPendingCount(c => Math.max(0, c - 1))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile.role])

  // Realtime listener – CLIENT
  useEffect(() => {
    if (profile.role !== 'CLIENT' || !myIdRef.current) return

    const channel = supabase
      .channel(`bookings-badge-client-${myIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `client_id=eq.${myIdRef.current}` },
        async () => { await refreshClientCounts(myIdRef.current!) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile.role])

  async function refreshPendingCount(midwifeId: string) {
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('midwife_id', midwifeId)
      .eq('status', 'REQUESTED')
    setPendingCount(count ?? 0)
  }

  async function refreshClientCounts(clientId: string) {
    const { count: openCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .in('status', ['REQUESTED', 'CONFIRMED'])
    setClientOpenCount(openCount ?? 0)

    const { count: payable } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'CONFIRMED')
    setClientPayableCount(payable ?? 0)
  }

  function triggerToast(message: string) {
    setToast(message)
    audioRef.current?.play().catch(() => {})
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fadeInOut">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Hallo {profile.display_name}, willkommen zurück.</p>
      </div>

      {plan === 'PRO' && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
          <p className="font-semibold">✅ Du nutzt Hebammen Pro.</p>
        </div>
      )}

      {profile.role === 'MIDWIFE' && (
        <div className="space-y-4">
          {plan === 'FREE' && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-slate-900">Upgrade auf Hebammen Pro</h2>
              <p className="text-sm text-slate-500 mt-2 mb-4">
                Mehr Sichtbarkeit, Premium-Features und bevorzugte Anfragen sichern.
              </p>
              <div className="flex gap-3 flex-wrap">
                <UpgradeButton priceId={PRICE_ID_MONTH} label="Monatlich upgraden" />
                <UpgradeButton priceId={PRICE_ID_YEAR}  label="Jährlich upgraden (-20%)" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 bg-white p-4 rounded-lg">
              <h3 className="font-semibold text-slate-800">Profil vervollständigen</h3>
              <p className="text-sm text-slate-500 mb-3">Stelle sicher, dass dein Profil aktuell ist.</p>
              <Link className="text-sm font-semibold text-blue-600 hover:text-blue-800" href="/onboarding">→ Profil bearbeiten</Link>
            </div>

            <div className="border border-slate-200 bg-white p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">Anfragen prüfen</h3>
                  <p className="text-sm text-slate-500 mb-3">Sieh dir deine offenen Anfragen an.</p>
                  <Link className="text-sm font-semibold text-blue-600 hover:text-blue-800" href="/dashboard/requests">→ Zu den Anfragen</Link>
                </div>
                {pendingCount > 0 && (
                  <span className="ml-3 inline-flex items-center justify-center text-xs font-bold px-2 py-1 h-6 w-6 rounded-full bg-pink-500 text-white">
                    {pendingCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {profile.role === 'CLIENT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 bg-white p-4 rounded-lg">
            <h3 className="font-semibold text-slate-800">Hebamme suchen</h3>
            <p className="text-sm text-slate-500 mb-3">Finde eine passende Hebamme in deiner Nähe.</p>
            <Link className="text-sm font-semibold text-blue-600 hover:text-blue-800" href="/search">→ Zur Suche</Link>
          </div>

          <div className="border border-slate-200 bg-white p-4 rounded-lg">
            <h3 className="font-semibold text-slate-800">Meine Anfragen</h3>
            <p className="text-sm text-slate-500 mb-3">
              Offen: {clientOpenCount} • Zu bezahlen: {clientPayableCount}
            </p>
            <Link className="text-sm font-semibold text-blue-600 hover:text-blue-800" href="/dashboard/requests">→ Anfragen verwalten</Link>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-slate-200">
        <button
          className="text-sm text-slate-600 hover:text-slate-900"
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
        >
          Logout
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fadeInOut { animation: fadeInOut 4s ease-in-out; }
      `}</style>
    </div>
  )
}
