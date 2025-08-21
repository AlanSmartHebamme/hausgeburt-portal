import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: Stripe.LatestApiVersion, // passt immer zur installierten SDK
})
