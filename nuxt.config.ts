// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true },
    modules: ['@nuxt/ui', '@nuxt/ui-pro', '@nuxtjs/supabase'],
    css: ['~/assets/css/main.css'],
    nitro: {
        routeRules: {
            '/certificates/**': {
                index: false,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=604800'
                }
            },
            '/idcards/**': {
                index: false,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=604800'
                }
            }
        }
    },
    runtimeConfig: {
        public: {
            supabase: {
                url: process.env.NUXT_SUPABASE_URL,
                key: process.env.NUXT_SUPABASE_ANON_KEY,
                // safety: even if a redirect plugin is cached, send to '/' not '/login'
                redirectOptions: {
                    login: '/',
                    callback: '/confirm',
                    include: [],
                    exclude: ['*']
                }
            }
        }
    },
    supabase: {
        redirect: false
    }
})
