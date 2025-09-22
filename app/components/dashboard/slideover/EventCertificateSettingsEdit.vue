<template>
    <USlideover v-model:open="isOpen" side="right" title="Edit Certificate Settings" class="max-w-2xl">
        <template #body>
            <div class="flex flex-col gap-y-6">
                <CertificateTemplateForm
                    :event="event"
                    :pdf-url="pdfObjectUrl"
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
                <UButton color="primary" @click="handleSave" :loading="isLoading">
                    Save Certificate
                </UButton>
            </div>
        </template>
    </USlideover>
</template>

<script setup>

import { useCertificates } from '@/composables/database/useCertificates'
import CertificateTemplateForm from '@/components/dashboard/slideover/CertificateTemplateForm.vue'

const { getById, updateById } = useCertificates()

const props = defineProps({
    event: {
        type: Object,
        default: null
    },
    certificateId: {
        type: [Number, String],
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
const uploadedFileObject = ref(null)
const pdfObjectUrl = ref('')

// Condition state (based on event.form select fields)
const selectedConditionFieldId = ref(null)
const selectedConditionValue = ref(null)

// Clean up on unmount
onBeforeUnmount(() => {
    if (pdfObjectUrl.value && pdfObjectUrl.value.startsWith('blob:')) URL.revokeObjectURL(pdfObjectUrl.value)
})

const handleSave = async () => {
    isLoading.value = true
    
    try {
        if (!props.certificateId) throw new Error('Missing certificateId')
        // Load existing data to preserve previous values
        const existingResp = await getById(props.certificateId)
        const existing = existingResp?.data || null

        let uploadedUrl = ''
        let uploadedFilename = ''

        // Only upload and replace URL/filename if a new file is provided
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
        
        // Merge with existing, preserving certificateUrl/certificateFilename when no new upload
        const mergedPayload = {
            ...(existing || {}),
            eventId: props.event?.id,
            title: certificateTitle.value,
            fields: certificateFields.value,
            // Keep legacy format for backward compatibility
            name: certificateFields.value.find(f => f.type === 'name') ? {
                position: certificateFields.value.find(f => f.type === 'name').position,
                fontSize: certificateFields.value.find(f => f.type === 'name').fontSize
            } : { position: { x: 100, y: 100 }, fontSize: 12 },
            licence: certificateFields.value.find(f => f.type === 'licence') ? {
                position: certificateFields.value.find(f => f.type === 'licence').position,
                fontSize: certificateFields.value.find(f => f.type === 'licence').fontSize
            } : { position: { x: 200, y: 200 }, fontSize: 12 },
            uploadedFile: uploadedFile.value ?? existing?.uploadedFile ?? null,
            certificateUrl: uploadedUrl || existing?.certificateUrl || '',
            certificateFilename: uploadedFilename || existing?.certificateFilename || '',
            condition: (selectedConditionFieldId.value && selectedConditionValue.value)
                ? (() => {
                    const form = props.event?.form
                    const field = Array.isArray(form) ? form.find((f) => f.id === selectedConditionFieldId.value) : null
                    return {
                        field_id: selectedConditionFieldId.value,
                        field_name: field?.name || null,
                        value: selectedConditionValue.value
                    }
                })()
                : (existing?.condition ?? null)
        }

        await updateById(props.certificateId, mergedPayload)

        emit('refreshEvents')
        isOpen.value = false
    } catch (error) {
        console.error('Failed to save certificate:', error)
    } finally {
        isLoading.value = false
    }
}

// Reset and load by certificate id when modal opens
watch(isOpen, (newValue) => {
    if (newValue && props.certificateId) {
        getById(props.certificateId)
            .then((res) => {
                const existing = res?.data
                if (existing) {
                    certificateTitle.value = existing.title || ''
                    
                    // Load fields from new format or fallback to legacy format
                    if (existing.fields && Array.isArray(existing.fields)) {
                        certificateFields.value = existing.fields
                    } else {
                        // Convert legacy format to new format
                        const legacyFields = []
                        
                        // Add name field if it exists
                        if (existing.name?.position) {
                            legacyFields.push({
                                id: 1,
                                type: 'name',
                                position: { x: existing.name.position.x ?? 100, y: existing.name.position.y ?? 100 },
                                fontSize: existing.name.fontSize ?? 12
                            })
                        }
                        
                        // Add licence field if it exists (only if it was configured)
                        if (existing.licence?.position) {
                            legacyFields.push({
                                id: 2,
                                type: 'licence',
                                position: { x: existing.licence.position.x ?? 200, y: existing.licence.position.y ?? 200 },
                                fontSize: existing.licence.fontSize ?? 12
                            })
                        }
                        
                        // If no fields, add default name field
                        certificateFields.value = legacyFields.length > 0 ? legacyFields : [
                            { id: 1, type: 'name', position: { x: 100, y: 100 }, fontSize: 12 }
                        ]
                    }

                    uploadedFile.value = existing.uploadedFile || null
                    if (existing.certificateUrl) {
                        pdfObjectUrl.value = existing.certificateUrl
                    }
                    // Load condition
                    if (existing.condition) {
                        selectedConditionFieldId.value = existing.condition.field_id ?? null
                        selectedConditionValue.value = existing.condition.value ?? null
                    } else {
                        selectedConditionFieldId.value = null
                        selectedConditionValue.value = null
                    }
                } else {
                    certificateTitle.value = ''
                    certificateFields.value = [
                        { id: 1, type: 'name', position: { x: 100, y: 100 }, fontSize: 12 }
                    ]
                    uploadedFile.value = null
                    uploadedFileObject.value = null
                    if (pdfObjectUrl.value) {
                        URL.revokeObjectURL(pdfObjectUrl.value)
                        pdfObjectUrl.value = ''
                    }
                    selectedConditionFieldId.value = null
                    selectedConditionValue.value = null
                }
            })
    }
})
</script>