<template>
    <UModal v-model:open="isOpen">
        <template #header>
            <h3 class="text-lg font-semibold text-gray-900">Delete Identification</h3>
        </template>

        <template #body>
            <div class="space-y-4">
                <p class="text-sm text-gray-600">
                    Are you sure you want to delete identification
                    "<strong>{{ card?.title || card?.templateFilename }}</strong>"?
                </p>
                <p class="text-xs text-gray-500">
                    This action cannot be undone.
                </p>
            </div>
        </template>

        <template #content>
            <DialogTitle class="sr-only">Delete Identification Confirmation</DialogTitle>
            <DialogDescription class="sr-only">
                Confirm deletion of identification template {{ card?.title || card?.templateFilename }}. This action cannot be undone.
            </DialogDescription>
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
import { DialogTitle, DialogDescription } from 'reka-ui'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    card: {
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

const confirm = () => emit('confirm')
const cancel = () => emit('cancel')
</script>

