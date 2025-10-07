export default defineEventHandler((event) => {
  // Lista javnih statičkih putanja koje su dostupne bez autentifikacije
  const publicPaths = [
    '/certificates/',
    '/idcards/',
    '/logs/',
    '/favicon.ico',
    '/robots.txt'
  ]

  // Proveri da li je putanja javna statička putanja
  const isPublicPath = publicPaths.some(path =>
    event.path.startsWith(path)
  )

  // Ako je javna putanja, dodaj CORS headers
  if (isPublicPath) {
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', '*')
    setHeader(event, 'Cache-Control', 'public, max-age=604800') // 7 dana
  }
})
