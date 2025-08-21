import Link from 'next/link'

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
          Deine Hebamme für eine <span className="text-blue-600">sichere Hausgeburt</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
          Finde und kontaktiere qualifizierte Hebammen in deiner Nähe, die dich bei deinem Wunsch nach einer Hausgeburt begleiten. Schnell, unkompliziert und sicher.
        </p>
        <div className="mt-8 flex justify-center gap-x-4">
          <Link 
            href="/search" 
            className="inline-flex h-12 items-center justify-center rounded-md bg-blue-500 px-8 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-600"
          >
            Jetzt Hebamme finden
          </Link>
          <Link 
            href="/register" 
            className="inline-flex h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-8 text-base font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Für Hebammen
          </Link>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 bg-slate-50 rounded-xl">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Dein Weg zur Hausgeburt in 3 Schritten
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Unser Prozess ist darauf ausgelegt, dir so einfach wie möglich Sicherheit und Klarheit zu geben.
          </p>
          <div className="mt-12 grid md:grid-cols-3 gap-8 text-left">
            <div className="p-8 bg-white border border-slate-200 rounded-lg">
              <h3 className="text-xl font-semibold text-slate-900">1. Suchen & Finden</h3>
              <p className="mt-2 text-slate-600">
                Gib deine Postleitzahl und den gewünschten Umkreis ein. Wir zeigen dir passende Hebammen-Profile.
              </p>
            </div>
            <div className="p-8 bg-white border border-slate-200 rounded-lg">
              <h3 className="text-xl font-semibold text-slate-900">2. Anfragen & Bestätigen</h3>
              <p className="mt-2 text-slate-600">
                Stelle eine unverbindliche Anfrage. Die Hebamme prüft ihre Kapazität und gibt dir schnellstmöglich Rückmeldung.
              </p>
            </div>
            <div className="p-8 bg-white border border-slate-200 rounded-lg">
              <h3 className="text-xl font-semibold text-slate-900">3. Buchen & Kennenlernen</h3>
              <p className="mt-2 text-slate-600">
                Nach der Bestätigung schließt du die Buchung über eine kleine Servicegebühr ab und erhältst die Kontaktdaten.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
