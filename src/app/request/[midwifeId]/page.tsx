'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

type MidwifeProfile = {
  id: string
  display_name: string | null
}

export default function RequestCreationPage() {
  const { midwifeId } = useParams<{ midwifeId: string }>()
  const router = useRouter()
  const { toast } = useToast()
  
  const [midwife, setMidwife] = useState<MidwifeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [dueDate, setDueDate] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchMidwife = async () => {
      if (!midwifeId) return
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', midwifeId)
        .eq('role', 'MIDWIFE')
        .single()
      
      if (error || !data) {
        console.error('Error fetching midwife:', error)
        setError('Hebammen-Profil konnte nicht geladen werden.')
        setMidwife(null)
      } else {
        setMidwife(data)
      }
      setLoading(false)
    }
    fetchMidwife()
  }, [midwifeId])

  const handleServiceChange = (service: string, checked: boolean) => {
    setServices(prev => 
      checked ? [...prev, service] : prev.filter(s => s !== service)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sie müssen angemeldet sein, um eine Anfrage zu stellen.')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('bookings').insert({
      client_id: user.id,
      midwife_id: midwifeId,
      status: 'REQUESTED',
      due_date: dueDate,
      requested_services: services,
      message: message,
    })

    if (insertError) {
      console.error('Error creating request:', insertError)
      setError('Fehler beim Senden der Anfrage. Bitte versuchen Sie es erneut.')
      setSaving(false)
    } else {
      toast({
        title: "Anfrage erfolgreich gesendet!",
        description: `Deine Anfrage an ${midwife?.display_name} wurde übermittelt.`,
      })
      router.push('/dashboard/requests')
    }
  }

  if (loading) return <div className="flex justify-center items-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>
  if (!midwife) return <div className="p-4 text-center">Hebamme nicht gefunden.</div>

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Anfrage an {midwife.display_name}</CardTitle>
          <CardDescription>
            Fülle die folgenden Felder aus, um deine unverbindliche Anfrage zu senden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="due-date">Voraussichtlicher Geburtstermin</Label>
              <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
            
            <div className="space-y-2">
              <Label>Gewünschte Leistungen</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2"><Checkbox id="s-hausgeburt" checked={services.includes('hausgeburt')} onCheckedChange={(c) => handleServiceChange('hausgeburt', !!c)} /> <Label htmlFor="s-hausgeburt">Hausgeburt</Label></div>
                <div className="flex items-center gap-2"><Checkbox id="s-wochenbett" checked={services.includes('wochenbett')} onCheckedChange={(c) => handleServiceChange('wochenbett', !!c)} /> <Label htmlFor="s-wochenbett">Wochenbett</Label></div>
                <div className="flex items-center gap-2"><Checkbox id="s-stillberatung" checked={services.includes('stillberatung')} onCheckedChange={(c) => handleServiceChange('stillberatung', !!c)} /> <Label htmlFor="s-stillberatung">Stillberatung</Label></div>
                <div className="flex items-center gap-2"><Checkbox id="s-vorsorge" checked={services.includes('vorsorge')} onCheckedChange={(c) => handleServiceChange('vorsorge', !!c)} /> <Label htmlFor="s-vorsorge">Vorsorge</Label></div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Deine Nachricht (optional)</Label>
              <Textarea id="message" placeholder="Erzähle der Hebamme etwas über dich und deine Wünsche..." value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-4">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Anfrage senden
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href={`/midwife/${midwifeId}`}>Abbrechen</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
