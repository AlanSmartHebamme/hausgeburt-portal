'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Upload } from 'lucide-react'
import type { CheckedState } from '@radix-ui/react-checkbox'

// Typen
type Profile = {
  id: string
  display_name: string
  city: string
  postal_code: string
  radius: number
  phone: string
  bio: string
  qualifications: string[]
  price_model: string
  services: string[]
  languages: string[]
  status: 'DRAFT' | 'PENDING' | 'VERIFIED'
}

const requiredFields: (keyof Profile)[] = ['display_name', 'city', 'postal_code', 'radius', 'phone', 'bio', 'qualifications', 'price_model']

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Partial<Profile> | null>(null)
  const [completion, setCompletion] = useState(0)
  const [agreements, setAgreements] = useState({ dsgvo: false, agb: false, correct: false })

  const calculateCompletion = useCallback((p: Partial<Profile> | null) => {
    if (!p) return 0
    const filledFields = requiredFields.filter(field => {
      const value = p[field]
      if (Array.isArray(value)) return value.length > 0
      return !!value
    })
    return Math.round((filledFields.length / requiredFields.length) * 100)
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error) {
        toast({ variant: 'destructive', title: 'Fehler', description: 'Profil konnte nicht geladen werden.' })
      } else {
        setProfile(data)
        setCompletion(calculateCompletion(data))
      }
      setLoading(false)
    }
    fetchProfile()
  }, [router, toast, calculateCompletion])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const updatedProfile = { ...profile, [name]: value }
    setProfile(updatedProfile)
    setCompletion(calculateCompletion(updatedProfile))
  }
  
  const handleArrayChange = (name: keyof Profile, value: string) => {
    const values = value.split(',').map(s => s.trim()).filter(Boolean)
    const updatedProfile = { ...profile, [name]: values }
    setProfile(updatedProfile)
    setCompletion(calculateCompletion(updatedProfile))
  }

  const handleSave = async (newStatus?: Profile['status']) => {
    if (!profile || !profile.id) return
    setSaving(true)

    const updateData = { ...profile }
    if (newStatus) {
      updateData.status = newStatus
    }

    const { error } = await supabase.from('profiles').update(updateData).eq('id', profile.id)
    
    if (error) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Änderungen konnten nicht gespeichert werden.' })
    } else {
      toast({ title: 'Gespeichert!', description: `Dein Profil wurde als ${newStatus === 'PENDING' ? 'Prüfung eingereicht' : 'Entwurf gespeichert'}.` })
    }
    setSaving(false)
  }

  const isSubmittable = completion === 100 && agreements.dsgvo && agreements.agb && agreements.correct

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dein Hebammen-Profil</h1>
        <p className="text-muted-foreground">Fülle dein Profil sorgfältig aus. Diese Informationen sind für Klientinnen auf deiner öffentlichen Profilseite sichtbar.</p>
      </header>

      <div className="sticky top-[65px] z-10 bg-background/95 backdrop-blur-sm py-4 -my-4">
        <div className="flex items-center gap-4">
          <Progress value={completion} className="h-2" />
          <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">{completion}% vollständig</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Basis-Informationen */}
          <Card>
            <CardHeader>
              <CardTitle>Basis-Informationen</CardTitle>
              <CardDescription>Dies sind die wichtigsten Angaben für die Suche.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Anzeigename</Label>
                <Input id="display_name" name="display_name" value={profile?.display_name || ''} onChange={handleInputChange} placeholder="Vor- & Nachname oder Praxisname" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Stadt</Label>
                  <Input id="city" name="city" value={profile?.city || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postleitzahl</Label>
                  <Input id="postal_code" name="postal_code" value={profile?.postal_code || ''} onChange={handleInputChange} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefonnummer</Label>
                  <Input id="phone" name="phone" type="tel" value={profile?.phone || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radius">Einsatzradius (in km)</Label>
                  <Input id="radius" name="radius" type="number" value={profile?.radius || ''} onChange={handleInputChange} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profil-Details */}
          <Card>
            <CardHeader>
              <CardTitle>Profil-Details</CardTitle>
              <CardDescription>Erzähle mehr über dich und deine Arbeit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Über mich (Bio)</Label>
                <Textarea id="bio" name="bio" value={profile?.bio || ''} onChange={handleInputChange} rows={6} placeholder="Mindestens 200 Zeichen..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifikationen</Label>
                <Textarea id="qualifications" name="qualifications" value={Array.isArray(profile?.qualifications) ? profile.qualifications.join(', ') : ''} onChange={(e) => handleArrayChange('qualifications', e.target.value)} placeholder="Ausbildung, Zusatzkurse (durch Komma getrennt)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="languages">Sprachen</Label>
                <Input id="languages" name="languages" value={Array.isArray(profile?.languages) ? profile.languages.join(', ') : ''} onChange={(e) => handleArrayChange('languages', e.target.value)} placeholder="Deutsch, Englisch, Türkisch..." />
              </div>
            </CardContent>
          </Card>

          {/* Angebote & Preise */}
          <Card>
            <CardHeader>
              <CardTitle>Angebote & Preise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price_model">Preis-/Abrechnungsmodell</Label>
                <Select name="price_model" value={profile?.price_model || ''} onValueChange={(value: string) => setProfile(prev => prev ? {...prev, price_model: value} : null)}>
                  <SelectTrigger><SelectValue placeholder="Bitte auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kassenleistung">Kassenleistung</SelectItem>
                    <SelectItem value="Privatleistung">Privatleistung</SelectItem>
                    <SelectItem value="Festpreis">Festpreis</SelectItem>
                    <SelectItem value="Auf Anfrage">Auf Anfrage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* Verifizierung */}
          <Card>
            <CardHeader>
              <CardTitle>Verifizierung</CardTitle>
              <CardDescription>Lade deine Nachweise hoch, um dein Profil zu veröffentlichen.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full"><Upload className="h-4 w-4 mr-2" /> Dokumente hochladen</Button>
              <p className="text-xs text-muted-foreground mt-2">Akzeptiert: PDF, JPG, PNG. Max. 5MB.</p>
            </CardContent>
          </Card>

          {/* Rechtliches & Veröffentlichung */}
          <Card>
            <CardHeader>
              <CardTitle>Veröffentlichung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox id="agb" checked={agreements.agb} onCheckedChange={(checked: CheckedState) => setAgreements(prev => ({...prev, agb: !!checked}))} />
                <Label htmlFor="agb" className="text-xs">Ich akzeptiere die <Link href="/agb" className="underline">AGB</Link>.</Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox id="dsgvo" checked={agreements.dsgvo} onCheckedChange={(checked: CheckedState) => setAgreements(prev => ({...prev, dsgvo: !!checked}))} />
                <Label htmlFor="dsgvo" className="text-xs">Ich stimme der <Link href="/datenschutz" className="underline">Datenschutzerklärung</Link> zu.</Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox id="correct" checked={agreements.correct} onCheckedChange={(checked: CheckedState) => setAgreements(prev => ({...prev, correct: !!checked}))} />
                <Label htmlFor="correct" className="text-xs">Meine Angaben sind korrekt und können überprüft werden.</Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button variant="secondary" className="w-full" onClick={() => handleSave('DRAFT')} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entwurf speichern'}
              </Button>
              <Button className="w-full" onClick={() => handleSave('PENDING')} disabled={!isSubmittable || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Zur Prüfung einreichen'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
