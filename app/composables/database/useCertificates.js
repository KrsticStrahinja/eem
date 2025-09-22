export const useCertificates = () => {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    const { logSelect, logInsert, logUpdate, logDelete } = useSupabaseLogger()
    const isLoading = ref(false)
    const errorMessage = ref(null)

    const clearError = () => { errorMessage.value = null }

    const getByEventId = async (eventId) => {
        clearError()
        isLoading.value = true
        try {
            const query = supabase
                .from('certificates')
                .select('id, event, data')
                .eq('event', eventId)
                .order('id', { ascending: false })
                .limit(1)

            const { data, error } = await logSelect(query, 'certificates')

            if (error) throw error
            const row = Array.isArray(data) && data.length > 0 ? data[0] : null
            return { data: row?.data || null, id: row?.id || null, event: row?.event || eventId }
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to load certificate'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const getById = async (id) => {
        clearError()
        isLoading.value = true
        try {
            const query = supabase
                .from('certificates')
                .select('id, event, data')
                .eq('id', id)
                .maybeSingle()

            const { data, error } = await logSelect(query, 'certificates')

            if (error) throw error
            return data ? { id: data.id, event: data.event, data: data.data } : null
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to load certificate'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const upsertForEvent = async (eventId, dataPayload) => {
        clearError()
        isLoading.value = true
        try {
            // Find the latest certificate for this event
            const { data: rows, error: findErr } = await supabase
                .from('certificates')
                .select('id')
                .eq('event', eventId)
                .order('id', { ascending: false })
                .limit(1)

            if (findErr) throw findErr

            const latest = Array.isArray(rows) && rows.length > 0 ? rows[0] : null

            if (latest?.id) {
                const { data, error } = await supabase
                    .from('certificates')
                    .update({ data: dataPayload })
                    .eq('id', latest.id)
                    .select('event, data')
                    .single()
                if (error) throw error
                return data
            } else {
                const { data, error } = await supabase
                    .from('certificates')
                    .insert({ event: eventId, data: dataPayload })
                    .select('event, data')
                    .single()
                if (error) throw error
                return data
            }
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to save certificate'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const updateById = async (id, dataPayload) => {
        clearError()
        isLoading.value = true
        try {
            const { data, error } = await supabase
                .from('certificates')
                .update({ data: dataPayload })
                .eq('id', id)
                .select('id, event, data')
                .single()

            if (error) throw error
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to update certificate'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const createForEvent = async (eventId, dataPayload) => {
        clearError()
        isLoading.value = true
        try {
            const { data, error } = await supabase
                .from('certificates')
                .insert({ event: eventId, data: dataPayload })
                .select('event, data')
                .single()

            if (error) throw error
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to create certificate'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const fetchAllByEventId = async (eventId) => {
        clearError()
        isLoading.value = true
        try {
            const { data, error } = await supabase
                .from('certificates')
                .select('id, event, data')
                .eq('event', eventId)
                .order('id', { ascending: false })

            if (error) throw error
            return Array.isArray(data) ? data : []
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to load certificates list'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const removeById = async (id) => {
        clearError()
        isLoading.value = true
        try {
            const { error } = await supabase
                .from('certificates')
                .delete()
                .eq('id', id)

            if (error) throw error
            return true
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to delete certificate'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const removeForEvent = async (eventId) => {
        clearError()
        isLoading.value = true
        try {
            const { error } = await supabase
                .from('certificates')
                .delete()
                .eq('event', eventId)

            if (error) throw error
            return true
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to delete certificate'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    return {
        isLoading,
        errorMessage,
        getByEventId,
        getById,
        fetchAllByEventId,
        upsertForEvent,
        updateById,
        createForEvent,
        removeById,
        removeForEvent
    }
}


