export async function GET() {
  console.log('=== HEALTH CHECK HIT ===')
  return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
