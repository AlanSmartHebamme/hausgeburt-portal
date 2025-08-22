'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

type MidwifeProfile = {
  id: string;
  display_name: string | null;
  city: string | null;
  postal_code: string | null;
  bio: string | null;
}

// Helper to format the slug for display
function formatSlug(slug: string) {
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function CitySeoPage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  
  const [midwives, setMidwives] = useState<MidwifeProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [locationName, setLocationName] = useState('')

  useEffect(() => {
    if (!slug) return;

    const formattedLocation = formatSlug(slug);
    setLocationName(formattedLocation);
    
    const fetchMidwives = async () => {
      setLoading(true);
      // This is a simple query. For a real SEO page, we might need a dedicated
      // RPC function that can handle both PLZ and city names.
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, city, postal_code, bio')
        .eq('role', 'MIDWIFE')
        .eq('completed', true)
        // A simple search by city name. We can make this more robust later.
        .ilike('city', `%${formattedLocation}%`);

      if (error) {
        console.error('Error fetching midwives for city page:', error);
      } else {
        setMidwives(data || []);
      }
      setLoading(false);
    };

    fetchMidwives();
  }, [slug]);

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Hebammen in {locationName}</h1>
        <p className="text-muted-foreground mt-2">
          Finden Sie eine Hebamme für Hausgeburten in Ihrer Nähe.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : midwives.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {midwives.map(midwife => (
            <Card key={midwife.id}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={`https://via.placeholder.com/100x100.png/ddd/333?text=${midwife.display_name?.charAt(0)}`} alt={`Foto von ${midwife.display_name}`} layout="fill" objectFit="cover" />
                  </div>
                  <div>
                    <CardTitle>{midwife.display_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{midwife.city} {midwife.postal_code}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{midwife.bio}</p>
                <Button asChild className="mt-4 w-full">
                  <Link href={`/midwife/${midwife.id}`}>Profil ansehen</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 bg-slate-100 rounded-lg">
          <h3 className="font-semibold text-xl">Leider keine Hebammen gefunden</h3>
          <p className="text-muted-foreground mt-2">
            Für "{locationName}" gibt es aktuell keine Einträge.
          </p>
        </div>
      )}
    </div>
  );
}
