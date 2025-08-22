'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

// Step 1: Basic Info
const Step1 = ({ data, setData }: { data: any, setData: Function }) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor="due_date">Entbindungstermin (ET)</Label>
      <Input id="due_date" type="date" value={data.dueDate || ''} onChange={(e) => setData({ ...data, dueDate: e.target.value })} />
    </div>
    <div>
      <Label htmlFor="postal_code">Postleitzahl</Label>
      <Input id="postal_code" placeholder="z.B. 10115" value={data.postalCode || ''} onChange={(e) => setData({ ...data, postalCode: e.target.value })} />
    </div>
  </div>
)

// Step 2: Preferences
const Step2 = ({ data, setData }: { data: any, setData: Function }) => {
  const handleServiceChange = (service: string, checked: boolean) => {
    const currentServices = data.services || []
    const newServices = checked 
      ? [...currentServices, service] 
      : currentServices.filter((s: string) => s !== service)
    setData({ ...data, services: newServices })
  }

  return (
    <div className="space-y-6">
      <div>
        <Label>Art der Krankenversicherung</Label>
        <Select value={data.insurance || ''} onValueChange={(value) => setData({ ...data, insurance: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Bitte auswählen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Gesetzliche Kasse</SelectItem>
            <SelectItem value="private">Private Kasse</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Gewünschte Leistungen</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="s-hausgeburt" 
              checked={data.services?.includes('hausgeburt')} 
              onCheckedChange={(checked) => handleServiceChange('hausgeburt', !!checked)}
            /> 
            <Label htmlFor="s-hausgeburt">Hausgeburt</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="s-wochenbett" 
              checked={data.services?.includes('wochenbett')} 
              onCheckedChange={(checked) => handleServiceChange('wochenbett', !!checked)}
            /> 
            <Label htmlFor="s-wochenbett">Wochenbett</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="s-stillberatung" 
              checked={data.services?.includes('stillberatung')} 
              onCheckedChange={(checked) => handleServiceChange('stillberatung', !!checked)}
            /> 
            <Label htmlFor="s-stillberatung">Stillberatung</Label>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 3: Review
const Step3 = ({ data }: { data: any }) => (
  <div className="space-y-2">
    <h3 className="font-semibold">Zusammenfassung:</h3>
    <p><strong>ET:</strong> {data.dueDate || 'Nicht angegeben'}</p>
    <p><strong>PLZ:</strong> {data.postalCode || 'Nicht angegeben'}</p>
    <p><strong>Versicherung:</strong> {data.insurance === 'public' ? 'Gesetzlich' : data.insurance === 'private' ? 'Privat' : 'Nicht angegeben'}</p>
    <p><strong>Leistungen:</strong> {data.services?.join(', ') || 'Keine ausgewählt'}</p>
  </div>
)

export default function WizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [wizardData, setWizardData] = useState({})

  const totalSteps = 3

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  const handleSubmit = () => {
    // We don't call the RPC function here. The results page will do that.
    // We just navigate to the results page with the collected data in the query string.
    const query = encodeURIComponent(JSON.stringify(wizardData))
    router.push(`/wizard/results?d=${query}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Hebammen-Finder</CardTitle>
          <CardDescription>Schritt {step} von {totalSteps}</CardDescription>
          <Progress value={(step / totalSteps) * 100} className="mt-2" />
        </CardHeader>
        <CardContent>
          {step === 1 && <Step1 data={wizardData} setData={setWizardData} />}
          {step === 2 && <Step2 data={wizardData} setData={setWizardData} />}
          {step === 3 && <Step3 data={wizardData} />}
          
          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={step === 1}>
              Zurück
            </Button>
            {step < totalSteps && (
              <Button onClick={nextStep}>
                Weiter
              </Button>
            )}
            {step === totalSteps && (
              <Button onClick={handleSubmit}>
                Passende Hebammen finden
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
