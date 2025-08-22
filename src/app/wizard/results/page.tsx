'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { cn } from '@/lib/utils'

type MidwifeResult = {
  id: string;
  display_name: string | null;
  city: string | null;
  postal_code: string | null;
  about: string | null;
  distance: number;
  plan: 'FREE' | 'PRO';
  capacity_status: 'GREEN' | 'YELLOW' | 'RED';
}

function ResultsDisplay() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [results, setResults] = useState<MidwifeResult[]>([])
  const [loading, setLoading] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExpressBooking = async () => {
    setIsRedirecting(true)
    try {
      const response = await fetch('/api/express-booking/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ midwifeIds: results.map(r => r.id) }),
      })
      const { url } = await response.json()
      if (url) {
        window.location.href = url
      } else {
        throw new Error('Stripe URL not received.')
      }
    } catch (err) {
      console.error(err)
      setError('Fehler beim Starten der Express-Vermittlung.')
      setIsRedirecting(false)
    }
  }

  useEffect(() => {
    const wizardDataString = searchParams.get('d')
    if (!wizardDataString) {
      setError('Keine Suchkriterien gefunden.')
      setLoading(false)
      return
    }

    const wizardData = JSON.parse(decodeURIComponent(wizardDataString))

    const performMatch = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.rpc('wizard_match_midwives', {
        p_postal_code: wizardData.postalCode,
        p_due_date: wizardData.dueDate,
        p_services: wizardData.services || [],
      })

      if (error) {
        setError('Bei der Suche ist ein Fehler aufgetreten.')
        console.error(error)
      } else {
        setResults(data || [])
      }
      setLoading(false)
    }
    performMatch()
  }, [searchParams])

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }
  if (error) {
    return <div className="text-center text-red-500 p-8">{error}</div>
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Ihre Top-Treffer</h1>
        <p className="text-muted-foreground mt-2">
          Basierend auf Ihren Angaben haben wir {results.length} passende Hebammen gefunden.
        </p>
      </header>

      {/* Express-Vermittlung Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle>Express-Vermittlung (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">
            Keine Zeit, alle einzeln anzufragen? Wir senden eine Sammelanfrage an alle Top-Treffer für Sie.
          </p>
          <Button onClick={handleExpressBooking} disabled={isRedirecting || results.length === 0}>
            {isRedirecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Sammelanfrage starten (Paid Feature)
          </Button>
        </CardContent>
      </Card>

      {/* Results List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((midwife) => (
          <Card key={midwife.id}>
            <CardHeader className="flex flex-row gap-4 items-start">
              <Image src={`https://via.placeholder.com/100x100.png/ddd/333?text=${midwife.display_name?.charAt(0)}`} alt={`Foto von ${midwife.display_name}`} width={80} height={80} className="rounded-full" />
              <div>
                <CardTitle className="flex items-center gap-2">{midwife.display_name} {midwife.plan === 'PRO' && <Badge className="bg-purple-100 text-purple-800">PRO</Badge>}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span>~{midwife.distance.toFixed(0)} km</span>
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-2.5 w-2.5 rounded-full", midwife.capacity_status === 'GREEN' && 'bg-green-500', midwife.capacity_status === 'YELLOW' && 'bg-yellow-500', midwife.capacity_status === 'RED' && 'bg-red-500')} />
                    {midwife.capacity_status === 'GREEN' ? 'Verfügbar' : midwife.capacity_status === 'YELLOW' ? 'Begrenzt' : 'Ausgebucht'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">{midwife.about}</p>
              <Button asChild className="mt-4 w-full"><Link href={`/midwife/${midwife.id}`}>Profil ansehen & Anfragen</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function WizardResultsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ResultsDisplay />
    </Suspense>
  )
}
