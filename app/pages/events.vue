<template>
    <div class="w-full">
        <UDashboardNavbar title="Events" class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
            <template #leading>
                <UDashboardSidebarCollapse />
            </template>

            <template #trailing>
                <UBadge :label="events.length" variant="subtle" />
            </template>

            <template #right>
                <UButton
                    icon="i-lucide-plus"
                    color="primary"
                    size="lg"
                    @click="isCreateEventOpen = true"
                >
                    Create Event
                </UButton>
            </template>
        </UDashboardNavbar>

        <DashboardSlideoverCreateEvent 
            v-model:open="isCreateEventOpen" 
            @refreshEvents="fetchEvents" 
        />

        <DashboardSlideoverEditEvent
            v-model:open="isEditModalOpen"
            :event="eventToEdit"
            @refreshEvents="fetchEvents"
        />

        <DashboardSlideoverEditRegistrationForm
            v-model:open="isEditRegistrationFormOpen"
            :event="eventToEdit"
            @refreshEvents="fetchEvents"
        />

        <DashboardSlideoverEventCertificateSettings
            v-model:open="isCertificateSettingsOpen"
            :event="eventToEdit"
            @refreshEvents="fetchEvents"
        />

        <DashboardModalDeleteEventConfirmation
            v-model="isDeleteModalOpen"
            :event="eventToDelete"
            :is-loading="isLoading"
            @confirm="confirmDelete"
            @cancel="cancelDelete"
        />

        <div class="p-4">
            <div v-if="isLoading" class="flex justify-center items-center h-32">
                <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-primary" />
                <span class="ml-2">Loading events...</span>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <UCard v-for="ev in events" :key="ev.id" class="cursor-pointer shadow-sm">
                    <template #header>
                        <h3 class="font-medium text-lg">{{ ev.name }}</h3>
                    </template>
                    <div class="flex flex-col gap-y-4">
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-users" class="h-4 w-4" />
                            <div class="text-sm text-gray-500">{{ ev.attendees?.length || 0 }} attendees</div>
                        </div>
                        <div class="text-sm text-gray-500 flex items-center gap-2">
                            <UIcon name="i-lucide-map-pin" class="h-4 w-4" />
                            {{ ev.location }}
                        </div>
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-calendar" class="h-4 w-4" />
                            <div class="text-sm text-gray-500">{{ formatDate(ev.date.start) }} - {{ formatDate(ev.date.end) }}</div>
                        </div>
                    </div>

                    <template #footer>
                        <div class="flex gap-2 justify-end">
                            <UButton
                                size="sm"
                                variant="solid"
                                color="primary"
                                icon="i-lucide-eye"
                                @click="viewEvent(ev)"
                            >
                                View
                            </UButton>
                            <UDropdownMenu
                                :items="[
                                    {
                                        label: 'Open Form',
                                        icon: 'i-lucide-file-text',
                                        onClick: () => navigateTo(`/form/${ev.id}`)
                                        
                                    },   
                                    {
                                        label: 'Open Public Form',
                                        icon: 'i-lucide-file-text',
                                        onClick: () => navigateTo(`pub/form/${ev.id}`)
                                    },  
                                    {
                                        type: 'separator'
                                    },    
                                    {
                                        label: 'Edit',
                                        icon: 'i-lucide-edit',
                                        onClick: () => editEvent(ev)
                                    },
                                    {
                                        label: 'Edit Form',
                                        icon: 'i-lucide-edit-2',
                                        onClick: () => editForm(ev)
                                    },                    
                                    {
                                        label: 'Email templates',
                                        icon: 'i-lucide-mail',
                                        onClick: () => navigateTo(`/email-templates/${ev.id}`)
                                    },  
                                    {
                                        type: 'separator'
                                    },
                                    {
                                        label: 'Certificates',
                                        icon: 'i-lucide-award',
                                        onClick: () => openCertificateSettings(ev)
                                    },  
                                    {
                                        type: 'separator'
                                    },
                                    {
                                        label: 'Delete',
                                        icon: 'i-lucide-trash-2',
                                        color: 'error',
                                        onClick: () => deleteEvent(ev)
                                    }
                                ]"
                                :content="{
                                    align: 'start',
                                    side: 'bottom',
                                    sideOffset: 4
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
                <div v-if="!events.length && !isLoading" class="col-span-full text-center py-8 text-gray-500">
                    No events yet.
                </div>
            </div>
        </div>
    </div>

</template>

<script setup>
    const isCreateEventOpen = ref(false)
    const isEditModalOpen = ref(false)
    const isEditRegistrationFormOpen = ref(false)
    const isCertificateSettingsOpen = ref(false)
    const isDeleteModalOpen = ref(false)
    const eventToEdit = ref(null)
    const eventToDelete = ref(null)

    import { useEvents } from '@/composables/database/useEvents'
    import { formatDate } from '@/composables/useHelpers'
    const { events, fetchEvents, isLoading, errorMessage, deleteEvent: deleteEventFromDb } = useEvents()

    onMounted(() => {
        fetchEvents()
    })

    const viewEvent = (event) => {
        navigateTo(`/event/${event.id}`)
    }

    const editEvent = (event) => {
        eventToEdit.value = event
        isEditModalOpen.value = true
    }

    const editForm = (event) => {
        eventToEdit.value = event
        isEditRegistrationFormOpen.value = true
    }

    const openCertificateSettings = (event) => {
        eventToEdit.value = event
        isCertificateSettingsOpen.value = true
    }

    const deleteEvent = (event) => {
        eventToDelete.value = event
        isDeleteModalOpen.value = true
    }

    const cancelDelete = () => {
        eventToDelete.value = null
        isDeleteModalOpen.value = false
    }

    const confirmDelete = async () => {
        if (!eventToDelete.value) return

        try {
            await deleteEventFromDb(eventToDelete.value.id)
            isDeleteModalOpen.value = false
            eventToDelete.value = null
        } catch (err) {
            console.error('Failed to delete event:', err)
        }
    }
</script>