import { supabaseServer } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'
import ical from 'ical-generator'

export async function GET(
  req: Request,
  { params }: { params: { calendarId: string } }
) {
  try {
    const { calendarId } = params
    if (!calendarId) {
      return new NextResponse('Missing calendarId', { status: 400 })
    }

    const supabase = await supabaseServer()

    // 1. Find the profile associated with this secret calendar ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('calendar_id', calendarId)
      .eq('role', 'MIDWIFE')
      .single()

    if (profileError || !profile) {
      return new NextResponse('Unauthorized or Not Found', { status: 404 })
    }

    // 2. Fetch all confirmed/paid bookings for this midwife
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, created_at, status, client:client_id(display_name)')
      .eq('midwife_id', profile.id)
      .in('status', ['CONFIRMED', 'PAID'])

    if (bookingsError) {
      throw bookingsError
    }

    // 3. Generate the iCal feed
    const calendar = ical({ name: `Buchungen für ${profile.display_name}` });

    bookings.forEach(booking => {
      const clientProfile = Array.isArray(booking.client) ? booking.client[0] : booking.client;
      // For simplicity, we create an all-day event on the date the request was created.
      // A real implementation would need actual event start/end dates in the bookings table.
      calendar.createEvent({
        start: new Date(booking.created_at),
        end: new Date(booking.created_at),
        allDay: true,
        summary: `Buchung von ${clientProfile?.display_name || 'Unbekannt'}`,
        description: `Status: ${booking.status}\nBooking ID: ${booking.id}`,
      });
    });

    // 4. Return the feed as a .ics file
    return new Response(calendar.toString(), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendar.ics"',
      },
    })

  } catch (error) {
    console.error('[CALENDAR_FEED_ERROR]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
