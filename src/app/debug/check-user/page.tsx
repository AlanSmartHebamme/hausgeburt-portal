import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import Link from 'next/link'

// Helper to render data nicely
function DataView({ title, data }: { title: string; data: any }) {
  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <pre className="bg-gray-800 p-3 rounded-md text-sm overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

type PageProps = {
  searchParams: {
    user_id?: string | string[]
  }
}

export default async function CheckUserPage({ searchParams }: PageProps) {
  // Wichtig: Wir brauchen hier einen Admin-Client, um die Daten jedes Nutzers
  // (nicht nur des eingeloggten) nachschlagen zu können.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const userIdParam = searchParams.user_id
  let userId = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam

  // If no user_id is in the URL, get the currently logged-in user
  // Hinweis: Dies funktioniert nur, wenn die Seite von einem eingeloggten Nutzer aufgerufen wird.
  // Für den Admin-Check ist die Angabe von ?user_id=... in der URL zuverlässiger.
  if (!userId) {
  // Temporärer Client mit Anon-Key, um den User aus dem Cookie zu holen
    const { supabaseServer } = await import('@/lib/supabaseServer')
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
    }
  }

  if (!userId) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-xl font-bold">Nutzer-Status-Prüfung</h1>
        <p>Bitte gib eine User-ID in der URL an (z.B. `?user_id=...`) oder logge dich ein, um deinen eigenen Account zu prüfen.</p>
        <Link href="/dashboard" className="text-blue-400 underline mt-4 inline-block">→ Zum Dashboard</Link>
      </div>
    )
  }

  // 1. Fetch user profile from Supabase
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  let stripeCustomerId = profile?.stripe_customer_id
  let stripeSubscription = null
  let stripeCustomer = null

  // 2. If a Stripe Customer ID exists, fetch data from Stripe
  if (stripeCustomerId) {
    try {
      stripeCustomer = await stripe.customers.retrieve(stripeCustomerId)
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        limit: 1,
        status: 'all',
      })
      if (subscriptions.data.length > 0) {
        stripeSubscription = subscriptions.data[0]
      }
    } catch (e: any) {
      stripeCustomer = { error: `Stripe API Error: ${e.message}` }
    }
  }

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-xl font-bold">Nutzer-Status-Prüfung</h1>
      <p className="text-sm text-gray-400">User ID: {userId}</p>
      <Link href="/dashboard" className="text-blue-400 underline mt-2 inline-block">→ Zum Dashboard</Link>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Umgebungsvariablen-Check</h2>
        <ul className="list-disc list-inside text-sm">
          <li className={process.env.STRIPE_WEBHOOK_SECRET ? 'text-green-400' : 'text-red-400'}>
            STRIPE_WEBHOOK_SECRET: {process.env.STRIPE_WEBHOOK_SECRET ? 'Gefunden' : 'FEHLT!'}
          </li>
          <li className={process.env.SUPABASE_SERVICE_ROLE_KEY ? 'text-green-400' : 'text-red-400'}>
            SUPABASE_SERVICE_ROLE_KEY: {process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Gefunden' : 'FEHLT!'}
          </li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          Diese Prüfung zeigt nur, ob die Variablen im Build-Prozess vorhanden sind, nicht ob sie korrekt sind.
        </p>
      </div>

      <DataView title="Supabase Profil" data={profileError ? { error: profileError.message } : profile} />
      
      {stripeCustomerId ? (
        <>
          <DataView title="Stripe Customer Objekt" data={stripeCustomer} />
          <DataView title="Letztes Stripe Abonnement" data={stripeSubscription ?? 'Kein Abonnement gefunden.'} />
        </>
      ) : (
        <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded-md">
          <p>Keine `stripe_customer_id` im Supabase-Profil gefunden. Der Checkout-Prozess hat die ID nicht erfolgreich gespeichert.</p>
        </div>
      )}
    </div>
  )
}
