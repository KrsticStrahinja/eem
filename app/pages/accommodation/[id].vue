<template>
    <div class="w-full">
        <!-- Edit Guest Modal -->
        <DashboardSlideoverEditAccommodationGuest v-model:open="isEditGuestModalOpen" :guest="selectedGuest"
            :accommodation-id="accommodationId" @guest-updated="handleGuestUpdated" />

        <!-- Edit Accommodation Modal -->
        <DashboardSlideoverCreateAccommodation v-model:open="isEditAccommodationOpen" :accommodation="accommodation"
            @refreshAccommodations="handleAccommodationUpdated" />

        <UDashboardNavbar
            :title="accommodationLoading ? 'Loading...' : (accommodation?.data?.name || 'Accommodation Details')"
            class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
            <template #leading>
                <UDashboardSidebarCollapse />
            </template>

            <template #trailing>
                <UBadge :label="totalGuests" variant="subtle" />
            </template>

            <template #right>
                <UDropdownMenu v-if="accommodation" :items="[
                    {
                        label: 'Export Reservations',
                        icon: 'i-lucide-download',
                        onClick: () => exportReservations()
                    },
                    {
                        label: 'Print Room List',
                        icon: 'i-lucide-printer',
                        onClick: () => printRoomList()
                    },
                    {
                        type: 'separator'
                    },
                    {
                        label: 'Edit Accommodation',
                        icon: 'i-lucide-edit',
                        onClick: () => editAccommodation()
                    }
                ]" :content="{
                    align: 'end',
                    side: 'bottom',
                    sideOffset: 4
                }">
                    <UButton icon="i-lucide-more-horizontal" color="neutral" variant="outline" size="lg">
                        Actions
                    </UButton>
                </UDropdownMenu>
                <UButton icon="i-heroicons-arrow-left" color="neutral" variant="outline" size="lg" to="/accommodations">
                    Back to Accommodations
                </UButton>
            </template>
        </UDashboardNavbar>

        <!-- Loading State -->
        <div v-if="accommodationLoading" class="flex justify-center items-center h-64 mt-16">
            <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-primary" />
            <span class="ml-2">Loading accommodation details...</span>
        </div>

        <!-- Accommodation Content -->
        <div v-else-if="accommodation" class="p-6">
            <!-- Accommodation Overview -->
            <div class="mb-8">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Main Info Card -->
                    <UCard class="lg:col-span-2 shadow-sm">
                        <template #header>
                            <div class="flex items-center justify-between">
                                <h2 class="text-xl font-semibold">{{ accommodation.data.name }}</h2>
                                <div class="flex items-center gap-2">
                                    <UBadge 
                                        :color="getAccommodationStatus().color"
                                        :icon="getAccommodationStatus().icon"
                                        size="sm"
                                    >
                                        {{ getAccommodationStatus().label }}
                                    </UBadge>
                                    <UBadge :label="`${totalRooms} rooms`" variant="soft" color="primary" />
                                </div>
                            </div>
                        </template>

                        <div class="space-y-4">
                            <!-- Event Dates -->
                            <div v-if="accommodation.data.event?.date" class="flex items-center gap-3">
                                <UIcon name="i-lucide-calendar" class="h-5 w-5 text-gray-500" />
                                <div>
                                    <span class="font-medium">Event Period:</span>
                                    {{ formatEventDate(accommodation.data.event.date) }}
                                </div>
                            </div>

                            <!-- Event -->
                            <div v-if="accommodation.data.event" class="flex items-start gap-3">
                                <UIcon name="i-lucide-calendar-days" class="h-5 w-5 text-gray-500 mt-0.5" />
                                <div class="flex items-center gap-2">
                                    <span class="font-medium">Event:</span>
                                    <div class="flex items-center gap-2 mt-1">
                                        <UBadge :label="accommodation.data.event.name" variant="soft"
                                            color="secondary" />
                                    </div>
                                </div>
                            </div>

                            <!-- Capacity Summary -->
                            <div class="flex items-center gap-3">
                                <UIcon name="i-lucide-users" class="h-5 w-5 text-gray-500" />
                                <div>
                                    <span class="font-medium">Total Capacity:</span> {{ totalCapacity }} guests
                                    <span class="mx-2">•</span>
                                    <span class="font-medium">Occupied:</span> {{ totalGuests }} guests
                                    <span class="mx-2">•</span>
                                    <span class="font-medium">Available:</span> {{ totalCapacity - totalGuests }} spots
                                </div>
                            </div>
                        </div>
                    </UCard>

                    <!-- Quick Stats -->
                    <UCard class="shadow-sm">
                        <template #header>
                            <h3 class="text-lg font-medium">Quick Stats</h3>
                        </template>

                        <div class="space-y-4">
                            <div v-for="room in roomTypes" :key="room.name" class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">{{ room.name }}</span>
                                <span class="text-sm font-semibold">{{ room.quantity }} rooms, {{ room.beds }} beds each</span>
                            </div>
                            <div class="flex justify-between items-center border-t border-gray-200 pt-4">
                                <span class="text-sm text-gray-600 font-medium">Total Capacity</span>
                                <span class="text-sm font-semibold">{{ totalCapacity }} beds</span>
                            </div>
                        </div>
                    </UCard>
                </div>
            </div>

            <!-- Daily Capacity -->
            <div v-if="sortedCapacityDates.length > 0" class="mt-8">
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <UCard v-for="date in sortedCapacityDates" :key="date" class="shadow-sm">
                        <template #header>
                            <div class="flex items-center justify-between">
                                <h3 class="font-medium">{{ formatCapacityDate(date) }}</h3>
                                <UBadge
                                    :label="`${capacityStatistics[date].totalOccupied}/${capacityStatistics[date].totalCapacity}`"
                                    variant="outline" />
                            </div>
                        </template>

                        <div class="space-y-3">
                            <div v-for="(roomStat, roomType) in capacityStatistics[date].roomStats" :key="roomType"
                                class="flex items-center justify-between">
                                <span class="text-sm text-gray-600">{{ roomType }}</span>
                                <span class="text-sm font-medium">{{ roomStat.occupied }}/{{ roomStat.capacity }}</span>
                            </div>
                        </div>
                    </UCard>
                </div>
            </div>

            <!-- All Reservations Table -->
            <div class="mt-8">
                <UCard class="shadow-sm">
                    <template #header>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <h3 class="text-lg font-semibold flex items-center gap-2">
                                    <UIcon name="i-lucide-clipboard-list" class="h-5 w-5" />
                                    All Reservations
                                </h3>
                            </div>
                        </div>
                    </template>

                    <!-- Search and Pagination Controls -->
                    <div class="p-4 border-b border-gray-200">
                        <div class="flex justify-between items-center gap-3">
                            <div class="flex items-center gap-2">
                                <UInput v-model="reservationsSearchQuery" icon="i-lucide-search"
                                    placeholder="Search by name or email..." size="sm" class="w-64"
                                    :loading="reservationsLoading" @input="handleSearchInput" />
                                <UBadge :label="`${totalReservations} total`" variant="subtle" />
                            </div>


                            <UPagination v-model="currentPage" :page-count="totalPages" :total="totalReservations"
                                :input="false" @update:model-value="goToPage" />
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div v-if="reservationsLoading" class="flex justify-center items-center h-32">
                        <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-primary" />
                        <span class="ml-2">Loading reservations...</span>
                    </div>

                    <!-- Table -->
                    <UTable v-else :data="reservations" :columns="reservationColumns" class="w-full">
                        <template #empty>
                            <div class="text-center py-8 text-gray-500">
                                <UIcon name="i-lucide-users-x" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 class="text-lg font-medium text-gray-900 mb-2">No reservations found</h3>
                                <p class="text-gray-500">
                                    {{ emptyStateMessage }}
                                </p>
                            </div>
                        </template>
                    </UTable>
                </UCard>
            </div>


        </div>

        <!-- Error State -->
        <div v-else class="flex justify-center items-center h-64 mt-16">
            <div class="text-center">
                <UIcon name="i-lucide-alert-circle" class="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">Accommodation not found</h3>
                <p class="text-gray-500">The accommodation you're looking for doesn't exist or has been removed.</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useAccommodations } from '~/composables/database/useAccommodations'
import { useBatchOperations } from '~/composables/database/useBatchOperations'
import { formatDate } from '~/composables/useHelpers'
import { h, resolveComponent } from 'vue'
import { useClipboard, useDebounceFn } from '@vueuse/core'
import DashboardSlideoverCreateAccommodation from '~/components/dashboard/slideover/CreateAccommodation.vue'

const route = useRoute()
const { getAccommodationById, fetchAccommodationReservations, isLoading, calculateAccommodationCapacity } = useAccommodations()
const { searchWithPagination } = useBatchOperations()
const { copy } = useClipboard()
const toast = useToast()

const accommodationId = route.params.id
const accommodation = ref(null)
const accommodationLoading = ref(true)

// Search functionality for reservations
const reservationsSearchQuery = ref('')
const currentSearchQuery = ref('')

// Pagination state
const currentPage = ref(1)
const pageSize = 20
const totalReservations = ref(0)
const totalPages = ref(0)
const reservations = ref([])
const reservationsLoading = ref(false)

// Modal states for guest actions
const isEditGuestModalOpen = ref(false)
const selectedGuest = ref(null)

// Modal state for accommodation editing
const isEditAccommodationOpen = ref(false)

// Computed properties for accommodation data
const roomTypes = computed(() => {
    return accommodation.value?.data?.rooms || []
})

const totalRooms = computed(() => {
    return roomTypes.value.reduce((total, room) => total + (room.quantity || 0), 0)
})

const totalCapacity = computed(() => {
    return roomTypes.value.reduce((total, room) => {
        return total + ((room.beds || 0) * (room.quantity || 0))
    }, 0)
})

const totalGuests = computed(() => {
    if (!accommodation.value?.reservations) return 0
    return accommodation.value.reservations.length
})

// Get accommodation status badge
const getAccommodationStatus = () => {
    if (!accommodation.value) return { label: 'Loading...', color: 'gray', icon: 'i-lucide-loader-2' }
    
    const isEnabled = accommodation.value.data?.enabled !== false
    const capacity = calculateAccommodationCapacity(accommodation.value)
    
    if (!isEnabled) {
        return { 
            label: 'Disabled', 
            color: 'gray',
            icon: 'i-lucide-eye-off'
        }
    }
    
    if (capacity.isFullyBooked) {
        return { 
            label: 'Full', 
            color: 'red',
            icon: 'i-lucide-users-x'
        }
    }
    
    if (capacity.available <= 2) {
        return { 
            label: `${capacity.available} left`, 
            color: 'orange',
            icon: 'i-lucide-alert-triangle'
        }
    }
    
    return { 
        label: 'Available', 
        color: 'green',
        icon: 'i-lucide-check-circle'
    }
}



const occupancyRate = computed(() => {
    if (totalCapacity.value === 0) return 0
    return Math.round((totalGuests.value / totalCapacity.value) * 100)
})





// Capacity statistics by date and room type
const capacityStatistics = computed(() => {
    if (!accommodation.value?.reservations || !accommodation.value?.data?.rooms) return {}

    const reservations = accommodation.value.reservations
    const rooms = accommodation.value.data.rooms

    // Create room capacity map
    const roomCapacities = {}
    rooms.forEach(room => {
        roomCapacities[room.name] = {
            beds: room.beds || 0,
            quantity: room.quantity || 0,
            totalCapacity: (room.beds || 0) * (room.quantity || 0)
        }
    })

    // Helpers to normalize dates to YYYY-MM-DD using LOCAL components to match selection UI
    const formatYmdLocal = (dateObj) => {
        const y = dateObj.getFullYear()
        const m = String(dateObj.getMonth() + 1).padStart(2, '0')
        const d = String(dateObj.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
    }

    const ymdFromParts = (year, month, day) => {
        const local = new Date(year, month - 1, day)
        return formatYmdLocal(local)
    }

    const normalizeReservationDate = (dateInput) => {
        // Handles: ISO string, { date: string }, or { day, month, year }
        if (!dateInput) return null
        if (typeof dateInput === 'string') {
            return formatYmdLocal(new Date(dateInput))
        }
        if (typeof dateInput === 'object') {
            if (dateInput.date) {
                return formatYmdLocal(new Date(dateInput.date))
            }
            if (dateInput.year && dateInput.month && dateInput.day) {
                return ymdFromParts(dateInput.year, dateInput.month, dateInput.day)
            }
        }
        return null
    }

    // Get all dates from event period instead of just reservation dates
    const allDates = new Set()

    // If we have event dates, use those (iterate in LOCAL to mirror selection UI)
    if (accommodation.value?.data?.event?.date) {
        const eventDate = accommodation.value.data.event.date
        if (eventDate.start && eventDate.end) {
            const startLocal = new Date(eventDate.start.year, eventDate.start.month - 1, eventDate.start.day)
            const endLocal = new Date(eventDate.end.year, eventDate.end.month - 1, eventDate.end.day)

            for (let d = new Date(startLocal); d <= endLocal; d.setDate(d.getDate() + 1)) {
                allDates.add(formatYmdLocal(new Date(d)))
            }
        }
    }

    // If no event dates, fall back to reservation dates
    if (allDates.size === 0) {
        reservations.forEach(reservation => {
            if (reservation.accommodation_dates && Array.isArray(reservation.accommodation_dates)) {
                reservation.accommodation_dates.forEach(dateItem => {
                    const ymd = normalizeReservationDate(dateItem)
                    if (ymd) allDates.add(ymd)
                })
            }
        })
    }

    // Calculate occupancy for each date and room type
    const dateStats = {}
    Array.from(allDates).sort().forEach(date => {
        dateStats[date] = {
            date,
            roomStats: {},
            totalOccupied: 0,
            totalCapacity: 0
        }

        // Initialize room stats for this date
        Object.keys(roomCapacities).forEach(roomType => {
            dateStats[date].roomStats[roomType] = {
                occupied: 0,
                capacity: roomCapacities[roomType].totalCapacity,
                occupancyRate: 0,
                guests: []
            }
        })

        // Count occupancy for this date
        reservations.forEach(reservation => {
            if (reservation.accommodation_dates &&
                Array.isArray(reservation.accommodation_dates) &&
                reservation.room_type &&
                roomCapacities[reservation.room_type]) {

                const reservationDates = reservation.accommodation_dates
                    .map(d => normalizeReservationDate(d))
                    .filter(Boolean)

                if (reservationDates.includes(date)) {
                    const roomType = reservation.room_type
                    dateStats[date].roomStats[roomType].occupied += 1
                    dateStats[date].roomStats[roomType].guests.push({
                        name: reservation.guest_name,
                        email: reservation.guest_email,
                        roommate: reservation.roommate_email
                    })
                }
            }
        })

        // Calculate totals and occupancy rates for this date
        Object.keys(dateStats[date].roomStats).forEach(roomType => {
            const roomStat = dateStats[date].roomStats[roomType]
            roomStat.occupancyRate = roomStat.capacity > 0
                ? Math.round((roomStat.occupied / roomStat.capacity) * 100)
                : 0

            dateStats[date].totalOccupied += roomStat.occupied
            dateStats[date].totalCapacity += roomStat.capacity
        })

        dateStats[date].totalOccupancyRate = dateStats[date].totalCapacity > 0
            ? Math.round((dateStats[date].totalOccupied / dateStats[date].totalCapacity) * 100)
            : 0
    })

    return dateStats
})

// Get sorted dates for display
const sortedCapacityDates = computed(() => {
    return Object.keys(capacityStatistics.value).sort()
})

// Overall capacity summary
const overallCapacitySummary = computed(() => {
    const stats = capacityStatistics.value
    const dates = Object.keys(stats)

    if (dates.length === 0) return null

    let totalOccupiedNights = 0
    let totalCapacityNights = 0
    let peakOccupancy = 0
    let peakDate = ''
    let lowOccupancy = 100
    let lowDate = ''

    dates.forEach(date => {
        const dayStats = stats[date]
        totalOccupiedNights += dayStats.totalOccupied
        totalCapacityNights += dayStats.totalCapacity

        if (dayStats.totalOccupancyRate > peakOccupancy) {
            peakOccupancy = dayStats.totalOccupancyRate
            peakDate = date
        }

        if (dayStats.totalOccupancyRate < lowOccupancy) {
            lowOccupancy = dayStats.totalOccupancyRate
            lowDate = date
        }
    })

    return {
        averageOccupancy: totalCapacityNights > 0
            ? Math.round((totalOccupiedNights / totalCapacityNights) * 100)
            : 0,
        peakOccupancy,
        peakDate,
        lowOccupancy,
        lowDate,
        totalNights: dates.length,
        totalGuestNights: totalOccupiedNights
    }
})

// Computed properties for pagination
const hasPrevPage = computed(() => currentPage.value > 1)
const hasNextPage = computed(() => currentPage.value < totalPages.value)

// Empty state message
const emptyStateMessage = computed(() => {
    return currentSearchQuery.value
        ? 'Try adjusting your search terms.'
        : 'This accommodation doesn\'t have any reservations yet.'
})

// Debounced search function
const debouncedSearch = useDebounceFn(async () => {
    currentSearchQuery.value = reservationsSearchQuery.value
    currentPage.value = 1 // Reset to first page when searching
    await fetchReservations()
}, 1000)

// Handle search input
const handleSearchInput = () => {
    debouncedSearch()
}

// Table columns for reservations
const reservationColumns = [
    {
        accessorKey: 'guest_name',
        header: 'Guest Name'
    },
    {
        accessorKey: 'room_type',
        header: 'Room Type'
    },
    {
        accessorKey: 'guest_email',
        header: 'Email'
    },
    {
        accessorKey: 'roommate_email',
        header: 'Roommate Email',
        cell: ({ getValue }) => getValue() || '-'
    },
    {
        accessorKey: 'accommodation_nights',
        header: 'Nights',
        cell: ({ getValue }) => getValue() || '-'
    },
    {
        accessorKey: 'accommodation_dates',
        header: 'Check-in',
        cell: ({ row }) => {
            const dates = row.original.accommodation_dates
            const normalized = normalizeReservationDates(dates)
            if (normalized.length === 0) return '-'
            return formatDateString(normalized[0])
        }
    },
    {
        accessorKey: 'accommodation_dates',
        header: 'Check-out',
        cell: ({ row }) => {
            const dates = row.original.accommodation_dates
            const normalized = normalizeReservationDates(dates)
            if (!Array.isArray(normalized) || normalized.length === 0) return '-'
            // Prikaži poslednji izabrani dan kao check-out (bez +1)
            return formatDateString(normalized[normalized.length - 1])
        }
    },
    {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
            const UButton = resolveComponent('UButton')
            const UDropdownMenu = resolveComponent('UDropdownMenu')

            return h(
                'div',
                { class: 'text-right' },
                h(
                    UDropdownMenu,
                    {
                        content: { align: 'end' },
                        items: getGuestActions(row),
                        'aria-label': 'Guest actions'
                    },
                    () =>
                        h(UButton, {
                            icon: 'i-lucide-ellipsis-vertical',
                            color: 'neutral',
                            variant: 'ghost',
                            class: 'ml-auto',
                            'aria-label': 'Actions dropdown'
                        })
                )
            )
        }
    }
]

// Helper functions

const formatDateString = (dateStr) => {
    if (!dateStr) return ''
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    } catch {
        return dateStr
    }
}

// Normalize reservation dates array to ISO strings (YYYY-MM-DDTHH:mmZ) for display logic
const normalizeReservationDates = (dates) => {
    if (!Array.isArray(dates)) return []
    const toIso = (item) => {
        if (!item) return null
        if (typeof item === 'string') return item
        if (typeof item === 'object') {
            if (item.date) return item.date
            if (item.year && item.month && item.day) {
                return new Date(item.year, item.month - 1, item.day).toISOString()
            }
        }
        return null
    }
    return dates.map(toIso).filter(Boolean).sort((a, b) => new Date(a) - new Date(b))
}

const formatEventDate = (eventDate) => {
    if (!eventDate?.start || !eventDate?.end) return ''

    try {
        const startDate = new Date(eventDate.start.year, eventDate.start.month - 1, eventDate.start.day)
        const endDate = new Date(eventDate.end.year, eventDate.end.month - 1, eventDate.end.day)

        const startFormatted = startDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
        const endFormatted = endDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })

        return `${startFormatted} - ${endFormatted}`
    } catch (error) {
        console.error('Error formatting event date:', error)
        return ''
    }
}

const formatCapacityDate = (dateStr) => {
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        })
    } catch (error) {
        return dateStr
    }
}

const getOccupancyColor = (rate) => {
    if (rate >= 90) return 'red'
    if (rate >= 75) return 'orange'
    if (rate >= 50) return 'yellow'
    if (rate >= 25) return 'blue'
    return 'gray'
}

// Get actions for guest row
function getGuestActions(row) {
    return [
        {
            label: 'Edit Guest',
            icon: 'i-lucide-edit',
            onClick() {
                editGuest(row.original)
            }
        },
        {
            label: 'Copy Email',
            icon: 'i-lucide-copy',
            onClick() {
                copyGuestEmail(row.original.guest_email)
            }
        }
    ]
}

// Action handlers
const editGuest = (guest) => {
    selectedGuest.value = guest
    isEditGuestModalOpen.value = true
}

const copyGuestEmail = (email) => {
    copy(email)
    toast.add({
        title: 'Email copied to clipboard!',
        description: email,
        color: 'success',
        icon: 'i-lucide-circle-check',
        timeout: 3000
    })
}

const handleGuestUpdated = async (updatedGuest) => {
    // Refresh both accommodation and reservations data to update all statistics
    try {
        // Force refresh to ensure availability stats reflect latest changes
        await fetchAccommodation()

        // Update selectedGuest if it's the same guest being viewed/edited (null-safe)
        if (updatedGuest && selectedGuest.value && selectedGuest.value.id === updatedGuest.id) {
            selectedGuest.value = updatedGuest
        }

        // Toast depending on action
        if (updatedGuest) {
            toast.add({
                title: 'Guest updated successfully!',
                description: `${updatedGuest.guest_name} has been updated.`,
                color: 'success',
                icon: 'i-lucide-circle-check',
                timeout: 4000
            })
        } else {
            toast.add({
                title: 'Guest removed from accommodation',
                description: 'The reservation has been removed and availability updated.',
                color: 'success',
                icon: 'i-lucide-check-circle',
                timeout: 4000
            })
        }
    } catch (err) {
        console.error('Failed to refresh accommodation data:', err)
        toast.add({
            title: 'Failed to refresh data',
            description: 'Please refresh the page to see latest changes.',
            color: 'error',
            timeout: 4000
        })
    }
}





// Fetch accommodation data
const fetchAccommodation = async () => {
    accommodationLoading.value = true
    try {
        // Force refresh to avoid stale cached data so capacityStatistics recomputes correctly
        accommodation.value = await getAccommodationById(accommodationId, true)
        // After loading accommodation, fetch reservations
        await fetchReservations()
    } catch (err) {
        console.error('Failed to load accommodation:', err)
        accommodation.value = null
    } finally {
        accommodationLoading.value = false
    }
}

// Fetch reservations with server-side search and pagination
const fetchReservations = async () => {
    if (!accommodationId) return

    reservationsLoading.value = true
    try {
        const result = await fetchAccommodationReservations(accommodationId, {
            page: currentPage.value,
            pageSize: pageSize,
            search: currentSearchQuery.value
        })

        reservations.value = result.data
        totalReservations.value = result.total
        totalPages.value = result.totalPages
    } catch (err) {
        console.error('Failed to load reservations:', err)
        reservations.value = []
        totalReservations.value = 0
        totalPages.value = 0
    } finally {
        reservationsLoading.value = false
    }
}

// Pagination functions
const goToPage = (page) => {
    currentPage.value = page
    fetchReservations()
}

const nextPage = () => {
    if (hasNextPage.value) {
        currentPage.value++
        fetchReservations()
    }
}

const prevPage = () => {
    if (hasPrevPage.value) {
        currentPage.value--
        fetchReservations()
    }
}

// Action functions
const exportReservations = () => {
    // TODO: Implement export functionality
}

const printRoomList = () => {
    // TODO: Implement print functionality
    window.print()
}

const editAccommodation = () => {
    isEditAccommodationOpen.value = true
}

const handleAccommodationUpdated = async () => {
    // Refresh accommodation data after update
    await fetchAccommodation()

    toast.add({
        title: 'Accommodation Updated',
        description: 'The accommodation has been updated successfully.',
        color: 'success',
        icon: 'i-lucide-check-circle',
        timeout: 4000
    })
}

onMounted(() => {
    fetchAccommodation()
})
</script>