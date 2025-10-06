<template>
    <div class="w-full">
        <UDashboardNavbar title="Scan" class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
            <template #leading>
                <UDashboardSidebarCollapse />
            </template>
        </UDashboardNavbar>

        <div class="max-w-4xl mx-auto p-6 space-y-6">
            <UCard class="shadow-sm">
                <template #header>
                    <h3 class="text-lg font-semibold">Scaner configuration</h3>
                    <p class="text-sm text-gray-600">Configure the scanner for the event</p>
                </template>

                <USelect
                    v-model="selectedEvent"
                    :items="eventOptions"
                    placeholder="Choose an event..."
                    :loading="isLoading"
                    option-attribute="label"
                    value-attribute="value"
                    searchable
                    clear-search-on-close
                    class="w-full"
                />

                <div class="flex justify-start mt-4">
                    <UButton
                        @click="openIdentificationSettings"
                        color="primary"
                        variant="outline"
                        icon="i-lucide-settings"
                        :disabled="!selectedEvent"
                    >
                        Configure Identification
                    </UButton>
                </div>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <UButton @click="saveSettings" color="primary" :loading="loading">
                            Save Configuration
                        </UButton>
                    </div>
                </template>
            </UCard>

            <DashboardSlideoverIdentificationSettings
                v-model:open="isSlideoverOpen"
                :event="currentEvent"
                :form-fields="currentEventFields"
                :loading="isEventDetailsLoading"
                @refresh-event="handleEventRefresh"
            />
        </div>
    </div>
</template>

<script setup>
import DashboardSlideoverIdentificationSettings from '@/components/dashboard/slideover/IdentificationSettings.vue'
import { useEvents } from '@/composables/database/useEvents'
import { useSettings } from '@/composables/database/useSettings'

// Meta
definePageMeta({
    layout: 'default'
})

// Composables
const { getAllEventsForAutocomplete, getEventById, isLoading } = useEvents()
const { fetchSettings, updateRegistrationSettings } = useSettings()

// Reactive state
const selectedEvent = ref('')
const events = ref([])
const loading = ref(false)
const isSlideoverOpen = ref(false)
const isEventRefreshing = ref(false)
const currentEvent = ref(null)
const isEventDetailsLoading = ref(false)

const currentEventFields = computed(() => {
    if (!currentEvent.value?.form) return []
    return Array.isArray(currentEvent.value.form) ? currentEvent.value.form : []
})

const openIdentificationSettings = () => {
    if (!selectedEvent.value) {
        toast.add({
            title: 'No event selected',
            description: 'Please choose an event before configuring identification.',
            color: 'warning'
        })
        return
    }
    preloadEventDetails()
}

const preloadEventDetails = async () => {
    if (!selectedEvent.value) return
    if (currentEvent.value && currentEvent.value.id === selectedEvent.value) {
        isSlideoverOpen.value = true
        return
    }

    try {
        isEventDetailsLoading.value = true
        const eventDetails = await getEventById(selectedEvent.value, true)
        if (!eventDetails) return

        currentEvent.value = eventDetails

        events.value = events.value.map(eventItem =>
            eventItem.id === eventDetails.id ? { ...eventItem, ...eventDetails } : eventItem
        )

        isSlideoverOpen.value = true
    } catch (error) {
        console.error('Failed to load event details:', error)
        toast.add({
            title: 'Error',
            description: 'Failed to load event details for identification.',
            color: 'error'
        })
    } finally {
        isEventDetailsLoading.value = false
    }
}

const handleEventRefresh = async () => {
    if (!selectedEvent.value) return
    try {
        isEventRefreshing.value = true
        const refreshed = await getEventById(selectedEvent.value, true)
        if (!refreshed) return

        currentEvent.value = refreshed

        events.value = events.value.map(eventItem =>
            eventItem.id === refreshed.id ? { ...eventItem, ...refreshed } : eventItem
        )
    } catch (error) {
        console.error('Failed to refresh event:', error)
        toast.add({
            title: 'Error',
            description: 'Failed to refresh event after saving identification.',
            color: 'error'
        })
    } finally {
        isEventRefreshing.value = false
    }
}

// Toast notifications
const toast = useToast()

// Computed
const eventOptions = computed(() => {
    return events.value.map(event => ({
        label: event.name,
        value: event.id
    }))
})

// Methods
const saveSettings = async () => {
    if (!selectedEvent.value) {
        toast.add({
            title: 'No event selected',
            description: 'Please select an event before saving.',
            color: 'warning',
            icon: 'i-lucide-alert-triangle'
        })
        return
    }

    try {
        loading.value = true

        const registrationData = {
            event_id: selectedEvent.value,
            background: '',
            print: ''
        }

        await updateRegistrationSettings(registrationData)

        toast.add({
            title: 'Settings saved!',
            description: 'Scanner configuration has been saved.',
            color: 'success',
            icon: 'i-lucide-check'
        })
    } catch (error) {
        console.error('Error saving settings:', error)
        toast.add({
            title: 'Error',
            description: 'Failed to save settings.',
            color: 'error',
            icon: 'i-lucide-x'
        })
    } finally {
        loading.value = false
    }
}


// Load events and current settings on mount
onMounted(async () => {
    try {
        const fetchedEvents = await getAllEventsForAutocomplete()
        events.value = Array.isArray(fetchedEvents) ? fetchedEvents : []

        const settings = await fetchSettings()
        if (settings?.registration?.event_id) {
            selectedEvent.value = settings.registration.event_id
            await preloadEventDetails()
        }
    } catch (error) {
        console.error('Error loading data:', error)
        toast.add({
            title: 'Error',
            description: 'Failed to load data.',
            color: 'error'
        })
    }
})
</script>
