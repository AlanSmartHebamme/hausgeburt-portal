'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Plan } from '@/types/supabase'

type State = { loading: boolean; plan: Plan | null; error: string | null }

export function useUserPlan(): State {
  const [state, setState] = useState<State>({ loading: true, plan: null, error: null })

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const { data: { user }, error: uErr } = await supabase.auth.getUser()
        if (uErr) throw uErr
        if (!user) {
          if (mounted) setState({ loading: false, plan: null, error: 'not-auth' })
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('plan, pro_until')
          .eq('id', user.id)
          .single()

        if (error) throw error

        if (mounted) {
          setState({ loading: false, plan: (data?.plan ?? 'FREE') as Plan, error: null })
        }
      } catch (e: any) {
        if (mounted) setState({ loading: false, plan: null, error: e.message ?? 'error' })
      }
    })()

    return () => { mounted = false }
  }, [])

  return state
}
