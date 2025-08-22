'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
import { Loader2, Upload, Trash2, FileText, ImageIcon } from 'lucide-react'
import type { CheckedState } from '@radix-ui/react-checkbox'
import { v4 as uuidv4 } from 'uuid'

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

type ProfileMedia = {
  id: string
  storage_path: string
  file_name: string
  media_type: 'GALLERY' | 'CERTIFICATE'
  url?: string
}

const requiredFields: (keyof Profile)[] = ['display_name', 'city', 'postal_code', 'radius', 'phone', 'bio', 'qualifications', 'price_model', 'services']

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [profile, setProfile] = useState<Partial<Profile> | null>(null)
  const [profileMedia, setProfileMedia] = useState<ProfileMedia[]>([])
  const [completion, setCompletion] = useState(0)
  const [agreements, setAgreements] = useState({ dsgvo: false, agb: false, correct: false })
  
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const certificateInputRef = useRef<HTMLInputElement>(null)

  const calculateCompletion = useCallback((p: Partial<Profile> | null) => {
    if (!p) return 0
    const filledFields = requiredFields.filter(field => {
      const value = p[field]
      if (Array.isArray(value)) return value.length > 0
      return !!value
    })
    return Math.round((filledFields.length / requiredFields.length) * 100)
  }, [])

  const fetchMedia = useCallback(async (profileId: string) => {
    const { data, error } = await supabase.from('profile_media').select('*').eq('profile_id', profileId)
    if (error) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Medien konnten nicht geladen werden.' })
      return []
    }
    // Get public URLs for gallery images
    const mediaWithUrls = data.map(item => {
      if (item.media_type === 'GALLERY') {
        const { data: { publicUrl } } = supabase.storage.from('profile_media').getPublicUrl(item.storage_path)
        return { ...item, url: publicUrl }
      }
      return item
    })
    return mediaWithUrls
  }, [toast])

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
        const media = await fetchMedia(user.id)
        setProfileMedia(media)
      }
      setLoading(false)
    }
    fetchProfile()
  }, [router, toast, calculateCompletion, fetchMedia])

  const handleFileUpload = async (file: File, mediaType: 'GALLERY' | 'CERTIFICATE') => {
    if (!profile || !profile.id) return
    setIsUploading(true)
    
    const fileExt = file.name.split('.').pop()
    const filePath = `${profile.id}/${uuidv4()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('profile_media').upload(filePath, file)
    if (uploadError) {
      toast({ variant: 'destructive', title: 'Upload Fehler', description: uploadError.message })
      setIsUploading(false)
      return
    }

    const { error: insertError } = await supabase.from('profile_media').insert({
      profile_id: profile.id,
      storage_path: filePath,
      file_name: file.name,
      media_type: mediaType,
    })

    if (insertError) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Datei-Metadaten konnten nicht gespeichert werden.' })
    } else {
      toast({ title: 'Erfolgreich!', description: `${mediaType === 'GALLERY' ? 'Bild' : 'Zertifikat'} wurde hochgeladen.` })
      const media = await fetchMedia(profile.id)
      setProfileMedia(media)
    }
    setIsUploading(false)
  }

  const handleFileDelete = async (mediaItem: ProfileMedia) => {
    if (!profile || !profile.id) return

    const { error: storageError } = await supabase.storage.from('profile_media').remove([mediaItem.storage_path])
    if (storageError) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Datei konnte nicht aus dem Storage gelöscht werden.' })
      return
    }

    const { error: dbError } = await supabase.from('profile_media').delete().eq('id', mediaItem.id)
    if (dbError) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Datei-Metadaten konnten nicht gelöscht werden.' })
    } else {
      toast({ title: 'Gelöscht!', description: 'Die Datei wurde entfernt.' })
      setProfileMedia(prev => prev.filter(item => item.id !== mediaItem.id))
    }
  }

  // Other handlers remain the same...
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
  const handleServiceChange = (service: string, checked: boolean) => {
    const currentServices = profile?.services || []
    const newServices = checked ? [...currentServices, service] : currentServices.filter(s => s !== service)
    const updatedProfile = { ...profile, services: newServices }
    setProfile(updatedProfile)
    setCompletion(calculateCompletion(updatedProfile))
  }
  const handleSave = async (newStatus?: Profile['status']) => {
    if (!profile || !profile.id) return
    setSaving(true)
    const updateData = { ...profile }
    if (newStatus) updateData.status = newStatus
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
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ... existing form fields ... */}
            </CardContent>
          </Card>

          {/* Profil-Details */}
          <Card>
            <CardHeader>
              <CardTitle>Profil-Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ... existing form fields ... */}
            </CardContent>
          </Card>

          {/* Angebote & Preise */}
          <Card>
            <CardHeader>
              <CardTitle>Angebote & Preise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ... existing form fields ... */}
            </CardContent>
          </Card>

          {/* Galerie & Zertifikate */}
          <Card>
            <CardHeader>
              <CardTitle>Galerie & Zertifikate</CardTitle>
              <CardDescription>
                Zeige Bilder von dir und deiner Arbeit oder lade Zertifikate hoch. (PRO Feature)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gallery Section */}
              <div>
                <Label className="font-semibold">Bildergalerie</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {profileMedia.filter(m => m.media_type === 'GALLERY').map(item => (
                    <div key={item.id} className="relative group">
                      <Image src={item.url!} alt={item.file_name} width={150} height={150} className="rounded-md object-cover aspect-square" />
                      <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleFileDelete(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => galleryInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                  Bild hinzufügen
                </Button>
                <Input type="file" accept="image/*" ref={galleryInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'GALLERY')} />
              </div>
              <hr />
              {/* Certificates Section */}
              <div>
                <Label className="font-semibold">Zertifikate & Dokumente</Label>
                <div className="space-y-2 mt-2">
                  {profileMedia.filter(m => m.media_type === 'CERTIFICATE').map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm p-2 border rounded-md">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {item.file_name}
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFileDelete(item)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => certificateInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Dokument hinzufügen
                </Button>
                <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" ref={certificateInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'CERTIFICATE')} />
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
              {/* ... existing agreement checkboxes ... */}
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
