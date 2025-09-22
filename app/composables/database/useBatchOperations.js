export const useBatchOperations = () => {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    const { logSelect, logInsert, logUpdate, logDelete } = useSupabaseLogger()
    const isLoading = ref(false)
    const errorMessage = ref(null)

    const clearError = () => { errorMessage.value = null }

    // Batch učitavanje accommodations i events za guest
    const loadGuestRelatedData = async (guestData) => {
        clearError()
        isLoading.value = true

        try {
            const promises = []
            const results = {}

            // Ako guest ima event_id, učitaj event
            if (guestData.event_id) {
                promises.push(
                    supabase
                        .from('events')
                        .select('*')
                        .eq('id', guestData.event_id)
                        .single()
                        .then(({ data, error }) => {
                            if (error) throw error
                            results.event = data
                        })
                )

                // Učitaj accommodations za event
                promises.push(
                    supabase
                        .from('accommodation')
                        .select('*')
                        .contains('data->event', [{ id: guestData.event_id }])
                        .then(({ data, error }) => {
                            if (error) throw error
                            results.accommodations = data || []
                        })
                )
            }

            // Ako guest ima accommodation_id, učitaj accommodation
            if (guestData.accommodation_id) {
                promises.push(
                    supabase
                        .from('accommodation')
                        .select('*')
                        .eq('id', guestData.accommodation_id)
                        .single()
                        .then(({ data, error }) => {
                            if (error) throw error
                            results.currentAccommodation = data
                        })
                )
            }

            await Promise.all(promises)
            return results

        } catch (err) {
            errorMessage.value = err?.message || 'Failed to load guest related data'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Batch update za accommodation reservations
    const batchUpdateAccommodationReservations = async (updates) => {
        clearError()
        isLoading.value = true

        try {
            const updatePromises = updates.map(({ accommodationId, reservations }) => {
                const updateData = {
                    reservations,
                    updated_at: new Date().toISOString()
                }
                const query = supabase
                    .from('accommodation')
                    .update(updateData)
                    .eq('id', accommodationId)
                    .select('*')
                    .single()
                
                return logUpdate(query, 'accommodation')
            })

            const results = await Promise.all(updatePromises)
            return results.map(({ data, error }) => {
                if (error) throw error
                return data
            })

        } catch (err) {
            errorMessage.value = err?.message || 'Failed to batch update accommodations'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Batch učitavanje attendees sa event podacima
    const loadAttendeesWithEvents = async (attendeeIds) => {
        clearError()
        isLoading.value = true

        try {
            if (!attendeeIds || attendeeIds.length === 0) {
                return []
            }

            // Učitaj attendees
            const attendeesQuery = supabase
                .from('attendees')
                .select('id, first_name, last_name, email, events, created_at, data')
                .in('id', attendeeIds)

            const { data: attendees, error: attendeesError } = await logSelect(attendeesQuery, 'attendees')

            if (attendeesError) throw attendeesError

            // Izvuci sve unique event IDs
            const eventIds = [...new Set(
                attendees.flatMap(attendee => attendee.events || [])
            )]

            if (eventIds.length === 0) {
                return attendees.map(attendee => ({ ...attendee, eventDetails: [] }))
            }

            // Učitaj event details
            const eventsQuery = supabase
                .from('events')
                .select('id, name, location, date')
                .in('id', eventIds)

            const { data: events, error: eventsError } = await logSelect(eventsQuery, 'events')

            if (eventsError) throw eventsError

            // Kombinuj attendees sa event details
            return attendees.map(attendee => ({
                ...attendee,
                eventDetails: (attendee.events || []).map(eventId =>
                    events.find(event => event.id === eventId)
                ).filter(Boolean)
            }))

        } catch (err) {
            errorMessage.value = err?.message || 'Failed to load attendees with events'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Optimizovano pretraživanje sa pagination
    const searchWithPagination = async (table, searchFields, searchTerm, { page = 1, pageSize = 50, sortBy = 'created_at', ascending = false } = {}) => {
        clearError()
        isLoading.value = true

        try {
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1

            let query = supabase
                .from(table)
                .select('*', { count: 'exact' })

            if (searchTerm && searchTerm.trim()) {
                const term = `%${searchTerm.trim()}%`
                const searchConditions = searchFields.map(field => `${field}.ilike.${term}`).join(',')
                query = query.or(searchConditions)
            }

            query = query.order(sortBy, { ascending }).range(from, to)

            const { data, error, count } = await logSelect(query, table)

            if (error) throw error

            return {
                data: data || [],
                total: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize),
                currentPage: page,
                pageSize
            }

        } catch (err) {
            errorMessage.value = err?.message || `Failed to search ${table}`
            throw err
        } finally {
            isLoading.value = false
        }
    }

    return {
        isLoading,
        errorMessage,
        loadGuestRelatedData,
        batchUpdateAccommodationReservations,
        loadAttendeesWithEvents,
        searchWithPagination,
        clearError
    }
}