import Stripe from 'stripe'
import { supabase } from '../../lib/supabase'
import { bustTierCache } from '../../lib/subscription'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  // MUST read raw text body BEFORE calling constructEvent
  // Vercel body parser corrupts the raw body needed for signature verification
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.userId) {
        await supabase.from('profiles').update({
          subscription_tier:      'pro',
          stripe_customer_id:     session.customer as string,
          stripe_subscription_id: session.subscription as string,
        }).eq('id', session.metadata.userId)

        await bustTierCache(session.metadata.userId)
      }
      break
    }

    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', inv.customer as string)
        .single()

      if (data) {
        await supabase.from('profiles')
          .update({ subscription_tier: 'pro' })
          .eq('id', data.id)
        await bustTierCache(data.id)
      }
      break
    }

    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const obj = event.data.object as any
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', obj.customer)
        .single()

      if (data) {
        await supabase.from('profiles')
          .update({ subscription_tier: 'free' })
          .eq('id', data.id)
        await bustTierCache(data.id)
      }
      break
    }
  }

  return new Response('OK', { status: 200 })
}
