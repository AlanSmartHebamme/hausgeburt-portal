import { supabaseServer as createClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Users, FileCheck, Briefcase, ShieldAlert, Star } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

// Helper to format dates
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default async function AdminPage() {
  const supabase = await createClient()

  // 1. Auth and Role Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold">Zugriff verweigert</h1>
        <p>Diese Seite ist nur für Administratoren zugänglich.</p>
        <Button asChild variant="link" className="mt-4"><Link href="/dashboard">→ Zum Dashboard</Link></Button>
      </div>
    )
  }

  // --- Server Actions ---
  async function approveProfile(formData: FormData) {
    'use server'
    const profileId = formData.get('profileId') as string
    if (!profileId) return
    const supabase = await createClient()
    await supabase.from('profiles').update({ status: 'VERIFIED' }).eq('id', profileId)
    revalidatePath('/admin')
  }

  async function rejectProfile(formData: FormData) {
    'use server'
    const profileId = formData.get('profileId') as string
    if (!profileId) return
    const supabase = await createClient()
    await supabase.from('profiles').update({ status: 'DRAFT' }).eq('id', profileId)
    revalidatePath('/admin')
  }

  async function resolveDispute(formData: FormData) {
    'use server'
    const disputeId = formData.get('disputeId') as string
    const resolution = formData.get('resolution') as string
    if (!disputeId || !resolution) return
    const supabase = await createClient()
    await supabase.from('disputes').update({ status: 'RESOLVED', resolution }).eq('id', disputeId)
    revalidatePath('/admin')
  }

  async function deleteReview(formData: FormData) {
    'use server'
    const reviewId = formData.get('reviewId') as string
    if (!reviewId) return
    const supabase = await createClient()
    await supabase.from('reviews').delete().eq('id', reviewId)
    revalidatePath('/admin')
  }
  
  // 3. Fetch all necessary data
  const pendingProfilesPromise = supabase.from('profiles').select('id, display_name, email, created_at').eq('status', 'PENDING').order('created_at', { ascending: true })
  const reviewsPromise = supabase.from('reviews').select('*, client:client_id(display_name), midwife:midwife_id(display_name)').order('created_at', { ascending: false }).limit(5)
  const disputesPromise = supabase.from('disputes').select('*, booking:bookings(id), reporter:reporter_id(display_name)').eq('status', 'OPEN').order('created_at', { ascending: true })
  
  const clientCountPromise = supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'CLIENT')
  const midwifeCountPromise = supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'MIDWIFE')
  const verifiedMidwifeCountPromise = supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'MIDWIFE').eq('status', 'VERIFIED')

  const [
    { data: pendingProfiles, error: profilesError },
    { data: reviews, error: reviewsError },
    { data: disputes, error: disputesError },
    { count: clientCount },
    { count: midwifeCount },
    { count: verifiedMidwifeCount },
  ] = await Promise.all([
    pendingProfilesPromise,
    reviewsPromise,
    disputesPromise,
    clientCountPromise,
    midwifeCountPromise,
    verifiedMidwifeCountPromise,
  ])

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* ... existing stat cards ... */}
      </div>

      {/* Disputes Table */}
      <Card>
        {/* ... existing disputes table ... */}
      </Card>

      {/* Verification Table */}
      <Card>
        {/* ... existing verification table ... */}
      </Card>

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Bewertungen</CardTitle>
          <CardDescription>Die 5 neuesten Bewertungen im System.</CardDescription>
        </CardHeader>
        <CardContent>
        {reviewsError && <p className="text-red-500">Fehler: {reviewsError.message}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Klient</TableHead>
                <TableHead>Hebamme</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Kommentar</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews?.map((review: any) => (
                <TableRow key={review.id}>
                  <TableCell>{formatDate(review.created_at)}</TableCell>
                  <TableCell>{review.client?.display_name ?? 'N/A'}</TableCell>
                  <TableCell>{review.midwife?.display_name ?? 'N/A'}</TableCell>
                  <TableCell className="flex items-center">{review.rating} <Star className="h-4 w-4 ml-1 text-yellow-500" /></TableCell>
                  <TableCell className="text-xs">{review.comment}</TableCell>
                  <TableCell className="text-right">
                    <form action={deleteReview}><input type="hidden" name="reviewId" value={review.id} /><Button size="sm" variant="destructive">Löschen</Button></form>
                  </TableCell>
                </TableRow>
              ))}
              {reviews?.length === 0 && (
                <TableRow><TableCell colSpan={6} className="p-4 text-center text-muted-foreground">Keine Bewertungen vorhanden.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
