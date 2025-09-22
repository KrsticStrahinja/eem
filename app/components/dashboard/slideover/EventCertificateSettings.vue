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

                <!-- Delete Confirmation (standardized) -->
                <DeleteCertificateConfirmation v-model="isDeleteOpen" :certificate="certToDeleteInfo"
                    :is-loading="isDeleting" @confirm="confirmDelete" @cancel="isDeleteOpen = false" />
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
import DeleteCertificateConfirmation from '@/components/dashboard/modal/DeleteCertificateConfirmation.vue'
import { useCertificates } from '@/composables/database/useCertificates'

const { fetchAllByEventId, removeById, isLoading: isCertificatesLoading } = useCertificates()

const props = defineProps({
    event: {
        type: Object,
        default: null
    }
})

const isOpen = defineModel('open')
const emit = defineEmits(['refreshEvents'])

const certificates = ref([])
const isEditOpen = ref(false)
const isCreateOpen = ref(false)
const isDeleteOpen = ref(false)
const certToEditId = ref(null)
const isDeleting = ref(false)
const certToDelete = ref(null)
const certToDeleteInfo = computed(() => {
    if (!certToDelete.value) return null
    return {
        filename: certToDelete.value?.data?.uploadedFile?.name || certToDelete.value?.data?.certificateFilename || 'certificate'
    }
})

const openDelete = (cert) => {
    certToDelete.value = cert
    isDeleteOpen.value = true
}

const confirmDelete = async () => {
    try {
        if (!certToDelete.value) return
        isDeleting.value = true
        const cert = certToDelete.value
        // If there is a server-side file to delete, call API
        if (cert?.data?.certificateFilename) {
            try {
                await $fetch(`/api/certificates/${encodeURIComponent(cert.data.certificateFilename)}`, { method: 'DELETE' })
            } catch (err) {
                console.warn('Failed to delete certificate file, continuing with DB delete', err)
            }
        }

        await removeById(cert.id)
        await fetchCertificates()

        isDeleteOpen.value = false
        certToDelete.value = null
    } catch (e) {
        console.error('Failed to delete certificate', e)
    } finally {
        isDeleting.value = false
    }
}

const openEdit = (cert) => {
    certToEditId.value = cert?.id || null
    isEditOpen.value = true
}

const openCreate = () => {
    isCreateOpen.value = true
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