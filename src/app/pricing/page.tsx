// src/app/pricing/page.tsx
'use client'

import UpgradeButton from '@/components/UpgradeButton'

const PRICE_ID_MONTH = 'price_1Ry6zlFi50BYTrK6uG6CZU8d' // <-- Deine Price-ID aus Stripe
const PRICE_ID_YEAR  = 'price_1Ry6zlFi50BYTrK6jbqmr90R' // optional

export default function PricingPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Hebammen Pro</h1>
      <div className="border rounded p-4 space-y-2">
        <p>Mehr Sichtbarkeit & Premium-Features.</p>
        <ul className="list-disc pl-5 text-sm text-neutral-300">
          <li>Profil-Boost in der Suche</li>
          <li>Bevorzugte Anfragen</li>
          <li>Erweiterte Statistiken</li>
        </ul>
        <UpgradeButton priceId={PRICE_ID_MONTH} />
      </div>
    </div>
  )
}
