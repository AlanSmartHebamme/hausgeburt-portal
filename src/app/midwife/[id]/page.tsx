// app/midwife/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import RequestButton from '@/components/RequestButton'



type Profile = {
  id: string
  display_name: string | null
  city: string | null
  postal_code: string | null
  radius_km: number | null
  bio: string | null            // kommt aus about
  qualifications: string | null
  phone: string | null
  // ⬇️ 'PERCENT' ergänzen, sonst meckert TS wenn im Datensatz PERCENT steht
  price_model: 'FIX' | 'PERCENT' | 'QUOTE' | null
}

// einfache Maskierung als Fallback im FE (Server-seitig ist sie eh geschützt)
function maskLocal(phone?: string | null) {
  if (!phone) return '—'
  const cleaned = phone.replace(/[\s\-]/g, '')
  if (cleaned.length <= 6) return cleaned
  return `${cleaned.slice(0,4)} •••• ${cleaned.slice(-3)}`
}

export default function MidwifePublicPage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      // Lese direkt aus der zentralen 'profiles' Tabelle
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, city, postal_code, radius_km, bio, qualifications, phone, price_model')
        .eq('id', id)
        .eq('role', 'MIDWIFE') // Stelle sicher, dass nur Hebammen-Profile angezeigt werden
        .maybeSingle()

      if (error) {
        console.error('Error fetching midwife profile:', error.message)
        setProfile(null)
      } else {
        setProfile(data as Profile)
      }
      setLoading(false)
    })()
  }, [id])

  if (loading) return <div className="p-4">Lädt…</div>
  if (!profile) return <div className="p-4">Profil nicht gefunden.</div>

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <a href="/search" className="text-sm underline">→ Zur Suche</a>

      <h1 className="text-2xl font-semibold">{profile.display_name ?? 'Hebamme'}</h1>
      <div className="text-sm text-muted-foreground">
        {profile.city} {profile.postal_code} · Radius: {profile.radius_km ?? 0} km
      </div>

      {profile.bio && (
        <>
          <h2 className="font-semibold">Über mich</h2>
          <p>{profile.bio}</p>
        </>
      )}

      {profile.qualifications && (
        <>
          <h2 className="font-semibold">Qualifikationen</h2>
          <p>{profile.qualifications}</p>
        </>
      )}

      <div className="text-sm">
        <span className="text-muted-foreground">Telefon (Freigabe nach Zahlung): </span>
        <span title="Die vollständige Telefonnummer wird automatisch nach erfolgreicher Zahlung freigeschaltet.">
          {maskLocal(profile.phone)} <span className="text-[11px] border rounded-full px-2 py-0.5 align-middle ml-1">🔒 nach Zahlung</span>
        </span>
      </div>

      <div className="border rounded p-3">
        <div className="text-xs text-muted-foreground mb-2">Preismodell: {profile.price_model ?? '—'}</div>

        {/* ⬇️ HIER: RequestButton korrekt einbinden – bekommt die Midwife-UUID */}
        <RequestButton midwifeId={profile.id} />
      </div>
    </div>
  )
}
