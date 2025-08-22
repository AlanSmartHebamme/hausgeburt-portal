'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import UpgradeButton from '@/components/UpgradeButton'
import { useToast } from '@/hooks/use-toast'

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
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [clientOpenCount, setClientOpenCount] = useState<number>(0)
  const [clientPayableCount, setClientPayableCount] = useState<number>(0)
  const [stats, setStats] = useState<{ view_count: number, request_count: number, acceptance_rate: number } | null>(null)
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    // Wenn der Nutzer von Stripe zurückkehrt, aktualisiere den Plan im UI
    if (searchParams.get('upgraded') === '1') {
      setPlan('PRO')
      toast({
        title: 'Upgrade erfolgreich!',
        description: 'Willkommen bei Hebammen Pro.',
        variant: 'default',
      })
    }
  }, [searchParams, toast])

  useEffect(() => {
    if (profile.role === 'MIDWIFE') {
      refreshPendingCount(profile.id)
      if (plan === 'PRO') {
        fetchStats(profile.id)
      }
    }
    if (profile.role === 'CLIENT') {
      refreshClientCounts(profile.id)
    }
  }, [profile.id, profile.role, plan])

  async function fetchStats(midwifeId: string) {
    const { data, error } = await supabase.rpc('get_profile_stats', { p_midwife_id: midwifeId }).single()
    // More robust check to ensure data is a non-null object with the expected properties before setting state
    if (!error && data && typeof data === 'object' && data !== null && 'view_count' in data) {
      setStats(data as { view_count: number, request_count: number, acceptance_rate: number });
    }
  }

  async function refreshPendingCount(midwifeId: string) {
    const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('midwife_id', midwifeId).eq('status', 'REQUESTED')
    setPendingCount(count ?? 0)
  }

  async function refreshClientCounts(clientId: string) {
    const { count: openCount } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('client_id', clientId).in('status', ['REQUESTED', 'CONFIRMED'])
    setClientOpenCount(openCount ?? 0)
    const { count: payable } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'CONFIRMED')
    setClientPayableCount(payable ?? 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1">Hallo {profile.display_name}, willkommen zurück.</p>
      </div>

      {plan === 'PRO' && (
        <div className="rounded-lg border bg-green-100 p-4 text-green-800">
          <p className="font-semibold">✅ Du nutzt Hebammen Pro.</p>
        </div>
      )}

      {/* MIDWIFE - PRO VIEW */}
      {profile.role === 'MIDWIFE' && plan === 'PRO' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border p-4 rounded-lg bg-slate-50 md:col-span-2">
              <h3 className="font-semibold mb-4">Deine Statistiken</h3>
              {stats ? (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{stats.view_count}</p>
                    <p className="text-xs text-muted-foreground">Profilaufrufe</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.request_count}</p>
                    <p className="text-xs text-muted-foreground">Anfragen</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.acceptance_rate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Akzeptanzrate</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Statistiken werden geladen...</p>
              )}
            </div>
            <div className="border p-4 rounded-lg">
              <h3 className="font-semibold">Verfügbarkeit</h3>
              <p className="text-sm mb-3">Verwalte deine buchbaren Zeiträume.</p>
              <Link className="text-sm font-semibold text-blue-600 hover:text-blue-800" href="/dashboard/availability">→ Zur Verfügbarkeit</Link>
            </div>
            <div className="border p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Anfragen prüfen</h3>
                  <p className="text-sm mb-3">Sieh dir deine offenen Anfragen an.</p>
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

      {/* MIDWIFE - FREE VIEW */}
      {profile.role === 'MIDWIFE' && plan === 'FREE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border p-4 rounded-lg">
                <h3 className="font-semibold">Profil vervollständigen</h3>
                <p className="text-sm mb-3">Stelle sicher, dass dein Profil aktuell ist.</p>
                <Link className="text-sm font-semibold text-blue-600 hover:text-blue-800" href="/onboarding">→ Profil bearbeiten</Link>
              </div>

              <div className="border p-4 rounded-lg">
                <h3 className="font-semibold">Verfügbarkeit</h3>
                <p className="text-sm mb-3">Verwalte deine buchbaren Zeiträume.</p>
                <Link className="text-sm font-semibold text-blue-600 hover:text-blue-800" href="/dashboard/availability">→ Zur Verfügbarkeit</Link>
              </div>

              <div className="border p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Anfragen prüfen</h3>
                    <p className="text-sm mb-3">Sieh dir deine offenen Anfragen an.</p>
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

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border p-6 bg-slate-50">
              <h2 className="text-xl font-semibold">Upgrade auf Hebammen Pro</h2>
              <p className="text-sm mt-2 mb-4">
                Mehr Sichtbarkeit, Premium-Features und bevorzugte Anfragen sichern.
              </p>
              <div className="flex flex-col gap-3">
                <UpgradeButton priceId={PRICE_ID_MONTH} label="Monatlich upgraden" />
                <UpgradeButton priceId={PRICE_ID_YEAR}  label="Jährlich upgraden (-20%)" />
              </div>
            </div>
          </div>
        </div>
      )}

      {profile.role === 'CLIENT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border p-4 rounded-lg">
            <h3 className="font-semibold">Hebamme suchen</h3>
            <p className="text-sm mb-3">Finde eine passende Hebamme in deiner Nähe.</p>
            <Link className="text-sm font-semibold text-blue-600 hover:text-blue-800" href="/search">→ Zur Suche</Link>
          </div>

          <div className="border p-4 rounded-lg">
            <h3 className="font-semibold">Meine Anfragen</h3>
            <p className="text-sm mb-3">
              Offen: {clientOpenCount} • Zu bezahlen: {clientPayableCount}
            </p>
            <Link className="text-sm font-semibold text-blue-600 hover:text-blue-800" href="/dashboard/requests">→ Anfragen verwalten</Link>
          </div>
        </div>
      )}

      <div className="pt-4 border-t">
        <button
          className="text-sm hover:underline"
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
