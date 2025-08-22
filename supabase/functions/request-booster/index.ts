import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke the function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Find all bookings that need a boost
    // - Status is REQUESTED
    // - Older than 24 hours
    // - Not already boosted
    // - Midwife is a PRO user
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: bookingsToBoost, error: findError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        midwife:profiles!midwife_id ( plan )
      `)
      .eq('status', 'REQUESTED')
      .eq('is_boosted', false)
      .lt('created_at', twentyFourHoursAgo)

    if (findError) throw findError

    // Filter for bookings where the midwife is on a PRO plan
    const proBookings = bookingsToBoost.filter((b: any) => b.midwife?.plan === 'PRO')
    const proBookingIds = proBookings.map((b: any) => b.id)

    if (proBookingIds.length === 0) {
      return new Response(JSON.stringify({ message: 'No bookings to boost.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Update the found bookings to set is_boosted = true
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ is_boosted: true })
      .in('id', proBookingIds)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ message: `Successfully boosted ${proBookingIds.length} bookings.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
