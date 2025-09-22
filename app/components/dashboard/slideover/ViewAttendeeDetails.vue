<template>
    <USlideover v-model:open="isOpen" side="right" title="Attendee Details">
        <template #body>
            <div class="flex flex-col gap-y-8">
                <UInput
                    v-model="editedAttendee.first_name"
                    placeholder=""
                    :ui="{ base: 'peer' }"
                    class="w-full"
                    :disabled="!isEditMode"
                >
                    <label
                        class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                        <span class="inline-flex bg-default px-1">First Name</span>
                    </label>
                </UInput>

                <UInput
                    v-model="editedAttendee.last_name"
                    placeholder=""
                    :ui="{ base: 'peer' }"
                    class="w-full"
                    :disabled="!isEditMode"
                >
                    <label
                        class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                        <span class="inline-flex bg-default px-1">Last Name</span>
                    </label>
                </UInput>

                <UInput
                    v-model="editedAttendee.email"
                    placeholder=""
                    :ui="{ base: 'peer' }"
                    class="w-full"
                    :disabled="!isEditMode"
                >
                    <label
                        class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                        <span class="inline-flex bg-default px-1">Email</span>
                    </label>
                </UInput>

                <UInput
                    :model-value="formattedCreatedAt"
                    placeholder=""
                    :ui="{ base: 'peer' }"
                    class="w-full"
                    disabled
                >
                    <label
                        class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                        <span class="inline-flex bg-default px-1">Registration Date</span>
                    </label>
                </UInput>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Registered Events
                    </label>
                    <UInputMenu
                        v-if="isEditMode"
                        v-model="selectedEvents"
                        :items="availableEvents"
                        multiple
                        placeholder="Search and select events..."
                        class="w-full"
                    />
                    <div v-else class="flex flex-wrap gap-2">
                        <UBadge
                            v-for="event in displayEventNames"
                            :key="event.id"
                            :label="event.name"
                            variant="subtle"
                            color="primary"
                        />
                        <span v-if="!displayEventNames || displayEventNames.length === 0" class="text-gray-500 text-sm">
                            No events registered
                        </span>
                    </div>
                </div>

                <!-- Attended and Paid Status -->
                <div class="flex flex-col gap-8">
                    <div class="flex items-center gap-3">
                        <USwitch
                            v-model="editedAttendee.attended"
                            :disabled="!isEditMode"
                            label="Attended"
                            description="Has the attendee attended the event?"
                        />
                    </div>

                    <div class="flex items-center gap-3">
                        <USwitch
                            v-model="editedAttendee.paid"
                            :disabled="!isEditMode"
                            label="Paid"
                            description="Has the attendee paid for the event?"
                        />
                    </div>
                </div>

                <!-- Additional User Data -->
                <div v-if="attendee.data && Object.keys(attendee.data).length > 0">
                    <label class="block text-sm font-medium text-gray-700 mb-4">
                        Additional Information
                    </label>

                    <!-- Accommodation Warning -->
                    <UAlert
                        v-if="isEditMode"
                        icon="i-heroicons-exclamation-triangle"
                        color="secondary"
                        variant="subtle"
                        class="mb-6"
                        title="Accommodation Notice"
                        description="Everything related to accommodation should not be edited here but in the accommodation section."
                    >
                    </UAlert>

                    <div class="space-y-8">
                        <template v-for="(value, key) in editedAttendee.data" :key="key">
                            <!-- Special handling for accommodation_dates -->
                            <div v-if="key === 'accommodation_dates'" class="space-y-2">
                                <label class="block text-sm font-medium text-gray-700">
                                    {{ formatFieldName(key) }}
                                </label>
                                <div class="space-y-1">
                                    <div
                                        v-for="(dateObj, index) in value"
                                        :key="index"
                                        class="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-300"
                                    >
                                        <strong>Day {{ dateObj.day }}:</strong> {{ dateObj.formatted || new Date(dateObj.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
                                    </div>
                                </div>
                            </div>

                            <!-- Regular input fields for other data -->
                            <UInput
                                v-else
                                v-model="editedAttendee.data[key]"
                                placeholder=""
                                :ui="{ base: 'peer' }"
                                class="w-full"
                                :disabled="!isEditMode"
                            >
                                <label
                                    class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                    <span class="inline-flex bg-default px-1">{{ formatFieldName(key) }}</span>
                                </label>
                            </UInput>
                        </template>
                    </div>
                </div>


            </div>
        </template>

        <template #footer>
            <div class="flex gap-2">
                <UButton v-if="!isEditMode" color="primary" variant="solid" @click="toggleEditMode">
                    Edit
                </UButton>
                <UButton v-else color="primary" @click="handleSave" :loading="isSaving">
                    Save
                </UButton>
                <UButton v-if="isEditMode" color="neutral" variant="outline" @click="cancelEdit">
                    Cancel
                </UButton>
                <UButton color="neutral" variant="outline" @click="isOpen = false">
                    Close
                </UButton>
            </div>
        </template>
    </USlideover>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useEvents } from '@/composables/database/useEvents'
import { useBatchOperations } from '@/composables/database/useBatchOperations'

const props = defineProps({
    attendee: {
        type: Object,
        default: null
    },
    event: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['attendeeUpdated'])

const isOpen = defineModel('open')
const isEditMode = ref(false)
const isSaving = ref(false)

// Editable form data
const editedAttendee = ref({
    first_name: '',
    last_name: '',
    email: '',
    data: {},
    attended: false,
    paid: false
})

// Events management
const selectedEvents = ref([])
const availableEvents = ref([])
const allEvents = ref([])

// Update local data when attendee prop changes
watch(() => props.attendee, (newAttendee, oldAttendee) => {
    if (newAttendee && (!oldAttendee || newAttendee.id !== oldAttendee.id || isEditMode.value === false)) {
        // Only update data if it's a different attendee or we're not in edit mode
        editedAttendee.value = {
            first_name: newAttendee.first_name || '',
            last_name: newAttendee.last_name || '',
            email: newAttendee.email || '',
            data: { ...newAttendee.data } || {},
            attended: props.event?.attended?.includes(newAttendee.id) || false,
            paid: props.event?.paid?.includes(newAttendee.id) || false
        }
        // Initialize selected events as objects with label and value
        if (newAttendee.events && newAttendee.events.length > 0) {
            selectedEvents.value = newAttendee.events.map(eventId => ({
                label: getEventName(eventId),
                value: eventId
            }))
        } else {
            selectedEvents.value = []
        }
    }
}, { immediate: true })

// Also watch for event changes to update attended/paid status
watch(() => props.event, (newEvent) => {
    if (newEvent && props.attendee && isEditMode.value === false) {
        // Update attended/paid status when event data changes (but only when not in edit mode)
        editedAttendee.value.attended = newEvent.attended?.includes(props.attendee.id) || false
        editedAttendee.value.paid = newEvent.paid?.includes(props.attendee.id) || false
    }
}, { immediate: true })

const { updateAttendee: updateAttendeeInDb, updateAttendeeEvents, getAllEventsForAutocomplete, updateEventAttendees, updateEventAttended, updateEventPaid } = useEvents()
const { batchUpdateAccommodationReservations } = useBatchOperations()

const formattedCreatedAt = computed(() => {
    if (!props.attendee?.created_at) return ''
    return new Date(props.attendee.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
})

// Computed property for displaying event names with proper fallbacks
const displayEventNames = computed(() => {
    if (!props.attendee?.events || props.attendee.events.length === 0) return []
    return props.attendee.events.map(eventId => ({
        name: getEventName(eventId),
        id: eventId
    }))
})

const formatFieldName = (key) => {
    // Convert snake_case or camelCase to Title Case
    return key
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, l => l.toUpperCase())
}

const formatFieldValue = (value) => {
    if (Array.isArray(value)) {
        return value.join(', ')
    }
    if (value === null || value === undefined) {
        return ''
    }
    return String(value)
}

// Fetch all events for autocomplete
const fetchAllEvents = async () => {
    try {
        const events = await getAllEventsForAutocomplete()
        allEvents.value = events

        // Create options for UInputTags with label and value
        availableEvents.value = events.map(event => ({
            label: event.name,
            value: event.id
        }))

    } catch (error) {
        console.error('Error fetching events:', error)
    }
}

// Get event name by ID
const getEventName = (eventId) => {
    if (!eventId) return 'Unknown Event'
    const event = allEvents.value.find(e => e.id === eventId)
    return event ? event.name : `Event ${eventId}`
}

// Edit mode functions
const toggleEditMode = async () => {
    isEditMode.value = !isEditMode.value

    // Fetch events when entering edit mode
    if (isEditMode.value) {
        await fetchAllEvents()
    }
}

const cancelEdit = () => {
    // Reset edited data to original values
    if (props.attendee) {
        editedAttendee.value = {
            first_name: props.attendee.first_name || '',
            last_name: props.attendee.last_name || '',
            email: props.attendee.email || '',
            data: { ...props.attendee.data } || {},
            attended: props.event?.attended?.includes(props.attendee.id) || false,
            paid: props.event?.paid?.includes(props.attendee.id) || false
        }
        // Reset selected events as objects
        if (props.attendee.events && props.attendee.events.length > 0) {
            selectedEvents.value = props.attendee.events.map(eventId => ({
                label: getEventName(eventId),
                value: eventId
            }))
        } else {
            selectedEvents.value = []
        }
    }
    isEditMode.value = false
}

const handleSave = async () => {
    if (!props.attendee?.id) return

    isSaving.value = true
    try {
        const originalEvents = props.attendee.events || []
        const newEvents = selectedEvents.value.map(event => event.value) || [] // Extract IDs from objects

        // Find events to add and remove
        const eventsToAdd = newEvents.filter(eventId => !originalEvents.includes(eventId))
        const eventsToRemove = originalEvents.filter(eventId => !newEvents.includes(eventId))

        // Update attendee basic information (name, email, data) separately from events
        const updateData = {
            first_name: editedAttendee.value.first_name,
            last_name: editedAttendee.value.last_name,
            email: editedAttendee.value.email,
            data: editedAttendee.value.data
        }

        // Update attendee data first
        const updatedAttendee = await updateAttendeeInDb(props.attendee.id, updateData)

        // Update attendee's events array separately
        if (newEvents.length !== originalEvents.length || !newEvents.every(id => originalEvents.includes(id))) {
            await updateAttendeeEvents(props.attendee.id, newEvents)
        }

        // Update events attendees arrays
        const updatePromises = []

        // Add attendee to new events
        for (const eventId of eventsToAdd) {
            updatePromises.push(updateEventAttendeesForEvent(eventId, props.attendee.id, 'add'))
        }

        // Remove attendee from removed events
        for (const eventId of eventsToRemove) {
            updatePromises.push(updateEventAttendeesForEvent(eventId, props.attendee.id, 'remove'))
        }

        // Wait for all event updates to complete
        if (updatePromises.length > 0) {
            await Promise.all(updatePromises)
        }

        // Update attended and paid status for current event
        if (props.event?.id) {
            const currentAttended = props.event.attended || []
            const currentPaid = props.event.paid || []
            const attendeeId = props.attendee.id
            const newAttendedStatus = editedAttendee.value.attended
            const newPaidStatus = editedAttendee.value.paid

            // Update attended list
            let newAttendedList = [...currentAttended]
            if (newAttendedStatus && !currentAttended.includes(attendeeId)) {
                newAttendedList.push(attendeeId)
            } else if (!newAttendedStatus && currentAttended.includes(attendeeId)) {
                newAttendedList = newAttendedList.filter(id => id !== attendeeId)
            }

            // Update paid list
            let newPaidList = [...currentPaid]
            if (newPaidStatus && !currentPaid.includes(attendeeId)) {
                newPaidList.push(attendeeId)
            } else if (!newPaidStatus && currentPaid.includes(attendeeId)) {
                newPaidList = newPaidList.filter(id => id !== attendeeId)
            }

            // Update attended list if changed
            if (newAttendedList.length !== currentAttended.length || !newAttendedList.every(id => currentAttended.includes(id))) {
                await updateEventAttended(props.event.id, newAttendedList)
            }

            // Update paid list if changed
            if (newPaidList.length !== currentPaid.length || !newPaidList.every(id => currentPaid.includes(id))) {
                await updateEventPaid(props.event.id, newPaidList)
            }
        }

        // Emit event to parent component to refresh data
        emit('attendeeUpdated', {
            attendee: { ...updatedAttendee, events: newEvents },
            attended: editedAttendee.value.attended,
            paid: editedAttendee.value.paid
        })

        isEditMode.value = false

        // Show success message
        const toast = useToast()
        toast.add({
            title: 'Attendee Updated!',
            description: 'Attendee information and event registrations have been updated successfully.',
            icon: 'i-heroicons-check-circle',
            color: 'success',
            timeout: 3000
        })

    } catch (error) {
        console.error('Error updating attendee:', error)

        // Show error message
        const toast = useToast()
        toast.add({
            title: 'Update Failed!',
            description: 'Failed to update attendee information. Please try again.',
            icon: 'i-heroicons-exclamation-triangle',
            color: 'error',
            timeout: 5000
        })
    } finally {
        isSaving.value = false
    }
}

// Helper function to update event attendees
const updateEventAttendeesForEvent = async (eventId, attendeeId, action) => {
    try {
        // First, get current event data
        const { getEventById } = useEvents()
        const event = await getEventById(eventId)

        if (!event) {
            throw new Error(`Event with ID ${eventId} not found`)
        }

        const currentAttendees = Array.isArray(event.attendees) ? event.attendees : []
        let newAttendees

        if (action === 'add') {
            // Only add if not already in the array
            if (!currentAttendees.includes(attendeeId)) {
                newAttendees = [...currentAttendees, attendeeId]
            } else {
                return // No need to update
            }
        } else if (action === 'remove') {
            // Only remove if attendee is in the array
            if (currentAttendees.includes(attendeeId)) {
                newAttendees = currentAttendees.filter(id => id !== attendeeId)
            } else {
                return // No need to update
            }
        } else {
            throw new Error(`Invalid action: ${action}. Must be 'add' or 'remove'`)
        }

        // Update the event only if attendees array changed
        if (newAttendees && newAttendees.length !== currentAttendees.length) {
            await updateEventAttendees(eventId, newAttendees)
        }
    } catch (error) {
        console.error(`Error updating event ${eventId} for attendee ${attendeeId} (${action}):`, error)
        throw new Error(`Failed to ${action} attendee from event: ${error.message}`)
    }
}

// Initialize component
onMounted(() => {
    fetchAllEvents()
})
</script>
