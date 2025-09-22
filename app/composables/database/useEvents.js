export const useEvents = () => {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    const runtimeConfig = useRuntimeConfig && useRuntimeConfig()
    const { logSelect, logInsert, logUpdate, logDelete, logRpc } = useSupabaseLogger()

    const isLoading = ref(false)
    const errorMessage = ref(null)
    const events = ref([])
    
    // Cache za smanjenje requestova
    const eventCache = ref(new Map())
    const attendeesCache = ref(new Map())
    const cacheExpiry = 5 * 60 * 1000 // 5 minuta

    const clearError = () => { errorMessage.value = null }
    
    const isCacheValid = (timestamp) => {
        return Date.now() - timestamp < cacheExpiry
    }

    const fetchEvents = async ({ limit = 50, offset = 0 } = {}) => {
        clearError()
        isLoading.value = true
        try {
            const query = supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1)

            const { data, error } = await logSelect(query, 'events', { limit, offset })

            if (error) throw error
            events.value = data || []
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to fetch events'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const getEventById = async (id, forceRefresh = false) => {
        clearError()
        
        // Proveri cache prvo
        const cached = eventCache.value.get(id)
        if (!forceRefresh && cached && isCacheValid(cached.timestamp)) {
            return cached.data
        }
        
        isLoading.value = true
        try {
            const query = supabase
                .from('events')
                .select('*')
                .eq('id', id)
                .single()

            const { data, error } = await logSelect(query, 'events', { id })

            if (error) throw error
            
            // Cache rezultat
            eventCache.value.set(id, {
                data,
                timestamp: Date.now()
            })
            
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to load event'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const createEvent = async ({ name, location, form, date, attendees = [] }) => {
        clearError()
        isLoading.value = true
        try {
            const payload = { name, location, form, date, attendees }
            const query = supabase
                .from('events')
                .insert(payload)
                .select('*')
                .single()

            const { data, error } = await logInsert(query, 'events', payload)

            if (error) throw error
            // Prepend new event into local list
            events.value = [data, ...events.value]
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to create event'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const updateEvent = async (id, { name, location, form, date, attendees }) => {
        clearError()
        isLoading.value = true
        try {
            const payload = { name, location, form, date, attendees }
            Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

            const query = supabase
                .from('events')
                .update(payload)
                .eq('id', id)
                .select('*')
                .single()

            const { data, error } = await logUpdate(query, 'events', payload)

            if (error) throw error
            events.value = events.value.map((e) => (e.id === id ? data : e))
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to update event'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const updateEventCertificate = async (eventId, certificate) => {
        clearError()
        isLoading.value = true
        try {
            const payload = { certificate }
            const query = supabase
                .from('events')
                .update(payload)
                .eq('id', eventId)
                .select('id, certificate')
                .single()

            const { data, error } = await logUpdate(query, 'events', payload)

            if (error) throw error
            events.value = events.value.map((e) => (e.id === eventId ? { ...e, certificate: data.certificate } : e))
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to update event certificate'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Update a single email template inside the events.emails JSON object
    const updateEventEmails = async (eventId, key, template) => {
        clearError()
        isLoading.value = true
        try {
            const enableEmailRpc = !!(runtimeConfig && runtimeConfig.public && runtimeConfig.public.enableEmailRpc)
            if (enableEmailRpc) {
                // Try atomic server-side update via RPC if available
                const rpcParams = {
                    p_event_id: eventId,
                    p_key: key,
                    p_template: template
                }
                const rpcQuery = supabase.rpc('update_event_email', rpcParams)
                
                const { data: rpcData, error: rpcError } = await logRpc(rpcQuery, 'update_event_email')

                if (!rpcError && rpcData) {
                    events.value = events.value.map((e) => (e.id === eventId ? { ...e, emails: rpcData.emails } : e))
                    return rpcData
                }
            }

            // Fallback: fetch-merge-update if RPC is missing
            const fetchQuery = supabase
                .from('events')
                .select('id, emails')
                .eq('id', eventId)
                .single()

            const { data: current, error: fetchError } = await logSelect(fetchQuery, 'events')

            if (fetchError) throw fetchError

            const existingEmails = (current && current.emails) ? current.emails : {}
            const newEmails = { ...existingEmails, [key]: template }

            const payload = { emails: newEmails }
            const updateQuery = supabase
                .from('events')
                .update(payload)
                .eq('id', eventId)
                .select('id, emails')
                .single()

            const { data, error } = await logUpdate(updateQuery, 'events', payload)

            if (error) throw error
            events.value = events.value.map((e) => (e.id === eventId ? { ...e, emails: data.emails } : e))
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to update event emails'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const deleteEvent = async (id) => {
        clearError()
        isLoading.value = true
        try {
            const query = supabase
                .from('events')
                .delete()
                .eq('id', id)

            const { error } = await logDelete(query, 'events')

            if (error) throw error
            events.value = events.value.filter((e) => e.id !== id)
            return true
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to delete event'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const checkExistingAttendee = async (email, eventId) => {
        clearError()
        isLoading.value = true
        try {
            const query = supabase
                .from('attendees')
                .select('*')
                .eq('email', email)
                .maybeSingle()

            const { data, error } = await logSelect(query, 'attendees')

            if (error) throw error

            // Ako ne postoji attendee sa ovim email-om
            if (!data) {
                return { exists: false, isRegisteredForEvent: false }
            }

            // Proveri da li je već registrovan za ovaj event
            const isRegisteredForEvent = data.events && Array.isArray(data.events) && data.events.includes(eventId)

            return {
                exists: true,
                isRegisteredForEvent,
                attendeeData: data
            }
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to check existing attendee'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const saveAttendee = async (userData) => {
        clearError()
        isLoading.value = true
        try {
            const query = supabase
                .from('attendees')
                .insert(userData)
                .select('*')
                .single()

            const { data, error } = await logInsert(query, 'attendees', userData)

            if (error) throw error
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to save attendee'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const updateAttendeeEvents = async (attendeeId, newEvents) => {
        clearError()
        isLoading.value = true
        try {
            const payload = { events: newEvents }
            const query = supabase
                .from('attendees')
                .update(payload)
                .eq('id', attendeeId)
                .select('*')
                .single()

            const { data, error } = await logUpdate(query, 'attendees', payload)

            if (error) throw error
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to update attendee events'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const getAttendeesByIds = async (attendeeIds, forceRefresh = false) => {
        clearError()
        
        if (!attendeeIds || attendeeIds.length === 0) {
            return []
        }
        
        // Proveri cache za svaki attendee
        const cacheKey = attendeeIds.sort().join(',')
        const cached = attendeesCache.value.get(cacheKey)
        if (!forceRefresh && cached && isCacheValid(cached.timestamp)) {
            return cached.data
        }
        
        isLoading.value = true
        try {
            const query = supabase
                .from('attendees')
                .select('id, first_name, last_name, email, events, created_at, data')
                .in('id', attendeeIds)

            const { data, error } = await logSelect(query, 'attendees')

            if (error) throw error
            
            // Cache rezultat
            attendeesCache.value.set(cacheKey, {
                data: data || [],
                timestamp: Date.now()
            })
            
            return data || []
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to fetch attendees'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // New: Fetch all attendees with server-side pagination and total count
    const fetchAttendeesPaginated = async ({ page = 1, pageSize = 50, sortBy = 'created_at', ascending = false, search = '' } = {}) => {
        clearError()
        isLoading.value = true
        try {
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1

            let query = supabase
                .from('attendees')
                .select('id, first_name, last_name, email, events, created_at, data', { count: 'exact' })

            if (search && search.trim()) {
                const term = `%${search.trim()}%`
                query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`)
            }

            const { data, error, count } = await query
                .order(sortBy, { ascending })
                .range(from, to)

            if (error) throw error

            return { data: data || [], total: count || 0 }
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to fetch attendees'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const deleteAttendee = async (attendeeId) => {
        clearError()
        isLoading.value = true
        try {
            const query = supabase
                .from('attendees')
                .delete()
                .eq('id', attendeeId)

            const { error } = await logDelete(query, 'attendees')

            if (error) throw error
            return true
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to delete attendee'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const updateAttendee = async (attendeeId, { first_name, last_name, email, data }) => {
        clearError()
        isLoading.value = true
        try {
            const payload = { first_name, last_name, email, data }
            Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

            const query = supabase
                .from('attendees')
                .update(payload)
                .eq('id', attendeeId)
                .select('id, first_name, last_name, email, events, created_at, data')
                .single()

            const { data: updatedData, error } = await logUpdate(query, 'attendees', payload)

            if (error) throw error
            return updatedData
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to update attendee'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const getAllEventsForAutocomplete = async () => {
        clearError()
        isLoading.value = true
        try {
            const query = supabase
                .from('events')
                .select('id, name, date')
                .order('name', { ascending: true })

            const { data, error } = await logSelect(query, 'events')

            if (error) throw error
            return data || []
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to fetch events for autocomplete'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const updateEventAttendees = async (eventId, newAttendees) => {
        clearError()
        isLoading.value = true
        try {
            const payload = { attendees: newAttendees }
            const query = supabase
                .from('events')
                .update(payload)
                .eq('id', eventId)
                .select('id, attendees')
                .single()

            const { data, error } = await logUpdate(query, 'events', payload)

            if (error) throw error
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to update event attendees'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const updateEventAttended = async (eventId, newAttended) => {
        clearError()
        isLoading.value = true
        try {
            const payload = { attended: newAttended }
            const query = supabase
                .from('events')
                .update(payload)
                .eq('id', eventId)
                .select('id, attended')
                .single()

            const { data, error } = await logUpdate(query, 'events', payload)

            if (error) throw error
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to update event attended list'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const updateEventPaid = async (eventId, newPaid) => {
        clearError()
        isLoading.value = true
        try {
            const payload = { paid: newPaid }
            const query = supabase
                .from('events')
                .update(payload)
                .eq('id', eventId)
                .select('id, paid')
                .single()

            const { data, error } = await logUpdate(query, 'events', payload)

            if (error) throw error
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to update event paid list'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Funkcija za čišćenje cache-a
    const clearCache = () => {
        eventCache.value.clear()
        attendeesCache.value.clear()
    }

    return {
        // state
        events,
        isLoading,
        errorMessage,
        // actions
        fetchEvents,
        getEventById,
        createEvent,
        updateEvent,
        deleteEvent,
        checkExistingAttendee,
        saveAttendee,
        updateAttendeeEvents,
        getAttendeesByIds,
        deleteAttendee,
        updateAttendee,
        getAllEventsForAutocomplete,
        updateEventAttendees,
        updateEventAttended,
        updateEventPaid,
        updateEventCertificate,
        updateEventEmails,
        fetchAttendeesPaginated,
        clearCache
    }
}
