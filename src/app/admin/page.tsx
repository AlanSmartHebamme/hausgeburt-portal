import { supabaseServer as createClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Helper to format dates
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminPage() {
  const supabase = await createClient()

  // 1. Check for authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/login')
  }

  // 2. Check for ADMIN role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Zugriff verweigert</h1>
        <p>Diese Seite ist nur für Administratoren zugänglich.</p>
        <Link href="/dashboard" className="text-blue-400 underline mt-4 inline-block">→ Zum Dashboard</Link>
      </div>
    )
  }

  // 3. Fetch data if user is an admin
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      created_at,
      status,
      client:client_id(display_name),
      midwife:midwife_id(display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      created_at,
      status,
      amount_cents,
      currency,
      booking:booking_id(id, client:client_id(display_name))
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Bookings Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Letzte Buchungen</h2>
        {bookingsError && <p className="text-red-400">Fehler beim Laden der Buchungen: {bookingsError.message}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-3">Erstellt</th>
                <th className="p-3">Status</th>
                <th className="p-3">Klient</th>
                <th className="p-3">Hebamme</th>
                <th className="p-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {bookings?.map((booking: any) => (
                <tr key={booking.id} className="border-b border-gray-700">
                  <td className="p-3">{formatDate(booking.created_at)}</td>
                  <td className="p-3">{booking.status}</td>
                  <td className="p-3">{booking.client?.display_name ?? 'N/A'}</td>
                  <td className="p-3">{booking.midwife?.display_name ?? 'N/A'}</td>
                  <td className="p-3 font-mono text-xs">{booking.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Letzte Zahlungen</h2>
        {paymentsError && <p className="text-red-400">Fehler beim Laden der Zahlungen: {paymentsError.message}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-3">Erstellt</th>
                <th className="p-3">Status</th>
                <th className="p-3">Betrag</th>
                <th className="p-3">Klient</th>
                <th className="p-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {payments?.map((payment: any) => (
                <tr key={payment.id} className="border-b border-gray-700">
                  <td className="p-3">{formatDate(payment.created_at)}</td>
                  <td className="p-3">{payment.status}</td>
                  <td className="p-3">{(payment.amount_cents / 100).toFixed(2)} {payment.currency.toUpperCase()}</td>
                  <td className="p-3">{payment.booking?.client?.display_name ?? 'N/A'}</td>
                  <td className="p-3 font-mono text-xs">{payment.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
