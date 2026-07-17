import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { method } = req

  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][month - 1]

  const count = Math.floor(Math.random() * 900) + 100
  const sequential = String(count).padStart(3, '0')

  const nomorDokumen = `PKK/${year}/${roman}/${sequential}`

  return new Response(JSON.stringify({ nomor_dokumen: nomorDokumen }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
