// Stripe is disabled for beta — Razorpay integration comes post-beta.
// This endpoint returns 503 so mobile app can surface a "coming soon" message.
export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  return Response.json({ message: 'Payments not yet available' }, { status: 503 })
}
