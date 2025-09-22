export const useSettings = () => {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    const { logSelect, logInsert, logUpdate, logDelete } = useSupabaseLogger()

    const isLoading = ref(false)
    const errorMessage = ref(null)
    const settings = ref(null)

    const clearError = () => { errorMessage.value = null }

    const fetchSettings = async () => {
        clearError()
        isLoading.value = true
        try {
            const query = supabase
                .from('settings')
                .select('*')
                .eq('id', 1)
                .single()

            const { data, error } = await logSelect(query, 'settings')

            if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
            settings.value = data || null
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to fetch settings'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const updateSettings = async (settingsData) => {
        clearError()
        isLoading.value = true
        try {
            // Prepare the payload with SMTP settings stored as structured JSON (not stringified)
            const payload = {
                id: 1,
                smtp: settingsData,
                updated_at: new Date().toISOString()
            }

            const query = supabase
                .from('settings')
                .upsert(payload, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                })
                .select('*')
                .single()

            const { data, error } = await logUpdate(query, 'settings', payload)

            if (error) throw error
            settings.value = data
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to update settings'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const createSettings = async (settingsData) => {
        clearError()
        isLoading.value = true
        try {
            const payload = {
                id: 1,
                smtp: settingsData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }

            const query = supabase
                .from('settings')
                .insert(payload)
                .select('*')
                .single()

            const { data, error } = await logInsert(query, 'settings', payload)

            if (error) throw error
            settings.value = data
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to create settings'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const getSmtpSettings = async () => {
        if (!settings.value) {
            await fetchSettings()
        }

        if (settings.value?.smtp) {
            try {
                const raw = settings.value.smtp
                const parsedSettings = typeof raw === 'string' ? JSON.parse(raw) : raw

                // Handle both nested and flat JSON structures
                if (parsedSettings?.smtp) {
                    // New structure with nested smtp object
                    return {
                        companyName: parsedSettings.companyName || '',
                        adminEmail: parsedSettings.adminEmail || '',
                        silentEmail: parsedSettings.silentEmail || '',
                        host: parsedSettings.smtp.host || '',
                        port: parsedSettings.smtp.port || 587,
                        username: parsedSettings.smtp.username || '',
                        password: parsedSettings.smtp.password || '',
                        encryption: parsedSettings.smtp.encryption || 'tls'
                    }
                } else {
                    // Flat structure already matches the form state
                    return {
                        companyName: parsedSettings.companyName || '',
                        adminEmail: parsedSettings.adminEmail || '',
                        silentEmail: parsedSettings.silentEmail || '',
                        host: parsedSettings.host || '',
                        port: parsedSettings.port || 587,
                        username: parsedSettings.username || '',
                        password: parsedSettings.password || '',
                        encryption: parsedSettings.encryption || 'tls'
                    }
                }
            } catch (err) {
                console.error('Failed to parse SMTP settings:', err)
                return null
            }
        }

        return null
    }

    return {
        // State
        isLoading,
        errorMessage,
        settings,

        // Methods
        fetchSettings,
        updateSettings,
        createSettings,
        getSmtpSettings,
        clearError
    }
}
