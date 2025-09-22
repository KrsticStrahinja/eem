// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true },
    modules: ['@nuxt/ui', '@nuxt/ui-pro', '@nuxtjs/supabase'],
    css: ['~/assets/css/main.css'],
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
