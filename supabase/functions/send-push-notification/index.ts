import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { method } = req

  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { user_id, title, body, data } = await req.json()

  // Get push tokens for user
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', user_id)

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ error: 'No push tokens found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const messages = tokens.map((t: any) => ({
    to: t.token,
    sound: 'default',
    title,
    body,
    data: data || {},
  }))

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(messages),
  })

  const result = await response.json()

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
