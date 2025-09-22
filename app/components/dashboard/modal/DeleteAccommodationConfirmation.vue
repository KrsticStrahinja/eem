<template>
    <UModal v-model:open="isOpen" title="Delete Accommodation">

        <template #body>
            <div class="space-y-4">
                <p class="text-sm text-gray-600">
                    Are you sure you want to delete accommodation "<strong>{{ accommodation?.name || accommodation?.data?.name || 'Unknown' }}</strong>"?
                </p>
                <p class="text-xs text-gray-500">
                    Room types: {{ accommodation?.rooms?.length || accommodation?.data?.rooms?.length || 0 }}
                </p>
                <div v-if="eventNames.length > 0" class="text-xs text-gray-500">
                    <p>Associated events:</p>
                    <ul class="ml-2 mt-1 space-y-1">
                        <li v-for="eventName in eventNames" :key="eventName" class="flex items-center">
                            <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            {{ eventName }}
                        </li>
                    </ul>
                </div>
                <div v-else class="text-xs text-gray-500">
                    Associated events: None
                </div>
                <p class="text-xs text-gray-500">
                    This action cannot be undone.
                </p>
            </div>
        </template>

        <template #footer>
            <div class="flex w-full justify-end gap-2">
                <UButton
                    variant="outline"
                    color="neutral"
                    @click="cancel"
                >
                    Cancel
                </UButton>
                <UButton
                    color="error"
                    @click="confirm"
                    :loading="isLoading"
                >
                    Delete
                </UButton>
            </div>
        </template>

    </UModal>
</template>

<script setup>
import { useEvents } from '@/composables/database/useEvents'

const { getEventById } = useEvents()

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    accommodation: {
        type: Object,
        default: null
    },
    isLoading: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

const confirm = () => {
    emit('confirm')
}

const cancel = () => {
    emit('cancel')
}

// Get event names from stored data
const eventNames = ref([])

const loadEventNames = () => {
    const events = props.accommodation?.event || props.accommodation?.data?.event || []
    if (!events.length) {
        eventNames.value = []
        return
    }

    // If events are stored as objects with name/id, use them directly
    if (typeof events[0] === 'object' && events[0].name) {
        eventNames.value = events.map(event => event.name)
    } else {
        // If events are stored as UUIDs, fetch names
        eventNames.value = events.map(() => 'Loading...')
        fetchEventNames(events)
    }
}

const fetchEventNames = async (eventIds) => {
    try {
        const names = []
        for (const eventId of eventIds) {
            try {
                const event = await getEventById(eventId)
                names.push(event?.name || 'Unknown Event')
            } catch (error) {
                names.push('Unknown Event')
            }
        }
        eventNames.value = names
    } catch (error) {
        eventNames.value = []
    }
}

// Watch for accommodation changes and load event names
watch(() => props.accommodation, (newAccommodation) => {
    if (newAccommodation && props.modelValue) {
        loadEventNames()
    }
}, { immediate: true })

// Also watch for modal open state
watch(() => props.modelValue, (isOpen) => {
    if (isOpen && props.accommodation) {
        loadEventNames()
    }
})
</script>
