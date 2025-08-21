'use client'
import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Define the type for the search results
type MidwifeSearchResult = {
  id: string;
  display_name: string | null;
  city: string | null;
  postal_code: string | null;
  about: string | null;
  price_model: string | null;
  distance: number;
}

export default function Search() {
  const [postal, setPostal] = useState('')
  const [radius, setRadius] = useState(25) // Default radius in km
  const [rows, setRows] = useState<MidwifeSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)

  async function search() {
    setTouched(true)
    const q = postal.trim()
    if (!q) {
      setRows([])
      return
    }

    setLoading(true)

    // Call the RPC function in Supabase
    const { data, error } = await supabase.rpc('search_midwives_by_radius', {
      p_postal_code: q,
      p_radius_km: radius,
    })

    if (error) {
      console.error('Search error:', error)
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') search()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Hebamme in deiner Nähe finden</h1>
        <p className="mt-3 max-w-2xl mx-auto text-lg text-slate-600">
          Gib deine Postleitzahl ein, um die Suche zu starten.
        </p>
      </div>

      <div className="sticky top-[65px] z-10 bg-white/80 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-2 items-center">
          <input
            className="h-10 w-full flex-grow rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            placeholder="Deine Postleitzahl"
            value={postal}
            onChange={(e) => setPostal(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            <option value={5}>+ 5 km</option>
            <option value={10}>+ 10 km</option>
            <option value={25}>+ 25 km</option>
            <option value={50}>+ 50 km</option>
            <option value={100}>+ 100 km</option>
          </select>
          <button onClick={search} className="inline-flex h-10 items-center justify-center rounded-md bg-blue-500 px-6 text-sm font-medium text-white shadow transition-colors hover:bg-blue-600 disabled:opacity-50" disabled={loading}>
            {loading ? 'Suche…' : 'Suchen'}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {touched && !postal.trim() && (
          <div className="text-sm text-amber-600">Bitte gib eine Postleitzahl ein.</div>
        )}

        {touched && postal.trim() && !loading && rows.length === 0 && (
          <div className="text-center p-8 bg-slate-50 rounded-lg">
            <h3 className="font-semibold text-slate-800">Keine Hebammen gefunden</h3>
            <p className="text-sm text-slate-500 mt-1">
              Versuche, deine Postleitzahl zu ändern oder den Suchradius zu vergrößern.
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <ul className="space-y-4">
            {rows.map((r) => (
              <li key={r.id} className="border border-slate-200 bg-white p-4 rounded-lg shadow-sm hover:border-blue-400 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">{r.display_name}</h3>
                    <p className="text-sm text-slate-500">
                      {r.city} {r.postal_code}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="font-semibold text-slate-900">{r.distance.toFixed(1)} km</div>
                    <div className="text-xs text-slate-500">Entfernung</div>
                  </div>
                </div>
                {r.about && <p className="mt-2 text-sm text-slate-600 line-clamp-2">{r.about}</p>}
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-xs text-slate-500">Preismodell: {r.price_model ?? 'N/A'}</div>
                  <Link className="text-blue-500 hover:text-blue-700 text-sm font-semibold" href={`/midwife/${r.id}`}>
                    Profil ansehen →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
