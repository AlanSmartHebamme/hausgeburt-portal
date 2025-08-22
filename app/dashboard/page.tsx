'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Loader2, AlertCircle, Briefcase, Check, UserCircle, Settings, Edit, Eye, Star } from 'lucide-react'

// Strikte Typen
type Role = 'MIDWIFE' | 'CLIENT' | 'ADMIN'
type Status = 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'PAID' | 'CANCELED'
type Profile = {
  id: string
  display_name: string | null
  role: Role
  city: string | null
  postal_code: string | null
  bio: string | null
  qualifications: string[] | null
  phone: string | null
  price_model: string | null
}
type BookingStats = {
  requested: number
  confirmed: number
}

// Helper zur Berechnung des Profil-Status
const calculateProfileCompletion = (profile: Partial<Profile>): number => {
  const fields = ['city', 'postal_code', 'bio', 'qualifications', 'phone', 'price_model']
  const filledFields = fields.filter(field => {
    const value = profile[field as keyof Profile]
    if (Array.isArray(value)) return value.length > 0
    return !!value
  })
  const percentage = Math.round((filledFields.length / fields.length) * 100)
  return percentage
}

export default function MidwifeDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<BookingStats>({ requested: 0, confirmed: 0 })
  const [completion, setCompletion] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profileData) {
        console.error('Error fetching profile:', profileError)
        setError('Profil konnte nicht geladen werden.')
        setLoading(false)
        return
      }
      
      if (profileData.role !== 'MIDWIFE') {
        setError('Dieses Dashboard ist nur für Hebammen verfügbar.')
        setLoading(false)
        return
      }

      setProfile(profileData as Profile)
      setCompletion(calculateProfileCompletion(profileData))

      const { count: requestedCount } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('midwife_id', user.id).eq('status', 'REQUESTED')
      const { count: confirmedCount } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('midwife_id', user.id).eq('status', 'CONFIRMED')

      setStats({
        requested: requestedCount ?? 0,
        confirmed: confirmedCount ?? 0,
      })

      setLoading(false)
    }
    fetchData()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Ein Fehler ist aufgetreten</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Seite neu laden</Button>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Willkommen zurück, {profile.display_name} 👋</h1>
        <p className="text-muted-foreground">Schön, dich wiederzusehen. Hier ist dein Überblick für heute.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offene Anfragen</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.requested}</div>
            {stats.requested > 0 && <p className="text-xs text-muted-foreground mt-1">Handlung erforderlich</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bestätigte Anfragen</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profil-Status</CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{completion}%</div>
            <Progress value={completion} aria-label={`${completion}% Profil vollständig`} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nächste Schritte</CardTitle>
              <CardDescription>Hier sind deine wichtigsten Aufgaben.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-background hover:bg-secondary transition-colors">
                <div>
                  <h4 className="font-semibold">Profil vervollständigen</h4>
                  <p className="text-sm text-muted-foreground">Ein vollständiges Profil schafft Vertrauen.</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/profile"><Edit className="h-4 w-4 mr-2" /> Bearbeiten</Link>
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border bg-background hover:bg-secondary transition-colors">
                <div>
                  <h4 className="font-semibold">Anfragen prüfen</h4>
                  <p className="text-sm text-muted-foreground">Antworte schnell auf neue Anfragen.</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/requests">
                    Anzeigen {stats.requested > 0 && <Badge variant="destructive" className="ml-2">{stats.requested}</Badge>}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center"><Star className="h-4 w-4 mr-2 text-yellow-500" />Upgrade auf Hebammen Pro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Mehr Sichtbarkeit</li>
              <li>Bevorzugte Anfragen</li>
              <li>Premium-Features</li>
            </ul>
            <div className="flex flex-col gap-2">
              <Button>Monatlich upgraden</Button>
              <Button variant="outline">Jährlich upgraden (-20%)</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Schnellzugriff</h3>
        <Separator className="mb-4" />
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" asChild><Link href="/profile/me"><Eye className="h-4 w-4 mr-2" />Profil ansehen</Link></Button>
          <Button variant="ghost" asChild><Link href="/dashboard/requests"><Briefcase className="h-4 w-4 mr-2" />Zu den Anfragen</Link></Button>
          <Button variant="ghost" asChild><Link href="/settings"><Settings className="h-4 w-4 mr-2" />Einstellungen</Link></Button>
        </div>
      </div>
    </div>
  )
}
