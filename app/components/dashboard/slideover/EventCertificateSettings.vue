<template>
    <USlideover v-model:open="isOpen" side="right" :title="`${props.event?.name} Certificates `" class="max-w-2xl">
        <template #body>
            <div class="flex flex-col gap-y-6">

                <div v-if="isCertificatesLoading" class="flex items-center justify-center py-12">
                    <div class="flex items-center gap-2 text-gray-500">
                        <UIcon name="i-lucide-loader-2" class="h-5 w-5 animate-spin" />
                        <span>Loading certificates...</span>
                    </div>
                </div>

                <div v-else-if="!isCertificatesLoading">
                    <div v-if="certificates.length === 0" class="py-4">
                        <p class="text-sm text-gray-500">No certificates yet for this event.</p>
                    </div>

                    <div v-else class="grid grid-cols-1 gap-4">
                        <UCard v-for="cert in certificates" :key="cert.id" class="shadow-sm">
                            <template #header>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <UIcon name="i-lucide-award" class="h-4 w-4 text-primary" />
                                        <p class="font-medium">{{ cert.data?.title || 'Untitled certificate' }}</p>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <UButton size="xs" color="primary" variant="solid" icon="i-lucide-pencil"
                                            @click="openEdit(cert)">Edit</UButton>
                                        <UTooltip text="Generate preview using sample attendee">
                                            <UButton
                                                size="xs"
                                                color="neutral"
                                                variant="outline"
                                                icon="i-lucide-printer"
                                                :loading="isTestGenerating"
                                                @click="handleTestPrint(cert)"
                                            >
                                                Test
                                            </UButton>
                                        </UTooltip>
                                        <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2"
                                            @click="openDelete(cert)">Delete</UButton>
                                    </div>
                                </div>
                            </template>
                            <div class="flex items-start justify-between text-sm text-gray-500">
                                <div class="flex flex-col gap-2">
                                    <div class="flex flex-wrap items-center gap-2"
                                        v-if="cert.data?.condition || (Array.isArray(cert.data?.conditions) && cert.data.conditions.length)">
                                        <span class="text-sm text-gray-500">Conditions:</span>
                                        <template
                                            v-if="Array.isArray(cert.data?.conditions) && cert.data.conditions.length">
                                            <UBadge v-for="(c, idx) in cert.data.conditions" :key="idx" variant="soft"
                                                color="secondary">
                                                {{ c.field_name || c.field_id }} = {{ c.value }}
                                            </UBadge>
                                        </template>
                                        <template v-else>
                                            <UBadge variant="soft" color="secondary">
                                                {{ cert.data.condition.field_name || cert.data.condition.field_id }} =
                                                {{ cert.data.condition.value }}
                                            </UBadge>
                                        </template>
                                    </div>
                                    <div v-if="cert.data?.uploadedFile?.name">
                                        File: {{ cert.data.uploadedFile.name }}
                                    </div>
                                </div>
                            </div>
                        </UCard>
                    </div>
                </div>

                <div class="flex items-center justify-between">
                    <UButton color="primary" icon="i-lucide-plus" @click="openCreate">
                        New certificate
                    </UButton>
                </div>

                <!-- Create / Edit Slideover -->
                <EventCertificateSettingsCreate v-model:open="isCreateOpen" :event="props.event"
                    @refresh-events="fetchCertificates" />
                <EventCertificateSettingsEdit v-model:open="isEditOpen" :event="props.event"
                    :certificate-id="certToEditId" @refresh-events="fetchCertificates" />

            </div>
        </template>

        <template #footer>
            <div class="flex gap-2">
                <UButton color="neutral" variant="outline" @click="isOpen = false">
                    Close
                </UButton>
            </div>
        </template>
    </USlideover>
</template>

<script setup>
import EventCertificateSettingsEdit from '@/components/dashboard/slideover/EventCertificateSettingsEdit.vue'
import EventCertificateSettingsCreate from '@/components/dashboard/slideover/EventCertificateSettingsCreate.vue'
import { useCertificates } from '@/composables/database/useCertificates'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const { fetchAllByEventId, removeById, isLoading: isCertificatesLoading } = useCertificates()

const props = defineProps({
    event: {
        type: Object,
        default: null
    }
})

const isOpen = defineModel('open')
const emit = defineEmits(['refreshEvents', 'openDeleteModal'])

const certificates = ref([])
const isEditOpen = ref(false)
const isCreateOpen = ref(false)
const certToEditId = ref(null)
const isTestGenerating = ref(false)
const TEST_UUID = 'sample-uuid-1234-5678'

const openDelete = (cert) => {
    emit('openDeleteModal', cert)
}


const openEdit = (cert) => {
    certToEditId.value = cert?.id || null
    isEditOpen.value = true
}

const openCreate = () => {
    isCreateOpen.value = true
}

const handleTestPrint = async (certificate) => {
    if (!props.event || !certificate) {
        toast.add({
            title: 'No certificate selected',
            description: 'Create a certificate template before running a test print.',
            color: 'warning'
        })
        return
    }

    try {
        isTestGenerating.value = true
        const mockAttendee = {
            id: TEST_UUID,
            first_name: 'Test',
            last_name: 'Attendee',
            email: 'test@example.com',
            data: {
                licence: 'LIC-001',
                badge_id: 'BADGE-1234',
                registration_number: 'REG-5678'
            }
        }

        const eventData = {
            ...props.event,
            form: Array.isArray(props.event?.form) && props.event.form.length
                ? props.event.form
                : [
                    { id: 'badge_id', name: 'badge_id', type: 'text' },
                    { id: 'registration_number', name: 'registration_number', type: 'text' }
                ]
        }

        const response = await fetch('/api/certificates/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                attendee: mockAttendee,
                certificate: {
                    ...certificate.data,
                    certificateFilename: certificate.data?.certificateFilename || certificate.data?.uploadedFile?.name || '',
                    eventName: props.event?.name || ''
                },
                eventData
            })
        })

        if (!response.ok) {
            throw new Error('Certificate API preview failed')
        }

        const pdfArrayBuffer = await response.arrayBuffer()
        const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' })
        const blobUrl = URL.createObjectURL(blob)
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = blobUrl
        document.body.appendChild(iframe)

        iframe.onload = () => {
            try {
                if (window.electronAPI?.printSilent) {
                    window.electronAPI.printSilent()
                } else {
                    iframe.contentWindow?.focus()
                    iframe.contentWindow?.print()
                }
            } catch (err) {
                console.error('Failed to trigger print dialog for test preview:', err)
            } finally {
                setTimeout(() => {
                    document.body.removeChild(iframe)
                    URL.revokeObjectURL(blobUrl)
                }, 1000)
            }
        }
    } catch (error) {
        console.error('Failed to generate test certificate preview:', error)
        toast.add({
            title: 'Preview failed',
            description: 'Could not generate a test certificate.',
            color: 'error'
        })
    } finally {
        isTestGenerating.value = false
    }
}

const fetchCertificates = async () => {
    try {
        if (props.event?.id) {
            certificates.value = await fetchAllByEventId(props.event.id)
        }
    } catch (e) {
        console.error('Failed to load certificates list', e)
        certificates.value = []
    }
}

watchEffect(async () => {
    if (isOpen.value && props.event?.id) {
        await fetchCertificates()
    }
})
</script>