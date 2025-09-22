<template>
    <USlideover v-model:open="isOpen" side="right" title="Edit Registration Form" description="Registration form for the event" class="w-full max-w-3xl">
        <template #body>
            <DashboardRegistrationFormBuilder ref="formBuilderRef" :event="event" @refreshEvents="handleRefreshEvents" />
        </template>

        <template #footer>
            <div class="flex gap-2">
                <UButton color="neutral" variant="outline" @click="isOpen = false">
                    Cancel
                </UButton>
                <UButton color="primary" @click="handleSave">
                    Save
                </UButton>
            </div>
        </template>
    </USlideover>
</template>

<script setup>
    const props = defineProps({
        event: {
            type: Object,
            default: null
        }
    })

    const isOpen = defineModel('open')
    const emit = defineEmits(['refreshEvents', 'saveForm'])

    const formBuilderRef = ref(null)

    const handleSave = () => {
        if (formBuilderRef.value) {
            formBuilderRef.value.handleFormSave()
        }
        emit('saveForm')
    }

    const handleRefreshEvents = () => {
        emit('refreshEvents')
    }
</script>
