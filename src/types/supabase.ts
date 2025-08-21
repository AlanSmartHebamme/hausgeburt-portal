export type Plan = 'FREE' | 'PRO'

export type Profile = {
  id: string
  display_name: string | null
  role: 'MIDWIFE' | 'CLIENT' | 'ADMIN'
  plan: Plan
  pro_until?: string | null
}
