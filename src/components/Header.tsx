'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()

  // Don't show the header on auth pages
  if (pathname === '/login' || pathname === '/register') {
    return null
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold text-slate-900">
          Hausgeburt Portal
        </Link>
        <div className="flex items-center space-x-6">
          <Link href="/search" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Suchen
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Dashboard
          </Link>
          <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            Login
          </Link>
        </div>
      </nav>
    </header>
  )
}
