export const useAccommodations = () => {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    const runtimeConfig = useRuntimeConfig && useRuntimeConfig()
    const { logSelect, logInsert, logUpdate, logDelete, logRpc } = useSupabaseLogger()

    const isLoading = ref(false)
    const errorMessage = ref(null)
    const accommodations = ref([])
    
    // Cache za smanjenje requestova
    const accommodationCache = ref(new Map())
    const eventAccommodationsCache = ref(new Map())
    const cacheExpiry = 5 * 60 * 1000 // 5 minuta

    const clearError = () => { errorMessage.value = null }
    
    const isCacheValid = (timestamp) => {
        return Date.now() - timestamp < cacheExpiry
    }

    const fetchAccommodations = async ({ limit = 50, offset = 0 } = {}) => {
        clearError()
        isLoading.value = true
        try {
            const query = supabase
                .from('accommodation')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1)

            const { data, error } = await logSelect(query, 'accommodation')

            if (error) throw error
            accommodations.value = data || []
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to fetch accommodations'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Optimizovana funkcija sa caching-om - jedan query umesto dva
    const getAccommodationsByEventId = async (eventId, forceRefresh = false) => {
        clearError()
        
        // Proveri cache prvo
        const cacheKey = `event_${eventId}`
        const cached = eventAccommodationsCache.value.get(cacheKey)
        if (!forceRefresh && cached && isCacheValid(cached.timestamp)) {
            return cached.data
        }
        
        isLoading.value = true
        try {
            // Query for accommodations where event_id array contains the eventId
            const query = supabase
                .from('accommodation')
                .select('*')
                .contains('event_id', [eventId])

            const { data, error } = await logSelect(query, 'accommodation')

            if (error) throw error

            // Cache rezultat
            eventAccommodationsCache.value.set(cacheKey, {
                data: data || [],
                timestamp: Date.now()
            })

            return data || []
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to fetch accommodations for event'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const getAccommodationById = async (id, forceRefresh = false) => {
        clearError()
        
        // Proveri lokalni cache prvo
        const cached = accommodationCache.value.get(id)
        if (!forceRefresh && cached && isCacheValid(cached.timestamp)) {
            return cached.data
        }
        
        isLoading.value = true
        try {
            const { data, error } = await supabase
                .from('accommodation')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            
            // Cache rezultat
            accommodationCache.value.set(id, {
                data,
                timestamp: Date.now()
            })
            
            return data
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to load accommodation'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const createAccommodation = async ({ name, data }) => {
        clearError()
        isLoading.value = true
        try {
            const payload = {
                data,
                // Ensure event_id is stored as an array to match column type uuid[]
                event_id: Array.isArray(data?.event_id)
                    ? data.event_id
                    : (data?.event_id ? [data.event_id] : null),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }

            const query = supabase
                .from('accommodation')
                .insert(payload)
                .select('*')
                .single()

            const { data: result, error } = await logInsert(query, 'accommodation', payload)

            if (error) throw error

            // Prepend new accommodation into local list
            accommodations.value = [result, ...accommodations.value]
            return result
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to create accommodation'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const updateAccommodation = async (id, { name, data }) => {
        clearError()
        isLoading.value = true
        try {
            const payload = {
                name,
                data,
                // Keep event_id in sync if provided inside data
                ...(data?.event_id !== undefined && {
                    event_id: Array.isArray(data.event_id)
                        ? data.event_id
                        : (data.event_id ? [data.event_id] : null)
                }),
                updated_at: new Date().toISOString()
            }

            // Remove undefined values
            Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

            const query = supabase
                .from('accommodation')
                .update(payload)
                .eq('id', id)
                .select('*')
                .single()

            const { data: result, error } = await logUpdate(query, 'accommodation', payload)

            if (error) throw error

            // Update local list
            accommodations.value = accommodations.value.map((a) => (a.id === id ? result : a))
            
            // Invalidate cache
            accommodationCache.value.delete(id)
            // Invalidate event cache entries that might contain this accommodation
            eventAccommodationsCache.value.clear()
            
            return result
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to update accommodation'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const deleteAccommodation = async (id) => {
        clearError()
        isLoading.value = true
        try {
            const query = supabase
                .from('accommodation')
                .delete()
                .eq('id', id)

            const { error } = await logDelete(query, 'accommodation')

            if (error) throw error

            // Remove from local list
            accommodations.value = accommodations.value.filter((a) => a.id !== id)
            return true
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to delete accommodation'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const createReservation = async (accommodationId, reservationData) => {
        clearError()
        isLoading.value = true
        try {
            // First, get the current accommodation with its reservations
            const { data: accommodation, error: fetchError } = await supabase
                .from('accommodation')
                .select('*')
                .eq('id', accommodationId)
                .single()

            if (fetchError) throw fetchError

            // Get existing reservations or initialize empty array
            const existingReservations = accommodation.reservations || []
            
            // Add new reservation with unique ID
            const newReservation = {
                id: crypto.randomUUID(),
                ...reservationData,
                created_at: new Date().toISOString()
            }

            const updatedReservations = [...existingReservations, newReservation]

            // Update accommodation with new reservations array
            const { data: result, error } = await supabase
                .from('accommodation')
                .update({
                    reservations: updatedReservations,
                    updated_at: new Date().toISOString()
                })
                .eq('id', accommodationId)
                .select('*')
                .single()

            if (error) throw error
            return newReservation
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to create reservation'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Optimizovana funkcija za update jedne rezervacije u JSONB array-u (bez RPC-a)
    const updateReservationById = async (accommodationId, reservationId, updatedData) => {
        clearError()
        isLoading.value = true
        try {
            // Direktno koristi lokalni fallback pristup (bez RPC poziva)
            return await updateReservationFallback(accommodationId, reservationId, updatedData)
        } finally {
            isLoading.value = false
        }
    }

    // Fallback metoda za update rezervacije
    const updateReservationFallback = async (accommodationId, reservationId, updatedData) => {
        // Get current accommodation
        const { data: accommodation, error: fetchError } = await supabase
            .from('accommodation')
            .select('reservations')
            .eq('id', accommodationId)
            .single()

        if (fetchError) throw fetchError

        const reservations = accommodation.reservations || []
        
        // Find and update the specific reservation
        const reservationIndex = reservations.findIndex(r => r.id === reservationId)
        if (reservationIndex === -1) {
            throw new Error('Reservation not found')
        }

        // Update only the specific reservation
        reservations[reservationIndex] = {
            ...reservations[reservationIndex],
            ...updatedData,
            updated_at: new Date().toISOString()
        }

        // Update accommodation with modified reservations
        const { data: result, error } = await supabase
            .from('accommodation')
            .update({
                reservations: reservations,
                updated_at: new Date().toISOString()
            })
            .eq('id', accommodationId)
            .select('*')
            .single()

        if (error) throw error
        return reservations[reservationIndex]
    }

    // Funkcija za brisanje rezervacije iz array-a
    const deleteReservationById = async (accommodationId, reservationId) => {
        clearError()
        isLoading.value = true
        try {
            // Get current accommodation
            const { data: accommodation, error: fetchError } = await supabase
                .from('accommodation')
                .select('reservations')
                .eq('id', accommodationId)
                .single()

            if (fetchError) throw fetchError

            const reservations = accommodation.reservations || []
            
            // Filter out the reservation to delete
            const updatedReservations = reservations.filter(r => r.id !== reservationId)

            // Update accommodation
            const { data: result, error } = await supabase
                .from('accommodation')
                .update({
                    reservations: updatedReservations,
                    updated_at: new Date().toISOString()
                })
                .eq('id', accommodationId)
                .select('*')
                .single()

            if (error) throw error
            return true
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to delete reservation'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Batch funkcija za sve reservation operacije u jednom request-u
    const batchUpdateReservation = async (operation) => {
        clearError()
        isLoading.value = true
        try {
            const { type, currentAccommodationId, targetAccommodationId, reservationId, updatedData } = operation

            if (type === 'delete') {
                // Samo obriši rezervaciju
                return await deleteReservationById(currentAccommodationId, reservationId)
            }

            if (type === 'update') {
                // Update u istom accommodation-u (bez RPC-a)
                return await updateReservationFallback(currentAccommodationId, reservationId, updatedData)
            }

            if (type === 'move') {
                // Premesti između accommodation-a - batch operacija
                const currentQuery = supabase.from('accommodation').select('reservations').eq('id', currentAccommodationId).single()
                const targetQuery = supabase.from('accommodation').select('reservations').eq('id', targetAccommodationId).single()
                
                const [currentAccommodation, targetAccommodation] = await Promise.all([
                    logSelect(currentQuery, 'accommodation'),
                    logSelect(targetQuery, 'accommodation')
                ])

                if (currentAccommodation.error) throw currentAccommodation.error
                if (targetAccommodation.error) throw targetAccommodation.error

                // Pripremi nove reservation array-jeve
                const currentReservations = currentAccommodation.data.reservations || []
                const targetReservations = targetAccommodation.data.reservations || []

                // Ukloni iz trenutnog
                const updatedCurrentReservations = currentReservations.filter(r => r.id !== reservationId)
                
                // Dodaj u novi sa updated podacima
                const newReservation = {
                    id: reservationId,
                    ...updatedData,
                    updated_at: new Date().toISOString()
                }
                const updatedTargetReservations = [...targetReservations, newReservation]

                // Batch update oba accommodation-a u jednom pozivu
                const updates = [
                    supabase
                        .from('accommodation')
                        .update({
                            reservations: updatedCurrentReservations,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', currentAccommodationId),
                    supabase
                        .from('accommodation')
                        .update({
                            reservations: updatedTargetReservations,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', targetAccommodationId)
                ]

                const results = await Promise.all(updates)
                
                // Proveri da li su svi update-i uspešni
                for (const result of results) {
                    if (result.error) throw result.error
                }

                return newReservation
            }

            throw new Error('Invalid operation type')
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to batch update reservation'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Fetch accommodation reservations with server-side search and pagination
    const fetchAccommodationReservations = async (accommodationId, { page = 1, pageSize = 20, search = '' } = {}) => {
        clearError()
        isLoading.value = true
        try {
            // First get the accommodation to access reservations array
            const { data: accommodation, error: accommodationError } = await supabase
                .from('accommodation')
                .select('reservations')
                .eq('id', accommodationId)
                .single()

            if (accommodationError) throw accommodationError

            let reservations = accommodation?.reservations || []

            // Apply search filter if provided
            if (search && search.trim()) {
                const searchTerm = search.toLowerCase().trim()
                reservations = reservations.filter(reservation =>
                    reservation.guest_name?.toLowerCase().includes(searchTerm) ||
                    reservation.guest_email?.toLowerCase().includes(searchTerm)
                )
            }

            // Calculate pagination
            const total = reservations.length
            const totalPages = Math.ceil(total / pageSize)
            const offset = (page - 1) * pageSize
            const paginatedReservations = reservations.slice(offset, offset + pageSize)

            return {
                data: paginatedReservations,
                total,
                totalPages,
                currentPage: page,
                pageSize
            }
        } catch (err) {
            errorMessage.value = err?.message || 'Failed to fetch accommodation reservations'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Funkcija za čišćenje cache-a
    const clearCache = () => {
        accommodationCache.value.clear()
        eventAccommodationsCache.value.clear()
    }

    // Funkcija za računanje kapaciteta soba i dostupnosti
    const calculateRoomCapacity = (room, reservations = []) => {
        // Računamo koliko je mesta ukupno u ovom tipu sobe
        const totalBeds = (room.beds || 0) * (room.quantity || 0)
        
        // Računamo koliko je rezervisano za ovaj tip sobe
        const reservedBeds = reservations.filter(reservation => 
            reservation.room_type === room.name
        ).length // Svaka rezervacija zauzima 1 mesto
        
        return {
            total: totalBeds,
            reserved: reservedBeds,
            available: Math.max(0, totalBeds - reservedBeds),
            isFullyBooked: reservedBeds >= totalBeds
        }
    }

    // Funkcija za računanje ukupnog kapaciteta accommodation-a
    const calculateAccommodationCapacity = (accommodation) => {
        const rooms = accommodation.data?.rooms || []
        const reservations = accommodation.reservations || []
        
        let totalCapacity = 0
        let totalReserved = 0
        let availableRooms = []
        
        rooms.forEach(room => {
            const capacity = calculateRoomCapacity(room, reservations)
            totalCapacity += capacity.total
            totalReserved += capacity.reserved
            
            // Dodaj sobu u available ako nije potpuno popunjena
            if (!capacity.isFullyBooked) {
                availableRooms.push({
                    ...room,
                    capacity: capacity
                })
            }
        })
        
        return {
            total: totalCapacity,
            reserved: totalReserved,
            available: totalCapacity - totalReserved,
            isFullyBooked: totalReserved >= totalCapacity,
            availableRooms: availableRooms
        }
    }

    // Funkcija za filtriranje enabled i dostupnih accommodation-a
    const getAvailableAccommodations = (accommodations) => {
        return accommodations.filter(accommodation => {
            // Prvo proveri da li je enabled
            const isEnabled = accommodation.data?.enabled !== false
            if (!isEnabled) return false
            
            // Zatim proveri da li ima dostupnih soba
            const capacity = calculateAccommodationCapacity(accommodation)
            return !capacity.isFullyBooked
        })
    }

    // Funkcija za dobijanje dostupnih soba za accommodation
    const getAvailableRooms = (accommodation) => {
        const capacity = calculateAccommodationCapacity(accommodation)
        return capacity.availableRooms
    }

    // Return reactive state and actions
    return {
        // state
        accommodations,
        isLoading,
        errorMessage,
        // actions
        fetchAccommodations,
        getAccommodationById,
        getAccommodationsByEventId,
        createAccommodation,
        updateAccommodation,
        deleteAccommodation,
        createReservation,
        updateReservationById,
        deleteReservationById,
        batchUpdateReservation,
        fetchAccommodationReservations,
        clearCache,
        // capacity management
        calculateRoomCapacity,
        calculateAccommodationCapacity,
        getAvailableAccommodations,
        getAvailableRooms
    }
}
