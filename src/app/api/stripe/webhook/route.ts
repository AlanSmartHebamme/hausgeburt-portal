// ==========================================================================================
// DEPRECATED WEBHOOK HANDLER
// ==========================================================================================
// This Next.js API route is no longer in use for handling Stripe webhooks.
// Due to persistent issues with raw body parsing in the Next.js App Router environment
// during local development, the webhook handling has been moved to a dedicated,
// standalone Express server.
//
// The active webhook handler can be found in:
// src/webhook-server.js
//
// This file is kept for historical purposes but can be safely deleted.
// ==========================================================================================

import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  return NextResponse.json(
    { 
      error: 'This webhook endpoint is deprecated. Please use the standalone webhook server.' 
    }, 
    { status: 410 } // 410 Gone
  )
}
