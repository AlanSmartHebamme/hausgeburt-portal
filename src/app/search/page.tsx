'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, Search as SearchIcon, SlidersHorizontal } from 'lucide-react'
import Image from 'next/image'

// Typen
type MidwifeSearchResult = {
  id: string;
  display_name: string | null;
  city: string | null;
  postal_code: string | null;
  bio: string | null;
  qualifications: string[] | null;
  price_model: string | null;
  status: 'VERIFIED' | 'PENDING' | 'DRAFT';
  distance: number;
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const [results, setResults] = useState<MidwifeSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Filter States
  const [postal, setPostal] = useState(searchParams.get('postal') || '')
  const [radius, setRadius] = useState(searchParams.get('radius') || '25')
  const [services, setServices] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])

  const performSearch = useMemo(() => async () => {
    setLoading(true)
    setHasSearched(true)

    // HINWEIS: Die RPC-Funktion muss diese neuen Filter unterstützen
    const { data, error } = await supabase.rpc('search_midwives_by_radius', {
      p_postal_code: postal.trim(),
      p_radius_km: Number(radius),
      // p_services: services, // Beispiel für erweiterte Parameter
      // p_languages: languages, // Beispiel für erweiterte Parameter
    })

    if (error) {
      console.error('Search error:', error)
      setResults([])
    } else {
      setResults(data || [])
    }
    setLoading(false)
  }, [postal, radius, services, languages])

  useEffect(() => {
    if (searchParams.get('postal')) {
      performSearch()
    }
  }, [performSearch, searchParams])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  return (
    <div className="grid lg:grid-cols-4 gap-8">
      {/* Filter Sidebar */}
      <aside className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearchSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postleitzahl</Label>
              <Input id="postal_code" placeholder="z.B. 10115" value={postal} onChange={e => setPostal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius">Radius</Label>
              <Select value={radius} onValueChange={setRadius}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">+ 10 km</SelectItem>
                  <SelectItem value="25">+ 25 km</SelectItem>
                  <SelectItem value="50">+ 50 km</SelectItem>
                  <SelectItem value="100">+ 100 km</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Leistungen</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Checkbox id="s-hausgeburt" /> <Label htmlFor="s-hausgeburt">Hausgeburt</Label></div>
                <div className="flex items-center gap-2"><Checkbox id="s-wochenbett" /> <Label htmlFor="s-wochenbett">Wochenbett</Label></div>
                <div className="flex items-center gap-2"><Checkbox id="s-stillberatung" /> <Label htmlFor="s-stillberatung">Stillberatung</Label></div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Sprachen</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Checkbox id="l-englisch" /> <Label htmlFor="l-englisch">Englisch</Label></div>
                <div className="flex items-center gap-2"><Checkbox id="l-tuerkisch" /> <Label htmlFor="l-tuerkisch">Türkisch</Label></div>
              </div>
            </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <SearchIcon className="h-4 w-4 mr-2" />
                Suche anwenden
              </Button>
            </form>
          </CardContent>
        </Card>
      </aside>

      {/* Search Results */}
      <main className="lg:col-span-3">
        {loading && (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && !hasSearched && (
           <div className="text-center p-8 bg-slate-100 rounded-lg h-full flex flex-col justify-center">
            <h3 className="font-semibold text-xl">Suche starten</h3>
            <p className="text-muted-foreground mt-2">
              Nutze die Filter auf der linken Seite, um deine Hebamme zu finden.
            </p>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center p-8 bg-slate-100 rounded-lg h-full flex flex-col justify-center">
            <h3 className="font-semibold text-xl">Keine Hebammen gefunden</h3>
            <p className="text-muted-foreground mt-2">
              Versuche, deine Postleitzahl zu ändern oder den Suchradius zu vergrößern.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{results.length} Hebammen gefunden</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {results.map((midwife) => (
                <Card key={midwife.id} className="flex flex-col overflow-hidden transition-shadow duration-300 ease-in-out hover:shadow-lg">
                  <CardHeader className="flex flex-row gap-4 items-start p-4">
                    <div className="relative h-20 w-20 rounded-full overflow-hidden flex-shrink-0">
                      <Image src={`https://via.placeholder.com/100x100.png/ddd/333?text=${midwife.display_name?.charAt(0)}`} alt={`Foto von ${midwife.display_name}`} layout="fill" objectFit="cover" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        {midwife.display_name}
                        {midwife.status === 'VERIFIED' && <Badge variant="secondary" className="bg-green-100 text-green-800">✓ Verifiziert</Badge>}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{midwife.city} {midwife.postal_code} • ~{midwife.distance.toFixed(0)} km</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">{midwife.bio}</p>
                    {midwife.qualifications && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {midwife.qualifications.slice(0, 3).map((q) => (
                          <Badge key={q} variant="outline">{q}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="p-4 pt-0 mt-auto flex gap-2">
                    <Button asChild className="w-full">
                      <Link href={`/midwife/${midwife.id}`}>Profil ansehen</Link>
                    </Button>
                    <Button asChild variant="secondary" className="w-full">
                      <Link href={`/request/${midwife.id}`}>Anfragen</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
