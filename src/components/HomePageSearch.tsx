'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function HomePageSearch() {
  const [postal, setPostal] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedPostal = postal.trim()
    if (trimmedPostal) {
      router.push(`/search?postal=${trimmedPostal}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="mt-8 max-w-md mx-auto flex gap-2">
      <input
        type="text"
        placeholder="Deine Postleitzahl"
        className="text-base h-12 w-full rounded-md border p-2"
        value={postal}
        onChange={(e) => setPostal(e.target.value)}
      />
      <button type="submit" className="h-12 px-6 bg-blue-600 text-white rounded-md">
        Suchen
      </button>
    </form>
  )
}
