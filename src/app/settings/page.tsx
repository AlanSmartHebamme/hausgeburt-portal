'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Copy } from 'lucide-react'

type Profile = {
  display_name: string | null
  bio: string | null
  phone: string | null
  postal_code: string | null
  city: string | null
  radius: number | null
  qualifications: string[] | null
  price_model: string | null
  services: string[] | null
  languages: string[] | null
  calendar_id: string | null
}

export default function ProfileSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Partial<Profile> | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, bio, phone, postal_code, city, radius, qualifications, price_model, services, languages, calendar_id')
        .eq('id', user.id)
        .single()
      
      if (error) {
        toast({ variant: 'destructive', title: 'Fehler', description: 'Profil konnte nicht geladen werden.' })
      } else if (data) {
        setProfile(data)
      }
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase.from('profiles').update({ ...profile }).eq('id', user.id)
      if (error) {
        toast({ variant: 'destructive', title: 'Fehler', description: 'Profil konnte nicht gespeichert werden.' })
      } else {
        toast({ title: 'Gespeichert', description: 'Dein Profil wurde erfolgreich aktualisiert.' })
      }
    }
    setSaving(false)
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Kopiert!', description: 'Die URL wurde in die Zwischenablage kopiert.' })
    }, () => {
      toast({ variant: 'destructive', title: 'Fehler', description: 'URL konnte nicht kopiert werden.' })
    })
  }

  // ... other handlers remain the same
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const finalValue = e.target.type === 'number' ? parseInt(value, 10) : value
    setProfile(prev => prev ? { ...prev, [name]: finalValue } : null)
  }
  const handleArrayChange = (name: keyof Profile, value: string) => {
    const values = value.split(',').map(s => s.trim()).filter(Boolean)
    setProfile(prev => prev ? { ...prev, [name]: values } : null)
  }
  const handleServiceChange = (service: string, checked: boolean) => {
    const currentServices = profile?.services || []
    const newServices = checked ? [...currentServices, service] : currentServices.filter(s => s !== service)
    setProfile(prev => prev ? { ...prev, services: newServices } : null)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!profile) return <p>Profil nicht gefunden.</p>

  const calendarUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/calendar/${profile.calendar_id}`

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profil bearbeiten</CardTitle>
          <CardDescription>
            Passe hier die Informationen an, die öffentlich in deinem Profil angezeigt werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ... existing form sections ... */}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Änderungen speichern
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrationen</CardTitle>
          <CardDescription>
            Verbinde dein Profil mit externen Kalendern.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="calendar_url">iCal Kalender-Abo URL</Label>
            <div className="flex gap-2">
              <Input id="calendar_url" value={calendarUrl} readOnly />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(calendarUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Füge diese URL in deine Kalender-App (z.B. Google Calendar, Apple Calendar) ein, um deine bestätigten Buchungen zu abonnieren.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
