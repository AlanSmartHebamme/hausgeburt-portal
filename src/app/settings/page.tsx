'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

type Profile = {
  display_name: string | null
  bio: string | null
  phone: string | null
  postal_code: string | null
  city: string | null
}

export default function ProfileSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, bio, phone, postal_code, city')
          .eq('id', user.id)
          .single()
        
        if (error) {
          toast({ variant: 'destructive', title: 'Fehler', description: 'Profil konnte nicht geladen werden.' })
        } else if (data) {
          setProfile(data)
        }
      }
      setLoading(false)
    }
    fetchProfile()
  }, [toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile(prev => prev ? { ...prev, [name]: value } : null)
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          bio: profile.bio,
          phone: profile.phone,
          postal_code: profile.postal_code,
          city: profile.city,
        })
        .eq('id', user.id)

      if (error) {
        toast({ variant: 'destructive', title: 'Fehler', description: 'Profil konnte nicht gespeichert werden.' })
      } else {
        toast({ title: 'Gespeichert', description: 'Dein Profil wurde erfolgreich aktualisiert.' })
      }
    }
    setSaving(false)
  }

  if (loading) {
    return <Loader2 className="h-8 w-8 animate-spin" />
  }

  if (!profile) {
    return <p>Profil nicht gefunden.</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>
          Diese Informationen werden öffentlich in deinem Profil angezeigt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display_name">Anzeigename</Label>
          <Input id="display_name" name="display_name" value={profile.display_name || ''} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefonnummer</Label>
          <Input id="phone" name="phone" value={profile.phone || ''} onChange={handleInputChange} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postal_code">PLZ</Label>
            <Input id="postal_code" name="postal_code" value={profile.postal_code || ''} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Stadt</Label>
            <Input id="city" name="city" value={profile.city || ''} onChange={handleInputChange} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Über mich (Bio)</Label>
          <Textarea id="bio" name="bio" value={profile.bio || ''} onChange={handleInputChange} rows={4} />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Änderungen speichern
        </Button>
      </CardFooter>
    </Card>
  )
}
