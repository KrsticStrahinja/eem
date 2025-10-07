<template>
    <USlideover
        v-model:open="isOpen"
        side="right"
        title="Edit Identification"
        class="max-w-2xl"
    >
        <template #body>
            <div class="flex flex-col gap-y-6">
                <IdentificationTemplateForm
                    :event="event"
                    :form-fields="formFields"
                    :pdf-url="pdfPreviewUrl"
                    v-model:title="cardTitle"
                    v-model:fields="cardFields"
                    v-model:selectedConditionFieldId="selectedConditionFieldId"
                    v-model:selectedConditionValue="selectedConditionValue"
                    v-model:uploadedFile="uploadedFile"
                    @file-selected="handleFileSelected"
                />
            </div>
        </template>

        <template #footer>
            <div class="flex gap-2">
                <UButton color="neutral" variant="outline" @click="close">
                    Close
                </UButton>
                <UButton color="primary" @click="handleSave" :loading="isLoading">
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
    },
    cardId: {
        type: String,
        default: null
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

const existingCard = computed(() => {
    if (!props.event?.idcard || !props.cardId) return null
    const items = Array.isArray(props.event.idcard) ? props.event.idcard : []
    return items.find((card) => card.id === props.cardId) || null
})

watch(isOpen, (open) => {
    if (open && existingCard.value) {
        cardTitle.value = existingCard.value.title || ''
        cardFields.value = Array.isArray(existingCard.value.fields) && existingCard.value.fields.length
            ? existingCard.value.fields
            : [{ id: 1, type: 'name', position: { x: 100, y: 100 }, fontSize: 12 }]
        selectedConditionFieldId.value = existingCard.value.condition?.field_id ?? null
        selectedConditionValue.value = existingCard.value.condition?.value ?? null
        uploadedFile.value = existingCard.value.uploadedFile || null
        pdfPreviewUrl.value = existingCard.value.templateUrl || ''
        rawFile.value = null

        console.log('Editing identification card:', {
            title: cardTitle.value,
            templateUrl: pdfPreviewUrl.value,
            templateFilename: existingCard.value.templateFilename
        })
    }
})

const close = () => {
    isOpen.value = false
}

const handleFileSelected = (file) => {
    rawFile.value = file
}

const handleSave = async () => {
    if (!props.event?.id || !existingCard.value) return

    try {
        isLoading.value = true

        let templateUrl = existingCard.value.templateUrl || ''
        let templateFilename = existingCard.value.templateFilename || ''

        if (rawFile.value) {
            const formData = new FormData()
            formData.append('idcard', rawFile.value)

            const uploadResponse = await $fetch('/api/idcards/upload', {
                method: 'POST',
                body: formData
            })

            templateUrl = uploadResponse?.url || templateUrl
            templateFilename = uploadResponse?.filename || templateFilename
        }

        const updatedCard = {
            ...existingCard.value,
            title: cardTitle.value,
            fields: cardFields.value,
            templateUrl,
            templateFilename,
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
        const merged = existing.map((card) => (card.id === updatedCard.id ? updatedCard : card))
        await updateEventIdcards(props.event.id, merged)

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

