<template>
    <USlideover v-model:open="isOpen" side="right" title="Create Event">
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
                                {{ df.format(modelValue.start.toDate(getLocalTimeZone())) }} - {{
                                    df.format(modelValue.end.toDate(getLocalTimeZone())) }}
                            </template>

                            <template v-else>
                                {{ df.format(modelValue.start.toDate(getLocalTimeZone())) }}
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
                <UButton color="primary" @click="handleCreate" :loading="isLoading">
                    Create
                </UButton>
            </div>
        </template>
    </USlideover>
</template>

<script setup>
    import { DateFormatter, getLocalTimeZone } from '@internationalized/date'
    import { useEvents } from '@/composables/database/useEvents'

    const isOpen = defineModel('open')
    const emit = defineEmits(['refreshEvents'])

    const eventName = ref('')
    const location = ref('')

    const df = new DateFormatter('en-US', {
        dateStyle: 'medium'
    })

    const modelValue = shallowRef({
        start: null,
        end: null
    })

    const { createEvent, isLoading, errorMessage } = useEvents()

    const handleCreate = async () => {
        if (!eventName.value?.trim() || !location.value?.trim()) return

        try {
            const newEvent = await createEvent({
                name: eventName.value.trim(),
                location: location.value.trim(),
                form: {},
                date: modelValue.value,
                attendees: []
            })
            emit('refreshEvents', newEvent)
            isOpen.value = false
            eventName.value = ''
            location.value = ''
            modelValue.value = { start: null, end: null }
        } catch (e) {
            console.error('Failed to create event', e)
        }
    }
</script>
