<template>
    <div class="w-full">
        <UDashboardNavbar title="Accommodation Packages" class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
            <template #leading>
                <UDashboardSidebarCollapse />
            </template>

            <template #trailing>
                <UBadge :label="accommodations.length" variant="subtle" />
            </template>

            <template #right>
                <UButton
                    icon="i-lucide-plus"
                    color="primary"
                    size="lg"
                    @click="isCreateAccommodationOpen = true"
                >
                    Add Accommodation
                </UButton>
            </template>
        </UDashboardNavbar>

        <DashboardSlideoverCreateAccommodation
            v-model:open="isCreateAccommodationOpen"
            @refreshAccommodations="handleRefreshAccommodations"
        />

        <DashboardModalDeleteAccommodationConfirmation
            v-model="isDeleteModalOpen"
            :accommodation="accommodationToDelete"
            :is-loading="isDeleting"
            @confirm="confirmDelete"
            @cancel="cancelDelete"
        />

        <DashboardSlideoverCreateAccommodation
            v-model:open="isEditAccommodationOpen"
            :accommodation="accommodationToEdit"
            @refreshAccommodations="handleRefreshAccommodations"
        />

        <div class="p-4">
            <!-- Error Message -->
            <div v-if="errorMessage" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-center">
                    <UIcon name="i-lucide-alert-circle" class="h-5 w-5 text-red-500 mr-2" />
                    <span class="text-red-700">{{ errorMessage }}</span>
                </div>
            </div>

            <div v-if="isLoading" class="flex justify-center items-center h-32">
                <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-primary" />
                <span class="ml-2">Loading accommodation packages...</span>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <UCard v-for="accommodation in accommodations" :key="accommodation.id" class="cursor-pointer shadow-sm">
                    <template #header>
                        <div class="flex items-center justify-between">
                            <h3 class="font-medium text-lg">{{ accommodation.data.name }}</h3>
                            <UBadge 
                                :color="getAccommodationStatus(accommodation).color"
                                size="sm"
                            >
                                {{ getAccommodationStatus(accommodation).label }}
                            </UBadge>
                        </div>
                    </template>
                    <div class="flex flex-col gap-y-4">
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-bed" class="h-4 w-4" />
                            <div class="text-sm text-gray-500">{{ accommodation.data.rooms?.length || 0 }} room types</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-users" class="h-4 w-4" />
                            <div class="text-sm text-gray-500">
                                {{ calculateAccommodationCapacity(accommodation).reserved }}/{{ calculateAccommodationCapacity(accommodation).total }} booked
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-calendar-days" class="h-4 w-4" />
                            <div class="text-sm text-gray-500">
                                <template v-if="accommodation.data.event">
                                    {{ accommodation.data.event.name }}
                                </template>
                                <template v-else>
                                    No event
                                </template>
                            </div>
                        </div>
                    </div>

                    <template #footer>
                        <div class="flex gap-2 justify-end">
                            <UButton
                                size="sm"
                                variant="solid"
                                color="primary"
                                icon="i-lucide-eye"
                                @click="viewAccommodation(accommodation)"
                            >
                                View
                            </UButton>
                            <UDropdownMenu
                                :items="[
                                    {
                                        label: 'Edit',
                                        icon: 'i-lucide-edit',
                                        onClick: () => editAccommodation(accommodation)
                                    },
                                    {
                                        type: 'separator'
                                    },
                                    {
                                        label: 'Delete',
                                        icon: 'i-lucide-trash-2',
                                        color: 'error',
                                        onClick: () => deleteAccommodation(accommodation)
                                    }
                                ]"
                                :content="{
                                    align: 'start',
                                    side: 'bottom',
                                    sideOffset: 4
                                }"
                                :ui="{
                                    content: 'w-36'
                                }"
                            >
                                <UButton
                                    size="sm"
                                    variant="outline"
                                    color="neutral"
                                    icon="i-lucide-settings"
                                    label="Options"
                                    />
                            </UDropdownMenu>
                        </div>
                    </template>
                </UCard>
                <div v-if="!accommodations.length && !isLoading" class="col-span-full text-center py-8 text-gray-500">
                    No accommodation packages yet.
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import DashboardSlideoverCreateAccommodation from '@/components/dashboard/slideover/CreateAccommodation.vue'
    import DashboardModalDeleteAccommodationConfirmation from '@/components/dashboard/modal/DeleteAccommodationConfirmation.vue'
    import { useAccommodations } from '@/composables/database/useAccommodations'

    const isCreateAccommodationOpen = ref(false)
    const isEditAccommodationOpen = ref(false)
    const isDeleteModalOpen = ref(false)
    const accommodationToDelete = ref(null)
    const accommodationToEdit = ref(null)
    const isDeleting = ref(false)

    // Use accommodations composable
    const { accommodations, isLoading, errorMessage, fetchAccommodations, deleteAccommodation: deleteAccommodationFromDb, calculateAccommodationCapacity } = useAccommodations()

    // Fetch accommodations on component mount
    onMounted(async () => {
        try {
            await fetchAccommodations()
        } catch (err) {
            console.error('Failed to load accommodations:', err)
        }
    })

    // Wrapper function for event handler
    const handleRefreshAccommodations = async () => {
        try {
            await fetchAccommodations()
        } catch (err) {
            console.error('Failed to refresh accommodations:', err)
        }
    }

    const viewAccommodation = (accommodation) => {
        navigateTo(`/accommodation/${accommodation.id}`)
    }

    const editAccommodation = (accommodation) => {
        accommodationToEdit.value = accommodation
        isEditAccommodationOpen.value = true
    }

    const deleteAccommodation = (accommodation) => {
        accommodationToDelete.value = accommodation
        isDeleteModalOpen.value = true
    }

    const cancelDelete = () => {
        accommodationToDelete.value = null
        isDeleteModalOpen.value = false
    }

    const confirmDelete = async () => {
        if (!accommodationToDelete.value) return

        try {
            isDeleting.value = true
            await deleteAccommodationFromDb(accommodationToDelete.value.id)
            isDeleteModalOpen.value = false
            accommodationToDelete.value = null
        } catch (err) {
            console.error('Failed to delete accommodation:', err)
        } finally {
            isDeleting.value = false
        }
    }

    // Calculate total capacity (beds × rooms)
    const calculateCapacity = (rooms) => {
        if (!rooms || !Array.isArray(rooms)) return 0

        return rooms.reduce((total, room) => {
            const beds = room.beds || 0
            const quantity = room.quantity || 0
            return total + (beds * quantity)
        }, 0)
    }

    // Get accommodation status badge
    const getAccommodationStatus = (accommodation) => {
        const isEnabled = accommodation.data?.enabled !== false
        const capacity = calculateAccommodationCapacity(accommodation)
        
        // Simple Available/Unavailable logic
        if (!isEnabled || capacity.isFullyBooked) {
            return { 
                label: 'Unavailable', 
                color: 'error'
            }
        }
        
        return { 
            label: 'Available', 
            color: 'success'
        }
    }

    // Watch for modal close to reset selected accommodation
    watch(isEditAccommodationOpen, (newValue) => {
        if (!newValue) {
            accommodationToEdit.value = null
        }
    })
</script>