import Link from 'next/link'
import { Instagram, Facebook } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto border-t bg-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900">Portal</h4>
            <Link href="/search" className="block text-sm text-slate-600 hover:underline">Hebammen finden</Link>
            <Link href="/register" className="block text-sm text-slate-600 hover:underline">Für Hebammen</Link>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900">Unternehmen</h4>
            <Link href="/about" className="block text-sm text-slate-600 hover:underline">Über uns</Link>
            <Link href="/contact" className="block text-sm text-slate-600 hover:underline">Kontakt</Link>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900">Hilfe</h4>
            <Link href="/faq" className="block text-sm text-slate-600 hover:underline">FAQ</Link>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900">Rechtliches</h4>
            <Link href="/impressum" className="block text-sm text-slate-600 hover:underline">Impressum</Link>
            <Link href="/datenschutz" className="block text-sm text-slate-600 hover:underline">Datenschutz</Link>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900">Social</h4>
            <a href="#" className="flex items-center gap-2 text-sm text-slate-600 hover:underline">
              <Instagram className="h-4 w-4" /> Instagram
            </a>
            <a href="#" className="flex items-center gap-2 text-sm text-slate-600 hover:underline">
              <Facebook className="h-4 w-4" /> Facebook
            </a>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Hausgeburt Portal. Alle Rechte vorbehalten.</p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <a href="#" className="text-slate-500 hover:text-slate-900">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" className="text-slate-500 hover:text-slate-900">
              <Facebook className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
