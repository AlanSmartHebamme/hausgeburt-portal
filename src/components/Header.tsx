'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ProfileButton from './ProfileButton'

export default function Header() {
  const pathname = usePathname()

  // Don't show the header on auth pages
  if (pathname === '/login' || pathname === '/register') {
    return null
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold">
          Hausgeburt Portal
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/search" className="text-sm font-medium text-muted-foreground hover:text-primary">
            Suchen
          </Link>
          <ProfileButton />
        </div>
      </nav>
    </header>
  )
}
