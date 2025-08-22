// app/midwife/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import RequestButton from '@/components/RequestButton'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'

type Profile = {
  id: string
  display_name: string | null
  city: string | null
  postal_code: string | null
  radius_km: number | null
  bio: string | null
  qualifications: string | null
  phone: string | null
  price_model: 'FIX' | 'PERCENT' | 'QUOTE' | null
}

type ProfileMedia = {
  id: string
  storage_path: string
  file_name: string
  media_type: 'GALLERY' | 'CERTIFICATE'
  url?: string
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
  const [media, setMedia] = useState<ProfileMedia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true)
      
      // Fetch profile and media in parallel
      const profilePromise = supabase
        .from('profiles')
        .select('id, display_name, city, postal_code, radius_km, bio, qualifications, phone, price_model')
        .eq('id', id)
        .eq('role', 'MIDWIFE')
        .maybeSingle()

      const mediaPromise = supabase
        .from('profile_media')
        .select('id, storage_path, file_name, media_type')
        .eq('profile_id', id)

      const [{ data: profileData, error: profileError }, { data: mediaData, error: mediaError }] = await Promise.all([profilePromise, mediaPromise])

      if (profileError) console.error('Error fetching midwife profile:', profileError.message)
      if (mediaError) console.error('Error fetching profile media:', mediaError.message)

      setProfile(profileData as Profile)
      
      if (mediaData) {
        const mediaWithUrls = mediaData.map(item => {
          const { data: { publicUrl } } = supabase.storage.from('profile_media').getPublicUrl(item.storage_path)
          return { ...item, url: publicUrl }
        })
        setMedia(mediaWithUrls)
      }

      setLoading(false)

      // Log the profile view
      supabase.rpc('log_profile_view', { p_profile_id: id }).then(({ error }) => {
        if (error) console.error('Error logging profile view:', error.message)
      })
    })()
  }, [id])

  if (loading) return <div className="flex justify-center items-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
  if (!profile) return <div className="p-4 text-center">Profil nicht gefunden.</div>

  const qualificationsList = profile.qualifications?.split(',').map(q => q.trim()).filter(q => q) || []
  const galleryImages = media.filter(m => m.media_type === 'GALLERY')
  const certificates = media.filter(m => m.media_type === 'CERTIFICATE')

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/search">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zur Suche
        </Link>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="items-center text-center">
              <div className="relative h-24 w-24 rounded-full overflow-hidden">
                <Image 
                  src={galleryImages.length > 0 ? galleryImages[0].url! : `https://via.placeholder.com/150x150.png/ddd/333?text=${profile.display_name?.charAt(0)}`} 
                  alt={`Foto von ${profile.display_name}`} 
                  layout="fill" 
                  objectFit="cover" 
                />
              </div>
              <CardTitle className="text-2xl pt-2">{profile.display_name ?? 'Hebamme'}</CardTitle>
              <CardDescription>{profile.city} {profile.postal_code}</CardDescription>
              <Badge variant="secondary" className="bg-green-100 text-green-800 mt-1">✓ Verifiziert</Badge>
            </CardHeader>
            <CardContent>
              <RequestButton midwifeId={profile.id} />
            </CardContent>
          </Card>
          {certificates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zertifikate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {certificates.map(cert => (
                  <a 
                    key={cert.id} 
                    href={cert.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-between text-sm p-2 border rounded-md hover:bg-muted"
                  >
                    <span>{cert.file_name}</span>
                    <Download className="h-4 w-4" />
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="md:col-span-2 space-y-6">
          {profile.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Über mich</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground whitespace-pre-wrap">
                {profile.bio}
              </CardContent>
            </Card>
          )}

          {galleryImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Galerie</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {galleryImages.map(img => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square rounded-md overflow-hidden group">
                    <Image src={img.url!} alt={img.file_name || 'Galeriebild'} layout="fill" objectFit="cover" className="group-hover:scale-105 transition-transform" />
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {qualificationsList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Leistungen & Qualifikationen</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {qualificationsList.map((q) => (
                  <Badge key={q} variant="outline">{q}</Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
