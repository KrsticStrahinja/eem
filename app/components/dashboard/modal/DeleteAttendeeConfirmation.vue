<template>
    <UModal v-model:open="isOpen">
        <template #header>
            <h3 class="text-lg font-semibold text-gray-900">Delete Attendee</h3>
        </template>

        <template #body>
            <div class="space-y-4">
                <p class="text-sm text-gray-600">
                    Are you sure you want to delete attendee "<strong>{{ attendee?.first_name }} {{ attendee?.last_name }}</strong>"?
                </p>
                <p class="text-xs text-gray-500">
                    Email: {{ attendee?.email }}
                </p>
                <p class="text-xs text-gray-500">
                    Registered for: {{ attendee?.events?.length || 0 }} event{{ (attendee?.events?.length || 0) !== 1 ? 's' : '' }}
                </p>
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
const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    attendee: {
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
</script>
