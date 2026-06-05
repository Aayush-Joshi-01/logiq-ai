// Supabase OAuth callback — extracts session and redirects to app deep link
export default async function handler(req: Request) {
  const url  = new URL(req.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=no_code`)
  }

  // Exchange code for session via Supabase REST
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey':       process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({ auth_code: code }),
  })

  if (!res.ok) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=exchange_failed`)
  }

  const { access_token, refresh_token } = await res.json()

  // Redirect to app deep link with tokens
  const deepLink = `logiqai://auth/callback?access_token=${access_token}&refresh_token=${refresh_token}`
  return Response.redirect(deepLink)
}
