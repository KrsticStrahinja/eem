<template>
    <USlideover
        v-model:open="isOpen"
        side="right"
        title="Create Identification"
        class="max-w-2xl"
    >
        <template #body>
            <div class="flex flex-col gap-y-6">
                <IdentificationTemplateForm
                    :event="event"
                    :form-fields="formFields"
                    v-model:title="cardTitle"
                    v-model:fields="cardFields"
                    v-model:selectedConditionFieldId="selectedConditionFieldId"
                    v-model:selectedConditionValue="selectedConditionValue"
                    v-model:uploadedFile="uploadedFile"
                    v-model:pdfUrl="pdfPreviewUrl"
                    @file-selected="handleFileSelected"
                />
            </div>
        </template>

        <template #footer>
            <div class="flex gap-2">
                <UButton color="neutral" variant="outline" @click="close">
                    Close
                </UButton>
                <UButton color="primary" @click="handleSave" :loading="isLoading" :disabled="!rawFile">
                    Save Identification
                </UButton>
            </div>
        </template>
    </USlideover>
</template>

<script setup>
import IdentificationTemplateForm from '@/components/dashboard/slideover/IdentificationTemplateForm.vue'
import { useEvents } from '@/composables/database/useEvents'

const props = defineProps({
    event: {
        type: Object,
        default: null
    },
    formFields: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['refresh-event', 'saved'])

const isOpen = defineModel('open', { default: false })

const { updateEventIdcards } = useEvents()
const toast = useToast()

const cardTitle = ref('')
const cardFields = ref([
    { id: 1, type: 'name', position: { x: 100, y: 100 }, fontSize: 12 }
])
const selectedConditionFieldId = ref(null)
const selectedConditionValue = ref(null)
const uploadedFile = ref(null)
const pdfPreviewUrl = ref('')
const rawFile = ref(null)
const isLoading = ref(false)

const resetState = () => {
    cardTitle.value = ''
    cardFields.value = [
        { id: 1, type: 'name', position: { x: 100, y: 100 }, fontSize: 12 }
    ]
    selectedConditionFieldId.value = null
    selectedConditionValue.value = null
    uploadedFile.value = null
    pdfPreviewUrl.value = ''
    rawFile.value = null
}

watch(isOpen, (open) => {
    if (open) {
        resetState()
    }
})

const close = () => {
    isOpen.value = false
}

const handleFileSelected = (file) => {
    rawFile.value = file
}

const handleSave = async () => {
    if (!props.event?.id || !rawFile.value) return

    try {
        isLoading.value = true

        const formData = new FormData()
        formData.append('idcard', rawFile.value)

        const uploadResponse = await $fetch('/api/idcards/upload', {
            method: 'POST',
            body: formData
        })

        const newCard = {
            id: crypto.randomUUID(),
            title: cardTitle.value,
            fields: cardFields.value,
            templateUrl: uploadResponse?.url || '',
            templateFilename: uploadResponse?.filename || '',
            condition: selectedConditionFieldId.value && selectedConditionValue.value ? (() => {
                const form = Array.isArray(props.formFields) ? props.formFields : props.event?.form
                const field = form?.find((item) => item.id === selectedConditionFieldId.value)
                return {
                    field_id: selectedConditionFieldId.value,
                    field_name: field?.name || null,
                    value: selectedConditionValue.value
                }
            })() : null
        }

        const existing = Array.isArray(props.event?.idcard) ? props.event.idcard : []
        await updateEventIdcards(props.event.id, [...existing, newCard])

        emit('saved')
        emit('refresh-event')
        close()
    } catch (error) {
        console.error('Failed to save identification card:', error)
        toast.add({
            title: 'Error',
            description: 'Failed to save identification card.',
            color: 'error',
            icon: 'i-lucide-x'
        })
    } finally {
        isLoading.value = false
    }
}
</script>

