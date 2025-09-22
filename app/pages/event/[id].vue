<template>
    <div class="w-full">
        <!-- Delete Attendee Modal -->
        <DashboardModalDeleteAttendeeConfirmation v-model="isDeleteModalOpen" :attendee="attendeeToDelete"
            :is-loading="attendeesLoading" @confirm="confirmDeleteAttendee" @cancel="cancelDeleteAttendee" />

        <!-- View Attendee Details Slideover -->
        <DashboardSlideoverViewAttendeeDetails v-model:open="isViewSlideoverOpen" :attendee="attendeeToView"
            :event="event" @attendee-updated="handleAttendeeUpdated" />

        <UDashboardNavbar :title="eventLoading ? 'Loading...' : (event?.name || 'Event Details')"
            class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
            <template #leading>
                <UDashboardSidebarCollapse />
            </template>

            <template #trailing>
                <UBadge :label="event?.attendees?.length || 0" variant="subtle" />
            </template>

            <template #right>
                <UButton icon="i-heroicons-arrow-left" color="neutral" variant="outline" size="lg" to="/events">
                    Back to Events
                </UButton>
                <UButton icon="i-lucide-plus" color="primary" size="lg" :to="`/form/${eventId}`">
                    Register New Attendee
                </UButton>

            </template>
        </UDashboardNavbar>

        <!-- Loading State for Event -->
        <div v-if="eventLoading" class="flex justify-center items-center h-64 mt-16">
            <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-primary" />
            <span class="ml-2">Loading event details...</span>
        </div>

        <!-- Event Content (shown when loaded) -->
        <div v-else>
            <!-- Search and Filter Section -->
            <div class="mt-16 px-6 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <!-- Search -->
                    <UInput v-model="searchQuery" icon="i-lucide-search"
                        placeholder="Search attendees by name or email..." size="lg" class="relative -top-1 w-80"
                        :loading="attendeesLoading" @input="handleSearchInput" />

                    <!-- Filters (Tabs) -->
                    <UTabs v-model="filterAttended" :items="attendedTabItems" size="md"
                        @update:model-value="handleFilterChange" />

                    <UTabs v-model="filterPaid" :items="paidTabItems" size="md"
                        @update:model-value="handleFilterChange" />
                </div>
                <!-- Pagination -->
                <div>
                    <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div class="text-sm text-gray-500">
                            Total {{ totalAttendees }} attendees
                        </div>
                        <UPagination v-model="currentPage" :page-count="totalPages" :total="totalAttendees"
                            :input="false" @update:model-value="goToPage" />
                    </div>
                </div>
            </div>

            <!-- Attendees Section -->
            <div class="mt-16">
                <div v-if="attendeesLoading" class="flex justify-center items-center h-32">
                    <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-primary" />
                    <span class="ml-2">Loading attendees...</span>
                </div>

                <div v-else-if="attendees.length === 0" class="text-center py-8 text-gray-500">
                    No attendees registered yet
                </div>

                <UTable v-else :data="attendees" :columns="tableColumns" class="w-full">
                    <template #empty>
                        <div class="text-center py-8 text-gray-500">
                            No attendees data available
                        </div>
                    </template>
                </UTable>


            </div>
        </div>
    </div>
</template>

<script setup>
// Import composable
import { useEvents } from '~/composables/database/useEvents'
import { useCertificates } from '~/composables/database/useCertificates'
import { h, resolveComponent } from 'vue'
import { useClipboard, useDebounceFn } from '@vueuse/core'
import QRCode from 'qrcode'

const route = useRoute()
const { getEventById, getAttendeesByIds, deleteAttendee: deleteAttendeeFromDb, updateEvent, isLoading, errorMessage, fetchAttendeesPaginated } = useEvents()
const { getByEventId } = useCertificates()
const { copy } = useClipboard()
const toast = useToast()

const eventId = route.params.id

const event = ref(null)
const eventLoading = ref(false)
const attendees = ref([])
const attendeesLoading = ref(false)

// Search functionality
const searchQuery = ref('')
const currentSearchQuery = ref('')

// Filter functionality (tabs: 'all' | 'yes' | 'no')
const filterAttended = ref('all')
const filterPaid = ref('all')
const currentFilterAttended = ref('all')
const currentFilterPaid = ref('all')

// Tabs items
const attendedTabItems = [
    { label: 'All', value: 'all' },
    { label: 'Attended', value: 'yes' },
    { label: 'Not Attended', value: 'no' }
]
const paidTabItems = [
    { label: 'All', value: 'all' },
    { label: 'Paid', value: 'yes' },
    { label: 'Not Paid', value: 'no' }
]

// Pagination
const currentPage = ref(1)
const pageSize = 50
const totalAttendees = ref(0)

// Computed properties for pagination
const totalPages = computed(() => Math.ceil(totalAttendees.value / pageSize))
const hasNextPage = computed(() => currentPage.value < totalPages.value)
const hasPrevPage = computed(() => currentPage.value > 1)

// Debounced search function
const debouncedSearch = useDebounceFn(async () => {
    currentSearchQuery.value = searchQuery.value
    await fetchAttendees()
}, 1000)

// Debounced filter function
const debouncedFilter = useDebounceFn(async () => {
    currentFilterAttended.value = filterAttended.value
    currentFilterPaid.value = filterPaid.value
    await fetchAttendees()
}, 300)

// Handle search input
const handleSearchInput = () => {
    currentPage.value = 1 // Reset to first page when searching
    debouncedSearch()
}

// Handle filter change
const handleFilterChange = () => {
    currentPage.value = 1 // Reset to first page when filtering
    debouncedFilter()
}

// Pagination functions
const goToPage = (page) => {
    currentPage.value = page
    fetchAttendees()
}

const nextPage = () => {
    if (hasNextPage.value) {
        currentPage.value++
        fetchAttendees()
    }
}

const prevPage = () => {
    if (hasPrevPage.value) {
        currentPage.value--
        fetchAttendees()
    }
}

// Delete modal state
const isDeleteModalOpen = ref(false)
const attendeeToDelete = ref(null)

// View attendee slideover state
const isViewSlideoverOpen = ref(false)
const attendeeToView = ref(null)

// Computed property to get attendee status
const attendeeStatus = computed(() => {
    const attendedMap = new Set(event.value?.attended || [])
    const paidMap = new Set(event.value?.paid || [])

    return (attendeeId) => ({
        attended: attendedMap.has(attendeeId),
        paid: paidMap.has(attendeeId)
    })
})

// Table columns configuration
const tableColumns = [
    {
        accessorKey: 'first_name',
        header: 'First Name'
    },
    {
        accessorKey: 'last_name',
        header: 'Last Name'
    },
    {
        accessorKey: 'email',
        header: 'Email'
    },
    {
        id: 'attended',
        header: 'Attended',
        cell: ({ row }) => {
            const status = attendeeStatus.value(row.original.id)
            const UBadge = resolveComponent('UBadge')

            return h(
                'div',
                h(UBadge, {
                    label: status.attended ? 'Yes' : 'No',
                    variant: 'soft',
                    color: status.attended ? 'success' : 'error',
                    size: 'md'
                })
            )
        }
    },
    {
        id: 'paid',
        header: 'Paid',
        cell: ({ row }) => {
            const status = attendeeStatus.value(row.original.id)
            const UBadge = resolveComponent('UBadge')

            return h(
                'div',
                h(UBadge, {
                    label: status.paid ? 'Yes' : 'No',
                    variant: 'soft',
                    color: status.paid ? 'success' : 'error',
                    size: 'md'
                })
            )
        }
    },
    {
        accessorKey: 'created_at',
        header: 'Registered',
        cell: ({ getValue }) => new Date(getValue()).toLocaleDateString()
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const UButton = resolveComponent('UButton')
            const UDropdownMenu = resolveComponent('UDropdownMenu')

            return h(
                'div',
                { class: 'text-right' },
                h(
                    UDropdownMenu,
                    {
                        content: { align: 'end' },
                        items: getAttendeeActions(row),
                        'aria-label': 'Attendee actions'
                    },
                    () =>
                        h(UButton, {
                            icon: 'i-lucide-ellipsis-vertical',
                            color: 'neutral',
                            variant: 'ghost',
                            class: 'ml-auto',
                            'aria-label': 'Actions dropdown'
                        })
                )
            )
        }
    }
]

// Get actions for attendee row
function getAttendeeActions(row) {
    return [
        {
            label: 'View Details',
            icon: 'i-lucide-eye',
            onClick() {
                viewAttendee(row.original)
            }
        },
        {
            label: 'Copy Email',
            icon: 'i-lucide-copy',
            onClick() {
                copyAttendeeEmail(row.original.email)
            }
        },
        {
            label: 'Email Certificate',
            icon: 'i-lucide-mail',
            onClick() {
                sendCertificate(row.original)
            }
        },
        {
            label: 'Email QR Code',
            icon: 'i-lucide-mail',
            onClick() {
                sendQRCode(row.original)
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Delete Attendee',
            icon: 'i-lucide-trash-2',
            color: 'error',
            onClick() {
                deleteAttendee(row.original)
            }
        }
    ]
}

// Fetch event
const fetchEvent = async () => {
    eventLoading.value = true
    try {
        event.value = await getEventById(eventId)

        // Reset search, filters and pagination when loading new event
        searchQuery.value = ''
        currentSearchQuery.value = ''
        filterAttended.value = 'all'
        filterPaid.value = 'all'
        currentFilterAttended.value = 'all'
        currentFilterPaid.value = 'all'
        currentPage.value = 1

        // Fetch attendees for this event
        await fetchAttendees()
    } catch (err) {
        console.error('Failed to load event:', err)
    } finally {
        eventLoading.value = false
    }
}

// Fetch attendees for the current event with search, filters and pagination support
const fetchAttendees = async () => {
    if (!event.value?.attendees || event.value.attendees.length === 0) {
        attendees.value = []
        totalAttendees.value = 0
        return
    }

    attendeesLoading.value = true
    try {
        // First, get all attendees matching the search query (if any)
        const searchTerm = currentSearchQuery.value.trim()
        const { data: allAttendees } = await fetchAttendeesPaginated({
            page: currentPage.value,
            pageSize: pageSize,
            search: searchTerm,
            sortBy: 'created_at',
            ascending: false
        })

        // Filter attendees to only include those registered for this event
        const eventAttendeeIds = new Set(event.value.attendees)
        let filteredAttendees = allAttendees.filter(attendee =>
            eventAttendeeIds.has(attendee.id)
        )

        // Apply attended filter (client-side using tabs)
        if (currentFilterAttended.value !== 'all') {
            const attendedIds = new Set(event.value?.attended || [])
            filteredAttendees = filteredAttendees.filter(attendee => {
                const isAttended = attendedIds.has(attendee.id)
                return currentFilterAttended.value === 'yes' ? isAttended : !isAttended
            })
        }

        // Apply paid filter (client-side using tabs)
        if (currentFilterPaid.value !== 'all') {
            const paidIds = new Set(event.value?.paid || [])
            filteredAttendees = filteredAttendees.filter(attendee => {
                const isPaid = paidIds.has(attendee.id)
                return currentFilterPaid.value === 'yes' ? isPaid : !isPaid
            })
        }

        attendees.value = filteredAttendees

        // Calculate total attendees for this event that match all filters
        if (searchTerm || currentFilterAttended.value !== 'all' || currentFilterPaid.value !== 'all') {
            // If any filter is applied, we need to count how many event attendees match all filters
            const allEventAttendees = await getAttendeesByIds(event.value.attendees)
            let matchingAttendees = allEventAttendees

            // Apply search filter
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase()
                matchingAttendees = matchingAttendees.filter(attendee =>
                    attendee.first_name.toLowerCase().includes(lowerTerm) ||
                    attendee.last_name.toLowerCase().includes(lowerTerm) ||
                    attendee.email.toLowerCase().includes(lowerTerm)
                )
            }

            // Apply attended filter
            if (currentFilterAttended.value !== 'all') {
                const attendedIds = new Set(event.value?.attended || [])
                matchingAttendees = matchingAttendees.filter(attendee => {
                    const isAttended = attendedIds.has(attendee.id)
                    return currentFilterAttended.value === 'yes' ? isAttended : !isAttended
                })
            }

            // Apply paid filter
            if (currentFilterPaid.value !== 'all') {
                const paidIds = new Set(event.value?.paid || [])
                matchingAttendees = matchingAttendees.filter(attendee => {
                    const isPaid = paidIds.has(attendee.id)
                    return currentFilterPaid.value === 'yes' ? isPaid : !isPaid
                })
            }

            totalAttendees.value = matchingAttendees.length
        } else {
            totalAttendees.value = event.value.attendees.length
        }
    } catch (err) {
        console.error('Failed to load attendees:', err)
        attendees.value = []
        totalAttendees.value = 0
    } finally {
        attendeesLoading.value = false
    }
}

// Action handlers
const viewAttendee = (attendee) => {
    attendeeToView.value = attendee
    isViewSlideoverOpen.value = true
}

const copyAttendeeEmail = (email) => {
    copy(email)
    toast.add({
        title: 'Email copied to clipboard!',
        description: email,
        color: 'success',
        icon: 'i-lucide-circle-check',
        timeout: 3000
    })
}

const sendCertificate = async (attendee) => {
    try {
        // Show loading toast
        const loadingToast = toast.add({
            title: 'Sending certificate email...',
            description: `Sending certificate to ${attendee.first_name} ${attendee.last_name}`,
            color: 'primary',
            icon: 'i-lucide-loader-2',
            timeout: 0
        })

        // Send certificate via email
        const response = await $fetch('/api/email/send-certificate', {
            method: 'POST',
            body: {
                attendee: attendee,
                eventId: eventId
            }
        })

        // Remove loading toast
        toast.remove(loadingToast)

        // Show success toast
        toast.add({
            title: 'Certificate sent!',
            description: `Certificate has been sent to ${attendee.email}`,
            color: 'success',
            icon: 'i-lucide-mail-check',
            timeout: 4000
        })

    } catch (error) {
        console.error('Failed to send certificate email:', error)
        
        // Show error toast
        toast.add({
            title: 'Failed to send certificate!',
            description: error.message || 'Please try again.',
            color: 'error',
            icon: 'i-lucide-exclamation-triangle',
            timeout: 4000
        })
    }
}

const sendQRCode = async (attendee) => {
    try {
        // Show loading toast
        const loadingToast = toast.add({
            title: 'Sending QR Code email...',
            description: `Sending QR code to ${attendee.first_name} ${attendee.last_name}`,
            color: 'primary',
            icon: 'i-lucide-loader-2',
            timeout: 0
        })

        // Send QR code via email
        const response = await $fetch('/api/email/send-qr', {
            method: 'POST',
            body: {
                attendee: attendee,
                eventId: eventId
            }
        })

        // Remove loading toast
        toast.remove(loadingToast)

        // Show success toast
        toast.add({
            title: 'QR Code sent!',
            description: `QR code has been sent to ${attendee.email}`,
            color: 'success',
            icon: 'i-lucide-mail-check',
            timeout: 4000
        })

    } catch (error) {
        console.error('Failed to send QR code email:', error)
        
        // Show error toast
        toast.add({
            title: 'Failed to send QR code!',
            description: error.message || 'Please try again.',
            color: 'error',
            icon: 'i-lucide-exclamation-triangle',
            timeout: 4000
        })
    }
}

const deleteAttendee = (attendee) => {
    attendeeToDelete.value = attendee
    isDeleteModalOpen.value = true
}

const confirmDeleteAttendee = async () => {
    if (!attendeeToDelete.value) return

    try {
        const attendee = attendeeToDelete.value

        // Delete attendee from database
        await deleteAttendeeFromDb(attendee.id)

        // Remove attendee from event's attendees array
        if (event.value && event.value.attendees) {
            const updatedAttendees = event.value.attendees.filter(id => id !== attendee.id)
            await updateEvent(eventId, { attendees: updatedAttendees })
        }

        // Remove from local attendees array
        attendees.value = attendees.value.filter(a => a.id !== attendee.id)

        // Reset to first page if current page becomes empty
        if (attendees.value.length === 0 && currentPage.value > 1) {
            currentPage.value = 1
        }

        // Refresh attendees to get updated count
        await fetchAttendees()

        // Close modal
        isDeleteModalOpen.value = false
        attendeeToDelete.value = null

        // Show success toast
        toast.add({
            title: 'Attendee deleted successfully!',
            description: `${attendee.first_name} ${attendee.last_name} has been removed.`,
            color: 'success',
            icon: 'i-lucide-circle-check',
            timeout: 4000
        })

    } catch (error) {
        console.error('Error deleting attendee:', error)

        // Show error toast
        toast.add({
            title: 'Failed to delete attendee!',
            description: 'Please try again.',
            color: 'error',
            icon: 'i-lucide-exclamation-triangle',
            timeout: 4000
        })
    }
}

const cancelDeleteAttendee = () => {
    isDeleteModalOpen.value = false
    attendeeToDelete.value = null
}

const handleAttendeeUpdated = async (updatedData) => {
    const { attendee: updatedAttendee, attended, paid } = updatedData

    try {
        // First, refresh event data from server to get updated attended/paid lists
        // This is important because attended/paid status is updated server-side
        const updatedEvent = await getEventById(eventId, true)
        if (updatedEvent) {
            event.value = updatedEvent
        }

        // Update attendeeToView if it's the same attendee being viewed
        // Do this BEFORE refreshing attendees to avoid reactivity issues
        if (attendeeToView.value && attendeeToView.value.id === updatedAttendee.id) {
            attendeeToView.value = { ...updatedAttendee }
        }

        // Refresh attendees list to reflect all changes
        await fetchAttendees()

        // Show success message
        toast.add({
            title: 'Attendee Updated!',
            description: 'Attendee information has been updated successfully.',
            color: 'success',
            icon: 'i-lucide-circle-check',
            timeout: 3000
        })

    } catch (err) {
        console.error('Failed to refresh event data after attendee update:', err)

        // Show error message
        toast.add({
            title: 'Update Error!',
            description: 'Failed to refresh attendee data. Please reload the page.',
            color: 'error',
            icon: 'i-lucide-exclamation-triangle',
            timeout: 5000
        })
    }
}

onMounted(() => {
    fetchEvent()
})
</script>