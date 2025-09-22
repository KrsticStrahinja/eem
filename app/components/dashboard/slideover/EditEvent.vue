<template>
    <USlideover v-model:open="isOpen" side="right" title="Edit Event">
        <template #body>
            <div class="flex flex-col gap-y-8">
                <UInput v-model="eventName" placeholder="" :ui="{ base: 'peer' }" class="w-full">
                    <label
                        class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                        <span class="inline-flex bg-default px-1">Event name</span>
                    </label>
                </UInput>
                <UInput v-model="location" placeholder="" :ui="{ base: 'peer' }" class="w-full">
                    <label
                        class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                        <span class="inline-flex bg-default px-1">Location</span>
                    </label>
                </UInput>

                <UPopover>
                    <UButton color="neutral" variant="subtle" icon="i-lucide-calendar">
                        <template v-if="modelValue.start">
                            <template v-if="modelValue.end">
                                {{ formatCalendarDate(modelValue.start) }} - {{ formatCalendarDate(modelValue.end) }}
                            </template>
                            <template v-else>
                                {{ formatCalendarDate(modelValue.start) }}
                            </template>
                        </template>
                        <template v-else>
                            Pick a date
                        </template>
                    </UButton>

                    <template #content>
                        <UCalendar v-model="modelValue" class="p-2" :number-of-months="1" range />
                    </template>
                </UPopover>
            </div>

        </template>

        <template #footer>
            <div class="flex gap-2">
                <UButton color="neutral" variant="outline" @click="isOpen = false">
                    Cancel
                </UButton>
                <UButton color="primary" @click="handleUpdate" :loading="isLoading">
                    Update
                </UButton>
            </div>
        </template>
    </USlideover>
</template>

<script setup>
import { DateFormatter, getLocalTimeZone, CalendarDate } from '@internationalized/date'
import { useEvents } from '@/composables/database/useEvents'
import { shallowRef, onMounted, onUpdated } from 'vue'

    const props = defineProps({
        event: {
            type: Object,
            default: null
        }
    })

    const isOpen = defineModel('open')
    const emit = defineEmits(['refreshEvents'])

    const df = new DateFormatter('en-US', {
        dateStyle: 'medium'
    })

    // Local reactive refs for form inputs
    const eventName = ref('')
    const location = ref('')

    const modelValue = shallowRef({
        start: null,
        end: null
    })

    // Update form when event changes
    const updateFormFromEvent = () => {
        if (props.event) {
            eventName.value = props.event.name || ''
            location.value = props.event.location || ''

            const eventDate = props.event.date
            if (eventDate) {
                modelValue.value = {
                    start: convertToCalendarDate(eventDate.start),
                    end: convertToCalendarDate(eventDate.end)
                }
            } else {
                modelValue.value = { start: null, end: null }
            }
        }
    }

    const { updateEvent, isLoading, errorMessage } = useEvents()

    // Function to convert database date objects to CalendarDate objects
    const convertToCalendarDate = (dateObj) => {
        if (!dateObj || !dateObj.day || !dateObj.month || !dateObj.year) return null
        try {
            return new CalendarDate(dateObj.year, dateObj.month, dateObj.day)
        } catch (error) {
            console.warn('Error converting to CalendarDate:', error)
            return null
        }
    }

    // Function to format calendar date objects for display
    const formatCalendarDate = (calendarDate) => {
        if (!calendarDate) return ''
        try {
            // If it's already a CalendarDate object, use its toDate method
            if (calendarDate.toDate) {
                return df.format(calendarDate.toDate(getLocalTimeZone()))
            }
            // Fallback for plain objects
            const date = new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day)
            return df.format(date)
        } catch (error) {
            console.warn('Error formatting calendar date:', error)
            return `${calendarDate.day}/${calendarDate.month}/${calendarDate.year}`
        }
    }

    const handleUpdate = async () => {
        if (!props.event || !eventName.value?.trim() || !location.value?.trim()) return

        try {
            const updatedEvent = await updateEvent(props.event.id, {
                name: eventName.value.trim(),
                location: location.value.trim(),
                form: props.event.form || {},
                date: modelValue.value,
                attendees: props.event.attendees || []
            })
            emit('refreshEvents', updatedEvent)
            isOpen.value = false
        } catch (e) {
            console.error('Failed to update event', e)
        }
    }

    // Initialize form data when component is ready
    onMounted(() => {
        updateFormFromEvent()
    })

    // Update form when component updates (event prop changes)
    onUpdated(() => {
        updateFormFromEvent()
    })
</script>