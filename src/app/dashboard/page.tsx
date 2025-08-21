// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import DashboardClient from '@/components/DashboardClient'

type ProfileRow = {
  id: string
  display_name: string | null
  role: 'MIDWIFE' | 'CLIENT' | 'ADMIN'
  plan: 'FREE' | 'PRO'
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileRow | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // 1) Clientseitig User holen (kein SSR, keine Cookies nötig)
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        router.replace('/login')
        return
      }

      // 2) Profil laden
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('id, display_name, role, plan')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      if (error) {
        console.error('profiles load error:', error.message)
        router.replace('/onboarding')
        return
      }

      if (!prof) {
        router.replace('/onboarding')
        return
      }

      setProfile(prof as ProfileRow)
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [router])

  if (loading) return null

  // 3) Fertiges Dashboard rendern
  return (
    <DashboardClient
      initialProfile={{
        id: profile!.id,
        display_name: profile!.display_name,
        role: profile!.role,
      }}
      initialPlan={profile!.plan}
    />
  )
}
