<template>
    <USlideover v-model:open="isOpen" side="right" :title="isEditMode ? 'Edit Accommodation' : 'Create Accommodation'">
        <template #body>
            <div class="flex flex-col gap-y-8">
                <UInput v-model="accommodationName" placeholder="" :ui="{ base: 'peer' }" class="w-full">
                    <label
                        class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                        <span class="inline-flex bg-default px-1">Accommodation name</span>
                    </label>
                </UInput>

                <USelectMenu v-model="selectedEvent" :items="eventOptions" :loading="eventsLoading" searchable
                    placeholder="Select event" label="Associated Event" class="w-full" />

                <!-- Enable/Disable Switch -->
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-300">
                    <div class="flex flex-col">
                        <label class="text-sm font-medium text-gray-700">Accommodation Status</label>
                        <p class="text-xs text-gray-500">
                            {{ isEnabled ? 'Enabled for public booking' : 'Disabled - hidden from users' }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-medium" :class="isEnabled ? 'text-green-600' : 'text-red-600'">
                            {{ isEnabled ? 'Enabled' : 'Disabled' }}
                        </span>
                        <USwitch v-model="isEnabled" />
                    </div>
                </div>

                <!-- Availability Period Display -->
                <div v-if="selectedEvent" class="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-calendar" class="h-4 w-4 text-blue-600" />
                        <span class="text-xs text-blue-700 font-medium">{{ availabilityPeriod }}</span>
                    </div>
                    <p class="text-xs text-blue-600 mt-1">
                        Accommodation will be available during the selected event period
                    </p>
                </div>

                <UCard class="mb-4 shadow-sm">
                    <template #header>
                        <h3 class="font-medium text-sm">Room Details</h3>
                    </template>

                    <div class="flex flex-col gap-y-4">
                        <UInput v-model="roomName" placeholder="" :ui="{ base: 'peer' }" class="w-full">
                            <label
                                class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                <span class="inline-flex bg-default px-1">Room name</span>
                            </label>
                        </UInput>
                        <div v-if="roomNameError" class="text-xs">
                            {{ roomNameError }}
                        </div>

                        <div class="flex gap-x-4">
                            <div class="flex-1">
                                <UInput v-model="beds" type="number" placeholder="" :ui="{ base: 'peer' }"
                                    class="w-full">
                                    <label
                                        class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                        <span class="inline-flex bg-default px-1">Beds</span>
                                    </label>
                                </UInput>
                                <div v-if="bedsError" class="text-xs">
                                    {{ bedsError }}
                                </div>
                            </div>

                            <div class="flex-1">
                                <UInput v-model="roomQuantity" type="number" placeholder="" :ui="{ base: 'peer' }"
                                    class="w-full">
                                    <label
                                        class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                        <span class="inline-flex bg-default px-1">Room quantity</span>
                                    </label>
                                </UInput>
                                <div v-if="roomQuantityError" class=" text-xs">
                                    {{ roomQuantityError }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <template #footer>
                        <UButton color="primary" variant="solid" label="Add a room" icon="i-lucide-plus"
                            @click="addRoom" />
                    </template>
                </UCard>

                <div>
                    <!-- Added Rooms List -->
                    <div v-if="rooms.length > 0" class="mt-4">
                        <h4 class="font-medium text-sm mb-2">Added Rooms:</h4>
                        <div class="space-y-2">
                            <UCard v-for="room in rooms" :key="room.id" class="border border-gray-100 shadow-sm">
                                <div class="flex flex-col gap-3">
                                    <template v-if="editingRoomId === room.id">
                                        <div class="flex flex-col gap-y-6">
                                            <div>
                                                <UInput v-model="editRoomName" placeholder="" :ui="{ base: 'peer' }" class="w-full">
                                                    <label
                                                        class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                                        <span class="inline-flex bg-default px-1">Room name</span>
                                                    </label>
                                                </UInput>
                                            </div>
                                            <div class="flex gap-x-4">
                                                <div>
                                                    <UInput v-model="editBeds" type="number" placeholder="" :ui="{ base: 'peer' }" class="w-full">
                                                        <label
                                                            class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                                            <span class="inline-flex bg-default px-1">Beds</span>
                                                        </label>
                                                    </UInput>
                                                    <div v-if="editBedsError" class="text-xs">{{ editBedsError }}</div>
                                                </div>
                                                <div>
                                                    <UInput v-model="editRoomQuantity" type="number" placeholder="" :ui="{ base: 'peer' }" class="w-full">
                                                        <label
                                                            class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                                            <span class="inline-flex bg-default px-1">Room quantity</span>
                                                        </label>
                                                    </UInput>
                                                    <div v-if="editRoomQuantityError" class="text-xs">{{ editRoomQuantityError }}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex gap-2">
                                            <UButton size="sm" color="primary" icon="i-lucide-check" @click="saveEditRoom(room.id)">Save</UButton>
                                            <UButton size="sm" variant="soft" color="neutral" icon="i-lucide-x" @click="cancelEditRoom">Cancel</UButton>
                                        </div>
                                    </template>
                                    <template v-else>
                                        <div class="flex justify-between items-center">
                                            <div class="flex flex-col">
                                                <span class="font-medium">{{ room.name }}</span>
                                                <span class="text-sm text-gray-500">{{ room.beds }} beds • {{ room.quantity }} rooms</span>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <UButton size="sm" variant="soft" icon="i-lucide-pencil" @click="startEditRoom(room)">Edit</UButton>
                                                <UButton size="sm" variant="soft" color="error" icon="i-lucide-trash-2" @click="removeRoom(room.id)">Remove</UButton>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                            </UCard>
                        </div>
                    </div>

                    <!-- JSON Preview -->
                    <div v-if="rooms.length > 0" class="mt-4">
                        <h4 class="font-medium text-sm mb-2">JSON Preview:</h4>
                        <UCard class="bg-gray-50 shadow-sm">
                            <pre
                                class="text-xs text-gray-700 overflow-x-auto">{{ JSON.stringify(rooms, null, 2) }}</pre>
                        </UCard>
                    </div>
                </div>
            </div>
        </template>

        <template #footer>
            <div class="flex gap-2">
                <UButton color="neutral" variant="outline" @click="closeModal">
                    Cancel
                </UButton>
                <UButton color="primary" @click="handleSubmit" :loading="isLoading">
                    {{ isEditMode ? 'Update' : 'Create' }}
                </UButton>
            </div>
        </template>
    </USlideover>
</template>

<script setup>
import { useAccommodations } from '@/composables/database/useAccommodations'
import { useEvents } from '@/composables/database/useEvents'

const props = defineProps({
    accommodation: {
        type: Object,
        default: null
    }
})

const isOpen = defineModel('open')
const emit = defineEmits(['refreshAccommodations'])

const accommodationName = ref('')
const roomName = ref('')
const beds = ref('')
const roomQuantity = ref('')
const rooms = ref([])
const isLoading = ref(false)
const selectedEvent = ref(null)
const eventOptions = ref([])
const eventsLoading = ref(false)
const allEvents = ref([])
const isEnabled = ref(true)

// Error states for room validation
const roomNameError = ref('')
const bedsError = ref('')
const roomQuantityError = ref('')

// Inline edit state for rooms
const editingRoomId = ref(null)
const editRoomName = ref('')
const editBeds = ref('')
const editRoomQuantity = ref('')
const editBedsError = ref('')
const editRoomQuantityError = ref('')

const startEditRoom = (room) => {
    editingRoomId.value = room.id
    editRoomName.value = room.name
    editBeds.value = String(room.beds)
    editRoomQuantity.value = String(room.quantity)
    editBedsError.value = ''
    editRoomQuantityError.value = ''
}

const cancelEditRoom = () => {
    editingRoomId.value = null
    editRoomName.value = ''
    editBeds.value = ''
    editRoomQuantity.value = ''
    editBedsError.value = ''
    editRoomQuantityError.value = ''
}

const saveEditRoom = (roomId) => {
    // Validate
    editBedsError.value = ''
    editRoomQuantityError.value = ''

    const hasInvalidBeds = isNaN(Number(editBeds.value)) || Number(editBeds.value) <= 0
    const hasInvalidQty = isNaN(Number(editRoomQuantity.value)) || Number(editRoomQuantity.value) <= 0

    if (hasInvalidBeds) editBedsError.value = 'must be a positive number'
    if (hasInvalidQty) editRoomQuantityError.value = 'must be a positive number'
    if (hasInvalidBeds || hasInvalidQty) return

    const index = rooms.value.findIndex(r => r.id === roomId)
    if (index !== -1) {
        rooms.value[index] = {
            ...rooms.value[index],
            name: editRoomName.value.trim() || rooms.value[index].name,
            beds: Number(editBeds.value),
            quantity: Number(editRoomQuantity.value)
        }
    }

    cancelEditRoom()
}

// Use accommodations composable
const { createAccommodation, updateAccommodation } = useAccommodations()

// Computed properties
const isEditMode = computed(() => !!props.accommodation)

// Use events composable
const { getAllEventsForAutocomplete } = useEvents()

// Computed property to get accommodation availability dates from selected event
const accommodationAvailability = computed(() => {
    if (!selectedEvent.value) return null

    // Get the full event data for selected event
    const eventData = allEvents.value.find(event => event.id === selectedEvent.value.value)

    if (!eventData?.date?.start || !eventData?.date?.end) return null

    const eventStart = new Date(eventData.date.start.year, eventData.date.start.month - 1, eventData.date.start.day)
    const eventEnd = new Date(eventData.date.end.year, eventData.date.end.month - 1, eventData.date.end.day)

    return {
        start: eventStart,
        end: eventEnd,
        event: eventData
    }
})

// Computed property to format the availability period for display
const availabilityPeriod = computed(() => {
    if (!accommodationAvailability.value) return 'Select events to see availability period'

    const { start, end } = accommodationAvailability.value
    const startFormatted = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
    const endFormatted = end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })

    return `Available: ${startFormatted} - ${endFormatted}`
})



const addRoom = () => {
    // Reset previous errors
    roomNameError.value = ''
    bedsError.value = ''
    roomQuantityError.value = ''

    // Validate required fields
    let hasErrors = false

    if (!roomName.value?.trim()) {
        roomNameError.value = 'required'
        hasErrors = true
    }

    if (!beds.value || beds.value === '') {
        bedsError.value = 'required'
        hasErrors = true
    } else if (isNaN(Number(beds.value)) || Number(beds.value) <= 0) {
        bedsError.value = 'must be a positive number'
        hasErrors = true
    }

    if (!roomQuantity.value || roomQuantity.value === '') {
        roomQuantityError.value = 'required'
        hasErrors = true
    } else if (isNaN(Number(roomQuantity.value)) || Number(roomQuantity.value) <= 0) {
        roomQuantityError.value = 'must be a positive number'
        hasErrors = true
    }

    // If there are errors, don't add the room
    if (hasErrors) return

    const newRoom = {
        id: Date.now(),
        name: roomName.value.trim(),
        beds: Number(beds.value),
        quantity: Number(roomQuantity.value)
    }

    rooms.value.push(newRoom)

    // Reset room input fields and errors
    roomName.value = ''
    beds.value = ''
    roomQuantity.value = ''
    roomNameError.value = ''
    bedsError.value = ''
    roomQuantityError.value = ''
}

const removeRoom = (roomId) => {
    rooms.value = rooms.value.filter(room => room.id !== roomId)
}

// Load events for selection
const loadEvents = async () => {
    try {
        eventsLoading.value = true
        const events = await getAllEventsForAutocomplete()

        // Store full event data for date access
        allEvents.value = events

        // Format events for USelect component
        eventOptions.value = events.map(event => ({
            label: event.name,
            value: event.id,
            event: event // Store full event data
        }))

        // After events are loaded, set selected event if in edit mode
        if (isEditMode.value && props.accommodation?.data?.event) {
            setSelectedEventFromData()
        }
    } catch (error) {
        console.error('Failed to load events:', error)
    } finally {
        eventsLoading.value = false
    }
}

// Set selected event from accommodation data (called after events are loaded)
const setSelectedEventFromData = () => {
    if (!props.accommodation?.data?.event) return

    // Handle both old array format and new object format
    const eventId = Array.isArray(props.accommodation.data.event)
        ? props.accommodation.data.event[0]?.id
        : props.accommodation.data.event.id

    if (!eventId) return

    // Find matching event from the loaded eventOptions
    const matchingEvent = eventOptions.value.find(option => option.value === eventId)

    if (matchingEvent) {
        selectedEvent.value = matchingEvent
    }
}

// Load accommodation data for editing
const loadAccommodationData = () => {
    if (!props.accommodation) return

    const data = props.accommodation.data

    // Load basic fields
    accommodationName.value = data.name || ''
    isEnabled.value = data.enabled !== undefined ? data.enabled : true

    // Load rooms
    if (data.rooms && Array.isArray(data.rooms)) {
        rooms.value = data.rooms.map(room => ({
            ...room,
            id: room.id || Date.now() + Math.random() // Ensure each room has an ID
        }))
    }

    // Selected event will be set after events are loaded in loadEvents()
}

const resetForm = () => {
    accommodationName.value = ''
    selectedEvent.value = null
    roomName.value = ''
    beds.value = ''
    roomQuantity.value = ''
    rooms.value = []
    roomNameError.value = ''
    bedsError.value = ''
    roomQuantityError.value = ''
    isEnabled.value = true
}

const closeModal = () => {
    isOpen.value = false
    if (!isEditMode.value) {
        resetForm()
    }
}

const handleSubmit = async () => {
    if (!accommodationName.value?.trim()) return

    isLoading.value = true

    try {
        // Extract event data with name, id, and dates from selected event
        let selectedEventData = null
        if (selectedEvent.value) {
            const fullEventData = allEvents.value.find(e => e.id === selectedEvent.value.value)
            selectedEventData = {
                name: selectedEvent.value.label,
                id: selectedEvent.value.value,
                date: fullEventData?.date || null
            }
        }

        // Prepare accommodation data - all info goes into 'data' field
        const accommodationData = {
            data: {
                name: accommodationName.value.trim(),
                location: isEditMode.value ? (props.accommodation.data?.location || 'TBD') : 'TBD',
                rooms: rooms.value,
                event: selectedEventData, // Single event object instead of array
                description: `Accommodation with ${rooms.value.length} room types`,
                event_id: selectedEvent.value ? selectedEvent.value.value : null, // Single UUID instead of array
                enabled: isEnabled.value, // Add enabled status
                // Add availability dates from selected event
                availability: accommodationAvailability.value ? {
                    start: {
                        day: accommodationAvailability.value.start.getDate(),
                        month: accommodationAvailability.value.start.getMonth() + 1,
                        year: accommodationAvailability.value.start.getFullYear()
                    },
                    end: {
                        day: accommodationAvailability.value.end.getDate(),
                        month: accommodationAvailability.value.end.getMonth() + 1,
                        year: accommodationAvailability.value.end.getFullYear()
                    }
                } : null
            },
        }

        let result
        if (isEditMode.value) {
            result = await updateAccommodation(props.accommodation.id, accommodationData)
        } else {
            result = await createAccommodation(accommodationData)
        }

        // Emit event to refresh parent component
        emit('refreshAccommodations')

        // Close modal and reset form
        closeModal()

    } catch (e) {
        console.error(`Failed to ${isEditMode.value ? 'update' : 'create'} accommodation:`, e)
    } finally {
        isLoading.value = false
    }
}

// Watch for accommodation prop changes to reload data
watch(() => props.accommodation, (newVal) => {
    if (newVal) {
        loadAccommodationData()
        // If events are already loaded, set selected event immediately
        if (eventOptions.value.length > 0) {
            setSelectedEventFromData()
        }
    }
}, { immediate: true })

// Watch for modal opening to load data
watch(() => isOpen.value, (newValue) => {
    if (newValue) {
        if (isEditMode.value) {
            loadAccommodationData()
            // If events are already loaded, set selected event immediately
            if (eventOptions.value.length > 0) {
                setSelectedEventFromData()
            }
        } else {
            resetForm()
        }
    }
})

// Load events when component mounts
onMounted(() => {
    loadEvents()
})
</script>
