<template>
    <div class="w-full">
        <UDashboardNavbar title="Certificate" class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
            <template #leading>
                <UDashboardSidebarCollapse />
            </template>
        </UDashboardNavbar>

        <div class="p-4">

            <div v-if="!isLoading && !certificates.length" class="text-gray-500 text-sm">No certificates uploaded yet.</div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <UCard v-for="file in certificates" :key="file.filename" class="shadow-sm">
                    <template #header>
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-file-text" class="h-4 w-4 text-gray-500" />
                            <span class="font-medium truncate" :title="file.filename">{{ file.filename.split('_').slice(1).join('_') }}</span>
                        </div>
                    </template>

                    <div class="text-xs text-gray-500 space-y-1">
                        <div>Size: {{ formatSize(file.size) }}</div>
                        <div>Updated: {{ formatDate(file.modifiedAt) }}</div>
                    </div>

                    <template #footer>
                        <div class="flex justify-end gap-2">
                            <UButton size="sm" variant="solid" color="primary" icon="i-lucide-eye" @click="viewFile(file)">
                                View
                            </UButton>
                            <UButton size="sm" variant="solid" color="error" icon="i-lucide-trash-2" @click="openDeleteModal(file)" :loading="deleting === file.filename">
                                Delete
                            </UButton>
                        </div>
                    </template>
                </UCard>
            </div>
        </div>

        <DeleteCertificateConfirmation
            v-model="isDeleteModalOpen"
            :certificate="fileToDelete"
            :is-loading="deleting === fileToDelete?.filename"
            @confirm="confirmDelete"
            @cancel="cancelDelete"
        />
    </div>
</template>

<script setup>
const certificates = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const deleting = ref('')

const isDeleteModalOpen = ref(false)
const fileToDelete = ref(null)

const fetchCertificates = async () => {
    isLoading.value = true
    errorMessage.value = ''
    try {
        const res = await $fetch('/api/certificates')
        certificates.value = Array.isArray(res) ? res : []
    } catch (e) {
        errorMessage.value = 'Failed to load certificates'
        // eslint-disable-next-line no-console
        console.error(e)
    } finally {
        isLoading.value = false
    }
}

onMounted(fetchCertificates)

const viewFile = (file) => {
    window.open(file.url, '_blank', 'noopener')
}

const openDeleteModal = (file) => {
    fileToDelete.value = file
    isDeleteModalOpen.value = true
}

const cancelDelete = () => {
    isDeleteModalOpen.value = false
    fileToDelete.value = null
}

const confirmDelete = async () => {
    if (!fileToDelete.value) return
    deleting.value = fileToDelete.value.filename
    try {
        await $fetch(`/api/certificates/${encodeURIComponent(fileToDelete.value.filename)}`, { method: 'DELETE' })
        certificates.value = certificates.value.filter(f => f.filename !== fileToDelete.value.filename)
        isDeleteModalOpen.value = false
        fileToDelete.value = null
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e)
        alert('Failed to delete certificate')
    } finally {
        deleting.value = ''
    }
}

const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return '-'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unit = 0
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024
        unit++
    }
    return `${size.toFixed(1)} ${units[unit]}`
}

const formatDate = (ms) => {
    try {
        return new Date(ms).toLocaleString()
    } catch {
        return '-'
    }
}
</script>