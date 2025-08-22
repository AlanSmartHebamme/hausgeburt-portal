import Link from 'next/link'
import Image from 'next/image'

// Helper-Komponente für Sektionen, um den Code sauber zu halten
const Section = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <section className={`py-16 sm:py-20 ${className || ''}`}>
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </section>
);

export default function Home() {
  return (
    <>
      {/* 1. Hero-Bereich */}
      <section className="relative py-24 sm:py-32 text-center bg-slate-100 overflow-hidden">
        <div className="absolute inset-0">
          <Image 
            src="https://via.placeholder.com/1920x1080.png/F3F4F6/FFFFFF?text=+" 
            alt="Hintergrundbild einer friedlichen Geburtsszene" 
            layout="fill" 
            objectFit="cover" 
            className="opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-100 to-transparent"></div>
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            Deine Hebamme für eine <span className="text-teal-600">sichere & geborgene Hausgeburt</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-700">
            Finde qualifizierte Hebammen in deiner Nähe, die dich bei deinem Wunsch begleiten.
            <br />
            <span className="font-semibold">Unverbindlich, schnell & kostenlos anfragen.</span>
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/search" 
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-teal-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
            >
              Jetzt Hebamme finden
            </Link>
            <Link 
              href="/register" 
              className="w-full sm:w-auto text-sm font-semibold text-teal-700 hover:underline"
            >
              Für Hebammen
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Trust & Sicherheit */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-12 text-center">
            <p className="text-sm font-semibold text-slate-600">
              ✓ Alle Hebammen sind verifiziert
            </p>
            {/* Platzhalter für zukünftige Logos/Siegel */}
            {/* <div className="flex gap-8 opacity-70">
              <p className="font-medium text-slate-500">Siegel 1</p>
              <p className="font-medium text-slate-500">Logo 2</p>
              <p className="font-medium text-slate-500">Zertifikat 3</p>
            </div> */}
          </div>
        </div>
      </section>

      {/* 3. Vorteile hervorheben */}
      <Section className="bg-white">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Warum du uns vertrauen kannst
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Wir machen die Suche nach deiner Wunschhebamme einfach, sicher und transparent.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold">Kostenlose Anfrage</h3>
            <p className="mt-2 text-slate-600">Stelle Anfragen an so viele Hebammen wie du möchtest – komplett kostenfrei.</p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold">Geprüfte Hebammen</h3>
            <p className="mt-2 text-slate-600">Jedes Profil wird von uns sorgfältig geprüft und verifiziert.</p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold">Sichere Buchung</h3>
            <p className="mt-2 text-slate-600">Deine Daten sind sicher und die Buchung erfolgt über eine geschützte Plattform.</p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold">Schnelle Rückmeldung</h3>
            <p className="mt-2 text-slate-600">Wir legen Wert darauf, dass du schnell eine Antwort auf deine Anfrage erhältst.</p>
          </div>
        </div>
      </Section>

      {/* 4. User Journey (3 Schritte) */}
      <Section className="bg-slate-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Dein Weg zur Hausgeburt in 3 Schritten
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-8 text-left">
          <div className="p-8 bg-white border rounded-lg">
            <h3 className="text-xl font-semibold">1. Suchen & Finden</h3>
            <p className="mt-2 text-slate-600">Gib deine Postleitzahl ein und wir zeigen dir passende, verfügbare Hebammen.</p>
          </div>
          <div className="p-8 bg-white border rounded-lg">
            <h3 className="text-xl font-semibold">2. Anfragen & Bestätigen</h3>
            <p className="mt-2 text-slate-600">Stelle eine unverbindliche Anfrage. Die Hebamme prüft ihre Kapazität und meldet sich.</p>
          </div>
          <div className="p-8 bg-white border rounded-lg">
            <h3 className="text-xl font-semibold">3. Buchen & Kennenlernen</h3>
            <p className="mt-2 text-slate-600">Nach der Bestätigung schließt du die Buchung ab und erhältst die Kontaktdaten.</p>
          </div>
        </div>
      </Section>

      {/* 5. Testimonials */}
      <Section className="bg-white">
        <div className="grid md:grid-cols-2 gap-12">
          <figure className="text-center">
            <blockquote>
              <p className="text-xl italic text-slate-800">
                “Dank dieser Seite habe ich die perfekte Hebamme für unsere Hausgeburt gefunden. Alles war so unkompliziert und hat uns viel Sicherheit gegeben.”
              </p>
            </blockquote>
            <figcaption className="mt-4">
              <div className="font-semibold text-slate-900">Julia M.</div>
              <div className="text-slate-600">Mutter aus Berlin</div>
            </figcaption>
          </figure>
          <figure className="text-center">
            <blockquote>
              <p className="text-xl italic text-slate-800">
                “Als Hebamme ist es toll, eine zentrale Anlaufstelle zu haben. Die Anfragen sind qualifiziert und die Abwicklung ist super einfach.”
              </p>
            </blockquote>
            <figcaption className="mt-4">
              <div className="font-semibold text-slate-900">Anna S.</div>
              <div className="text-slate-600">Hebamme aus Hamburg</div>
            </figcaption>
          </figure>
        </div>
      </Section>
    </>
  );
}
