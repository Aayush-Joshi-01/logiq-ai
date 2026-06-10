// Stripe webhook disabled for beta — no-op until Razorpay integration.
export default async function handler(req: Request) {
  return new Response('OK', { status: 200 })
}
