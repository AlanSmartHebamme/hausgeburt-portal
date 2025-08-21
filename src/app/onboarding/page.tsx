'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type Form = {
  display_name: string
  city: string
  postal_code: string
  radius_km: number
  phone: string
  about: string
  qualifications: string
  offers_homebirth: boolean
  price_model: string
}

// Helper component for form fields
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

export default function Onboarding() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Form>({
    display_name: '', city: '', postal_code: '', radius_km: 25, phone: '',
    about: '', qualifications: '', offers_homebirth: true, price_model: 'FIX',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role, display_name, city, postal_code, radius_km, phone, bio, qualifications, offers_homebirth, price_model')
        .eq('id', user.id)
        .single()

      if (cancelled) return
      if (profileErr && profileErr.code !== 'PGRST116') { setError(profileErr.message); }
      
      if (profile) {
        setRole(profile.role)
        setForm({
          display_name: profile.display_name ?? '',
          city: profile.city ?? '',
          postal_code: profile.postal_code ?? '',
          radius_km: Number.isFinite(profile.radius_km) ? Number(profile.radius_km) : 25,
          phone: profile.phone ?? '',
          about: profile.bio ?? '',
          qualifications: profile.qualifications ?? '',
          offers_homebirth: !!profile.offers_homebirth,
          price_model: profile.price_model ?? 'FIX',
        })
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  function invalid(): string | null {
    if (!form.display_name.trim()) return 'Bitte Anzeigename eingeben.'
    if (!form.postal_code.trim()) return 'Bitte PLZ eingeben.'
    if (!form.city.trim()) return 'Bitte Stadt eingeben.'
    if (!Number.isFinite(form.radius_km) || form.radius_km <= 0) return 'Bitte gültigen Radius angeben.'
    return null
  }

  async function save(done: boolean) {
    const msg = invalid()
    if (msg) { alert(msg); return }

    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); window.location.href = '/login'; return }

    const payload = {
      display_name: form.display_name.trim(),
      city: form.city.trim(),
      postal_code: form.postal_code.trim(),
      radius_km: Number(form.radius_km),
      phone: form.phone.trim(),
      bio: form.about,
      qualifications: form.qualifications,
      offers_homebirth: !!form.offers_homebirth,
      price_model: form.price_model,
      completed: done,
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    setSaving(false)
    if (error) { alert(error.message); return }

    alert(done ? 'Profil veröffentlicht!' : 'Entwurf gespeichert.')
    window.location.href = '/dashboard'
  }

  if (loading) return <div className="p-6 text-slate-500">Lade Profil…</div>
  if (role !== 'MIDWIFE') {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-2 text-slate-800">Nur für Hebammen</h1>
        <p className="text-slate-600">Dieses Onboarding ist für die Rolle „MIDWIFE“ vorgesehen.</p>
        <Link className="text-blue-600 hover:underline mt-4 inline-block" href="/dashboard">Zurück zum Dashboard</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900">Dein Hebammen-Profil</h1>
      <p className="mt-2 text-slate-600">
        Fülle dein Profil sorgfältig aus. Diese Informationen sind für Klientinnen auf deiner öffentlichen Profilseite sichtbar.
      </p>
      {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}

      <div className="mt-8 space-y-8">
        <div className="space-y-4 p-6 border border-slate-200 rounded-lg bg-white">
          <h2 className="text-lg font-semibold text-slate-800">Basis-Informationen</h2>
          <FormField label="Anzeigename">
            <input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Stadt">
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </FormField>
            <FormField label="Postleitzahl">
              <input value={form.postal_code} onChange={e => setForm({ ...form, postal_code: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Einsatzradius (in km)">
            <input type="number" min={1} max={200} value={form.radius_km} onChange={e => setForm({ ...form, radius_km: Number(e.target.value) })} />
          </FormField>
          <FormField label="Telefonnummer">
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </FormField>
        </div>

        <div className="space-y-4 p-6 border border-slate-200 rounded-lg bg-white">
          <h2 className="text-lg font-semibold text-slate-800">Profil-Details</h2>
          <FormField label="Über mich (Bio)">
            <textarea rows={5} value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} />
          </FormField>
          <FormField label="Qualifikationen">
            <textarea rows={3} value={form.qualifications} onChange={e => setForm({ ...form, qualifications: e.target.value })} />
          </FormField>
        </div>

        <div className="space-y-4 p-6 border border-slate-200 rounded-lg bg-white">
          <h2 className="text-lg font-semibold text-slate-800">Angebote</h2>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.offers_homebirth} onChange={e => setForm({ ...form, offers_homebirth: e.target.checked })} />
              Ich biete Hausgeburten an
            </label>
            <FormField label="Preismodell">
              <select value={form.price_model} onChange={e => setForm({ ...form, price_model: e.target.value })}>
                <option value="FIX">Festpreis</option>
                <option value="QUOTE">Auf Anfrage</option>
              </select>
            </FormField>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-5 border-t border-slate-200 flex justify-end gap-3">
        <button onClick={() => save(false)} disabled={saving} className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50">
          {saving ? 'Speichere…' : 'Entwurf speichern'}
        </button>
        <button onClick={() => save(true)} disabled={saving} className="inline-flex h-10 items-center justify-center rounded-md bg-blue-500 px-6 text-sm font-medium text-white shadow transition-colors hover:bg-blue-600 disabled:opacity-50">
          {saving ? 'Profil veröffentlichen'}
        </button>
      </div>
    </div>
  )
}
