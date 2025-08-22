'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Trash2, PlusCircle } from 'lucide-react'
import { User } from '@supabase/supabase-js'

type Availability = {
  id: number
  midwife_id: string
  start_date: string
  end_date: string
  note: string | null
}

export default function AvailabilityPage() {
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newNote, setNewNote] = useState('')

  const fetchAvailabilities = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('midwife_id', userId)
      .order('start_date', { ascending: true })

    if (error) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Verfügbarkeiten konnten nicht geladen werden.' })
    } else {
      setAvailabilities(data || [])
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        fetchAvailabilities(user.id)
      } else {
        setLoading(false)
      }
    }
    init()
  }, [fetchAvailabilities])

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newStartDate || !newEndDate) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Bitte Start- und Enddatum ausfüllen.' })
      return
    }
    setSaving(true)

    const { error } = await supabase.from('availability').insert({
      midwife_id: user.id,
      start_date: newStartDate,
      end_date: newEndDate,
      note: newNote || null,
    })

    if (error) {
      toast({ variant: 'destructive', title: 'Fehler', description: `Zeitraum konnte nicht hinzugefügt werden. (${error.message})` })
    } else {
      toast({ title: 'Gespeichert!', description: 'Neuer Verfügbarkeitszeitraum wurde hinzugefügt.' })
      setNewStartDate('')
      setNewEndDate('')
      setNewNote('')
      fetchAvailabilities(user.id) // Refresh list
    }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('availability').delete().eq('id', id)
    if (error) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Zeitraum konnte nicht gelöscht werden.' })
    } else {
      toast({ title: 'Gelöscht!', description: 'Der Zeitraum wurde entfernt.' })
      setAvailabilities(prev => prev.filter(a => a.id !== id))
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verfügbarkeiten verwalten</CardTitle>
          <CardDescription>
            Trage hier die Zeiträume ein, in denen du grundsätzlich für neue Betreuungen zur Verfügung stehst. 
            Dies beeinflusst deine Kapazitäts-Ampel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAvailability} className="grid md:grid-cols-3 gap-4 items-end border p-4 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="start_date">Von</Label>
              <Input id="start_date" type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Bis</Label>
              <Input id="end_date" type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
              Hinzufügen
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eingetragene Zeiträume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {availabilities.length > 0 ? (
              availabilities.map(avail => (
                <div key={avail.id} className="flex justify-between items-center p-3 border rounded-lg bg-muted/40">
                  <div>
                    <p className="font-semibold">
                      {new Date(avail.start_date).toLocaleDateString('de-DE')} - {new Date(avail.end_date).toLocaleDateString('de-DE')}
                    </p>
                    {avail.note && <p className="text-sm text-muted-foreground">{avail.note}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(avail.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Noch keine Verfügbarkeitszeiträume eingetragen.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
