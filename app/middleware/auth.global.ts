export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  
  // Lista javnih stranica dostupnih bez prijave
  const publicRoutes = [
    '/login',
    '/pub',
    // Svi putevi koji počinju sa /pub/
  ]

  // Lista javnih putanja za statičke fajlove
  const publicStaticPaths = [
    '/certificates/',
    '/idcards/',
    '/favicon.ico',
    '/robots.txt'
  ]

  // Funkcija za proveru da li je putanja javna
  const isPublicRoute = (path: string) => {
    return publicRoutes.some(route =>
      path === route || path.startsWith('/pub/')
    ) || publicStaticPaths.some(staticPath =>
      path.startsWith(staticPath)
    )
  }
  
  // Ako korisnik nije ulogovan
  if (!user.value) {
    // Dozvoli pristup javnim stranicama
    if (isPublicRoute(to.path)) {
      return
    }
    
    // Za sve ostale stranice, preusmeri na login
    return navigateTo('/login')
  }
  
  // Ako je korisnik ulogovan i pokušava da pristupi login stranici
  if (user.value && to.path === '/login') {
    return navigateTo('/')
  }
})
