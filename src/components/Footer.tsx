import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Hausgeburt Portal. Alle Rechte vorbehalten.</p>
        <div className="flex space-x-4">
          <Link href="/impressum" className="hover:text-slate-900">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-slate-900">
            Datenschutz
          </Link>
        </div>
      </div>
    </footer>
  )
}
