// A separate Express server to reliably handle Stripe webhooks, bypassing Next.js's body parsing issues.
// Run this in a separate terminal: `node src/webhook-server.js`

require('dotenv').config({ path: '.env.local' });
const express = require('express');
const Stripe = require('stripe');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const internalApiSecret = process.env.INTERNAL_API_SECRET;

const PORT = process.env.WEBHOOK_PORT || 3001;

app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  let userId;
  let subscription;
  let plan;

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        subscription = event.data.object;
        userId = subscription.metadata?.supabase_user_id;
        const isActive = ['trialing', 'active'].includes(subscription.status);
        plan = isActive ? 'PRO' : 'FREE';
        break;

      case 'invoice.payment_failed':
        subscription = event.data.object;
        // The subscription object on payment_failed is sometimes nested differently
        const customerId = subscription.customer;
        // We need to get the subscription to find the user ID
        const customerSubscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
        if (customerSubscriptions.data.length > 0) {
          userId = customerSubscriptions.data[0].metadata?.supabase_user_id;
        }
        // On payment failure, we downgrade the user to the FREE plan.
        plan = 'FREE';
        break;
      
      case 'checkout.session.completed':
        const session = event.data.object;
        if (session.metadata?.feature === 'express_booking') {
          const clientId = session.metadata.client_id;
          const midwifeIds = session.metadata.midwife_ids.split(',');

          if (!clientId || midwifeIds.length === 0) {
            throw new Error('Missing metadata for express booking.');
          }

          // Create a Supabase admin client to insert bookings
          const { createClient } = require('@supabase/supabase-js');
          const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

          const newBookings = midwifeIds.map(midwifeId => ({
            client_id: clientId,
            midwife_id: midwifeId,
            status: 'REQUESTED',
            // You might want to add a note that this was an express booking
          }));

          const { error } = await supabaseAdmin.from('bookings').insert(newBookings);
          if (error) {
            throw new Error(`Failed to insert express bookings: ${error.message}`);
          }
          console.log(`Successfully created ${newBookings.length} express bookings for user ${clientId}.`);
        }
        // Acknowledge event, but no plan update needed for one-time payments
        return res.status(200).json({ received: true });

      // We don't need to handle checkout.session.completed for subscriptions here,
      // as customer.subscription.created/updated will fire and are more reliable.
      
      default:
        // For other events, we don't need to update the plan.
        // We can just acknowledge them.
        return res.status(200).json({ received: true, message: `Unhandled event type: ${event.type}` });
    }

    if (userId && plan) {
      console.log(`Webhook received for user ${userId}. Attempting to set plan to ${plan}.`);

      const response = await fetch('http://localhost:3000/api/internal/update-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${internalApiSecret}`,
        },
        body: JSON.stringify({
          userId,
          plan,
          subscriptionId: subscription.id,
          customerId: subscription.customer,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Internal API call failed with status ${response.status}: ${errorData.error}`);
      }

      console.log(`Successfully called internal API for user ${userId}.`);
    }
    
    res.status(200).json({ received: true });

  } catch (err) {
    console.error('Error processing webhook:', err.message);
    res.status(500).json({ error: 'Webhook handler failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
