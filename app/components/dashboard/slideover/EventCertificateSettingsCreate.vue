<template>
    <USlideover v-model:open="isOpen" side="right" title="Create Certificate" class="max-w-2xl">
        <template #body>
            <div class="flex flex-col gap-y-6">
                <CertificateTemplateForm
                    :event="event"
                    v-model:title="certificateTitle"
                    v-model:fields="certificateFields"
                    v-model:selectedConditionFieldId="selectedConditionFieldId"
                    v-model:selectedConditionValue="selectedConditionValue"
                    v-model:uploadedFile="uploadedFile"
                    @file-selected="(f) => (uploadedFileObject = f)"
                />
            </div>
        </template>

        <template #footer>
            <div class="flex gap-2">
                <UButton color="neutral" variant="outline" @click="isOpen = false">
                    Close
                </UButton>
                <UButton color="primary" @click="handleSave" :loading="isLoading" :disabled="!uploadedFileObject">
                    Save Certificate
                </UButton>
            </div>
        </template>
    </USlideover>
</template>

<script setup>

import { useCertificates } from '@/composables/database/useCertificates'
import CertificateTemplateForm from '@/components/dashboard/slideover/CertificateTemplateForm.vue'

const { createForEvent } = useCertificates()

const props = defineProps({
    event: {
        type: Object,
        default: null
    }
})

const isOpen = defineModel('open')
const emit = defineEmits(['refreshEvents'])

const isLoading = ref(false)
const uploadedFile = ref(null)
const certificateTitle = ref('')
const certificateFields = ref([
    { id: 1, type: 'name', position: { x: 100, y: 100 }, fontSize: 12 }
])
const selectedConditionFieldId = ref(null)
const selectedConditionValue = ref(null)
const uploadedFileObject = ref(null)

const handleSave = async () => {
    isLoading.value = true
    
    try {
        let uploadedUrl = ''
        let uploadedFilename = ''

        if (uploadedFileObject.value) {
            const formData = new FormData()
            formData.append('certificate', uploadedFileObject.value)

            const res = await $fetch('/api/certificates/upload', {
                method: 'POST',
                body: formData
            })

            uploadedUrl = res?.url || ''
            uploadedFilename = res?.filename || ''
        }
        
        const certificatePayload = {
            eventId: props.event?.id,
            title: certificateTitle.value,
            fields: certificateFields.value,
            uploadedFile: uploadedFile.value,
            certificateUrl: uploadedUrl,
            certificateFilename: uploadedFilename,
            condition: selectedConditionFieldId.value && selectedConditionValue.value
                ? (() => {
                    const form = props.event?.form
                    const field = Array.isArray(form) ? form.find((f) => f.id === selectedConditionFieldId.value) : null
                    return {
                        field_id: selectedConditionFieldId.value,
                        field_name: field?.name || null,
                        value: selectedConditionValue.value
                    }
                })()
                : null
        }

        await createForEvent(props.event?.id, certificatePayload)

        emit('refreshEvents')
        isOpen.value = false
    } catch (error) {
        console.error('Failed to save certificate:', error)
    } finally {
        isLoading.value = false
    }
}

// Ensure pristine state on open (no DB checks here; parent guards existence)
watch(isOpen, (newValue) => {
    if (newValue && props.event) {
        certificateTitle.value = ''
        uploadedFile.value = null
        if (uploadedFileObject.value) uploadedFileObject.value = null
        certificateFields.value = [
            { id: 1, type: 'name', position: { x: 100, y: 100 }, fontSize: 12 }
        ]
        selectedConditionFieldId.value = null
        selectedConditionValue.value = null
    }
})
</script>