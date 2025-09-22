<template>
    <USlideover v-model:open="isOpen" side="right" title="Edit Guest Reservation">
        <template #body>
            <div class="flex flex-col gap-y-8">
                <div>
                    <h3 class="text-lg font-medium text-gray-700 mb-6">Accommodation</h3>

                    <div class="flex flex-col gap-6">
                        <USelect v-model="needAccommodation"
                            :items="[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]"
                            placeholder="Need accommodation?" class="w-full" />

                        <template v-if="needAccommodation === 'yes'">
                            <USelect v-model="selectedAccommodation" :items="accommodationOptions"
                                placeholder="Select accommodation" class="w-full" />

                            <USelect v-if="selectedAccommodation" v-model="selectedRoom" :items="roomOptions"
                                placeholder="Select room" class="w-full" />

                            <UInput v-if="showRoommateField" v-model="roommateEmail" placeholder=""
                                :ui="{ base: 'peer' }" class="w-full" type="email">
                                <label
                                    class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                    <span class="inline-flex bg-default px-1">Preferred roommate email (optional)</span>
                                </label>
                            </UInput>

                            <div v-if="hasEventDates" class="border-t border-gray-100 pt-6">
                                <h4 class="text-sm font-medium text-gray-700 mb-3">Accommodation Dates</h4>
                                <p class="text-xs text-gray-500 mb-4">Select which days you need accommodation ({{
                                    formatDateRange() }})</p>

                                <div class="space-y-3">
                                    <div class="flex gap-2 mb-3">
                                        <UButton size="xs" variant="soft" color="secondary" @click="selectAllDates"
                                            :disabled="selectedEventDates.length === availableEventDates.length">
                                            Select All
                                        </UButton>
                                        <UButton size="xs" variant="soft" color="error" @click="clearAllDates"
                                            :disabled="selectedEventDates.length === 0">
                                            Clear All
                                        </UButton>
                                    </div>

                                    <div class="grid grid-cols-1">
                                        <div v-for="date in availableEventDates" :key="date.toISOString()"
                                            class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                                            <input :id="`date-${date.toISOString()}`" type="checkbox"
                                                :value="date.toISOString()" v-model="selectedEventDates"
                                                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                                            <label :for="`date-${date.toISOString()}`"
                                                class="text-sm text-gray-700 cursor-pointer flex-1">
                                                {{ formatEventDate(date) }}
                                            </label>
                                        </div>
                                    </div>

                                    <div v-if="selectedEventDates.length > 0"
                                        class="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p class="text-sm text-blue-700">
                                            <UIcon name="i-lucide-bed" class="h-4 w-4 inline mr-1" />
                                            Accommodation needed for {{ selectedEventDates.length }} night{{
                                                selectedEventDates.length !== 1 ? 's' : '' }} out of {{
                                                availableEventDates.length }}
                                        </p>
                                    </div>

                                    <div v-else class="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <p class="text-sm text-yellow-700">
                                            <UIcon name="i-lucide-calendar-x" class="h-4 w-4 inline mr-1" />
                                            Please select which nights you need accommodation
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </template>

        <template #footer>
            <div class="flex gap-2">
                <UButton color="neutral" variant="outline" @click="isOpen = false" label="Cancel" />
                <UButton color="primary" @click="handleUpdate" :loading="isLoading" label="Save" />
            </div>
        </template>
    </USlideover>
</template>

<script setup>
import { useAccommodations } from '@/composables/database/useAccommodations'
import { useEvents } from '@/composables/database/useEvents'

const props = defineProps({
    guest: {
        type: Object,
        default: null
    },
    accommodationId: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['guestUpdated'])

const isOpen = defineModel('open')
const isLoading = ref(false)

// Form state
const eventAccommodations = ref([])
const needAccommodation = ref('')
const selectedAccommodation = ref('')
const selectedRoom = ref('')
const roommateEmail = ref('')
const eventData = ref(null)
const selectedEventDates = ref([])

const { updateAccommodation, getAccommodationById, getAccommodationsByEventId, batchUpdateReservation } = useAccommodations()
const { getEventById } = useEvents()

// Computed properties
const accommodationOptions = computed(() => {
    return eventAccommodations.value.map(acc => {
        const name = acc?.data?.name || acc?.data?.data?.name || 'Accommodation'
        return { label: name, value: name }
    })
})

const roomOptions = computed(() => {
    if (!selectedAccommodation.value) return []

    const acc = eventAccommodations.value.find(a => {
        const name = a?.data?.name || a?.data?.data?.name
        return name === selectedAccommodation.value
    })

    if (!acc?.data?.rooms) return []

    return acc.data.rooms.map(room => ({
        label: `${room.name} (${room.beds} beds)`,
        value: `${room.name} (${room.beds} beds)`,
        beds: room.beds
    }))
})

const eventDateRange = computed(() => {
    if (!eventData.value?.date) return null

    const { start, end } = eventData.value.date
    if (!start || !end) return null

    return {
        start: new Date(start.year, start.month - 1, start.day),
        end: new Date(end.year, end.month - 1, end.day)
    }
})

const availableEventDates = computed(() => {
    if (!eventDateRange.value) return []

    const dates = []
    const currentDate = new Date(eventDateRange.value.start)
    const endDate = new Date(eventDateRange.value.end)

    while (currentDate <= endDate) {
        dates.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
    }

    return dates
})

const hasEventDates = computed(() => availableEventDates.value.length > 0)

const showRoommateField = computed(() => {
    if (!selectedRoom.value) return false
    const room = roomOptions.value.find(r => r.value === selectedRoom.value)
    return room && room.beds > 1
})

// Helper functions
const formatEventDate = (date) => {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

const formatDateRange = () => {
    if (!eventDateRange.value) return ''

    const start = eventDateRange.value.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const end = eventDateRange.value.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    return `${start} - ${end}`
}

const selectAllDates = () => {
    selectedEventDates.value = availableEventDates.value.map(date => date.toISOString())
}

const clearAllDates = () => {
    selectedEventDates.value = []
}

// Optimizovano učitavanje guest podataka sa batch loading
const loadGuestData = async () => {
    if (!props.guest) return

    // Set form values from guest data
    roommateEmail.value = props.guest.roommate_email || ''
    needAccommodation.value = props.guest.accommodation_id ? 'yes' : 'no'
    
    // Parse accommodation dates properly
    if (Array.isArray(props.guest.accommodation_dates)) {
        selectedEventDates.value = props.guest.accommodation_dates.map(dateItem => {
            // Handle both string dates and object dates
            if (typeof dateItem === 'string') {
                return dateItem
            } else if (dateItem && typeof dateItem === 'object' && dateItem.date) {
                return dateItem.date
            } else if (dateItem && typeof dateItem === 'object' && dateItem.day && dateItem.month && dateItem.year) {
                // Convert {day, month, year} format to ISO string
                const date = new Date(dateItem.year, dateItem.month - 1, dateItem.day)
                return date.toISOString()
            }
            console.warn('Unknown date format:', dateItem)
            return null
        }).filter(Boolean)
    } else {
        selectedEventDates.value = []
    }

    if (!props.guest.event_id) return

    try {
        // Batch load event and accommodations data paralelno
        const [eventResult, accommodationsResult] = await Promise.all([
            getEventById(props.guest.event_id),
            getAccommodationsByEventId(props.guest.event_id)
        ])

        eventData.value = eventResult
        eventAccommodations.value = accommodationsResult

        // Set current accommodation and room
        const currentAccommodation = eventAccommodations.value.find(acc => acc.id === props.accommodationId)
        if (currentAccommodation) {
            selectedAccommodation.value = currentAccommodation?.data?.name || currentAccommodation?.data?.data?.name || ''

            if (props.guest.room_type) {
                const room = currentAccommodation.data?.rooms?.find(r => r.name === props.guest.room_type)
                if (room) {
                    selectedRoom.value = `${room.name} (${room.beds} beds)`
                }
            }
        }
    } catch (error) {
        console.error('Error loading guest data:', error)
    }
}

// Update guest reservation - optimizovano u jedan batch request
const handleUpdate = async () => {
    if (!props.guest?.id) return

    isLoading.value = true

    try {
        // Handle removal from accommodation
        if (needAccommodation.value === 'no') {
            await batchUpdateReservation({
                type: 'delete',
                currentAccommodationId: props.accommodationId,
                reservationId: props.guest.id
            })

            emit('guestUpdated', null)
            isOpen.value = false
            useToast().add({
                title: 'Accommodation Removed!',
                description: 'Guest has been removed from accommodation.',
                icon: 'i-heroicons-check-circle',
                color: 'success',
                timeout: 3000
            })
            return
        }

        // Determine target accommodation
        const targetAccommodationId = getTargetAccommodationId()
        const needToMove = targetAccommodationId !== props.accommodationId

        // Build updated reservation data
        const updatedReservation = buildUpdatedReservation(targetAccommodationId)

        // Validate reservation object
        if (!isValidReservation(updatedReservation)) {
            throw new Error('Invalid reservation data')
        }

        // Jedan batch request za sve operacije
        let result
        if (needToMove) {
            result = await batchUpdateReservation({
                type: 'move',
                currentAccommodationId: props.accommodationId,
                targetAccommodationId: targetAccommodationId,
                reservationId: props.guest.id,
                updatedData: updatedReservation
            })
        } else {
            result = await batchUpdateReservation({
                type: 'update',
                currentAccommodationId: props.accommodationId,
                reservationId: props.guest.id,
                updatedData: updatedReservation
            })
        }

        emit('guestUpdated', result || updatedReservation)
        isOpen.value = false
        // Success toast is handled at the page level after data refresh to avoid duplicates

    } catch (error) {
        console.error('Error updating guest:', error)
        useToast().add({
            title: 'Update Failed!',
            description: `Failed to update accommodation details: ${error.message}`,
            icon: 'i-heroicons-exclamation-triangle',
            color: 'error',
            timeout: 5000
        })
    } finally {
        isLoading.value = false
    }
}

// Helper functions for update process
const getTargetAccommodationId = () => {
    if (!selectedAccommodation.value) return props.accommodationId

    const newAccommodation = eventAccommodations.value.find(acc => {
        const name = acc?.data?.name || acc?.data?.data?.name
        return name === selectedAccommodation.value
    })

    return newAccommodation?.id || props.accommodationId
}

const buildUpdatedReservation = (targetAccommodationId) => {
    const roomType = selectedRoom.value ? selectedRoom.value.split(' (')[0] : props.guest.room_type

    return {
        ...props.guest,
        accommodation_id: targetAccommodationId,
        room_type: roomType,
        roommate_email: roommateEmail.value?.trim() || null,
        accommodation_dates: selectedEventDates.value.length > 0 ? selectedEventDates.value : null,
        accommodation_nights: selectedEventDates.value.length || null,
        updated_at: new Date().toISOString()
    }
}

const isValidReservation = (reservation) => {
    return reservation &&
        typeof reservation === 'object' &&
        reservation.id &&
        reservation.accommodation_id
}


// Watch for guest prop changes to reload data
watch(() => props.guest, async (newGuest) => {
    if (newGuest) {
        await loadGuestData()
    }
}, { immediate: true })
</script>