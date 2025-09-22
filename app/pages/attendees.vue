<template>
    <div class="w-full">
        <!-- Delete Attendee Modal -->
        <DashboardModalDeleteAttendeeConfirmation
            v-model="isDeleteModalOpen"
            :attendee="attendeeToDelete"
            :is-loading="isDeleting"
            @confirm="confirmDeleteAttendee"
            @cancel="cancelDeleteAttendee"
        />

        <!-- View Attendee Details Slideover -->
        <DashboardSlideoverViewAttendeeDetails
            v-model:open="isViewSlideoverOpen"
            :attendee="attendeeToView"
            @attendee-updated="handleAttendeeUpdated"
        />

        <UDashboardNavbar title="Attendees" class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
            <template #leading>
                <UDashboardSidebarCollapse />
            </template>

            <template #trailing>
                <UBadge :label="total.toString()" variant="subtle" />
            </template>
        </UDashboardNavbar>

        <div class="mt-12">
            <div>
                <div class="flex items-center justify-between gap-4 px-4">
                    <div class="flex items-center gap-3 mb-4">
                        <UInput v-model="search" placeholder="Search name or email..." class="w-full max-w-md" @keydown.enter="onSearch" />
                        <UButton icon="i-lucide-search" @click="onSearch">Search</UButton>
                        <UButton color="neutral" variant="ghost" @click="resetSearch" v-if="search">Clear</UButton>
                    </div>
                    <div class="flex items-center justify-between gap-4">
                        <div class="text-sm text-gray-500">
                            Showing {{ pageStart + 1 }}–{{ pageEnd }} of {{ total }}
                        </div>
                        <div class="flex items-center gap-3">
                            <USelect v-model="pageSize" :items="pageSizeOptions" class="w-24" />
                            <UPagination v-model="page" :page-count="pageSize" :total="total" />
                        </div>
                    </div>
                </div>

                <div class="relative">
                    <UTable :data="rows" :columns="columns" class="w-full">
                        <template #empty>
                            <div class="text-center py-8 text-gray-500">No attendees found</div>
                        </template>
                    </UTable>

                    <div v-if="isLoading" class="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                        <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-primary" />
                        <span class="ml-2 text-sm text-gray-700">Loading...</span>
                    </div>
                </div>

                

            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, h, resolveComponent } from 'vue'
import { useEvents } from '@/composables/database/useEvents'
import { useBatchOperations } from '@/composables/database/useBatchOperations'
import { useDebounceFn } from '@vueuse/core'
import { useClipboard } from '@vueuse/core'

const { fetchAttendeesPaginated, isLoading, deleteAttendee: deleteAttendeeFromDb } = useEvents()
const { searchWithPagination } = useBatchOperations()
const { copy } = useClipboard()
const toast = useToast()

const page = ref(1)
const pageSize = ref(50)
const total = ref(0)
const search = ref('')

const rows = ref([])

// Delete modal state
const isDeleteModalOpen = ref(false)
const attendeeToDelete = ref(null)
const isDeleting = ref(false)

// View attendee slideover state
const isViewSlideoverOpen = ref(false)
const attendeeToView = ref(null)

const columns = [
    { accessorKey: 'first_name', header: 'First Name' },
    { accessorKey: 'last_name', header: 'Last Name' },
    { accessorKey: 'email', header: 'Email' },
    {
        accessorKey: 'events',
        header: 'Events Count',
        cell: ({ getValue }) => Array.isArray(getValue()) ? getValue().length : 0
    },
    { accessorKey: 'created_at', header: 'Registered', cell: ({ getValue }) => new Date(getValue()).toLocaleDateString() },
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

const pageSizeOptions = [1, 25, 50, 100].map(v => ({ label: String(v), value: v }))

const pageStart = computed(() => (page.value - 1) * pageSize.value)
const pageEnd = computed(() => Math.min(pageStart.value + rows.value.length, total.value))

const loadPage = async () => {
    try {
        // Koristi optimizovanu search funkciju
        const result = await searchWithPagination(
            'attendees', 
            ['first_name', 'last_name', 'email'], 
            search.value,
            { 
                page: page.value, 
                pageSize: pageSize.value, 
                sortBy: 'created_at', 
                ascending: false 
            }
        )
        rows.value = result.data
        total.value = result.total
    } catch (error) {
        console.error('Error loading attendees:', error)
        // Fallback na originalnu funkciju
        const { data, total: t } = await fetchAttendeesPaginated({ page: page.value, pageSize: pageSize.value, search: search.value })
        rows.value = data
        total.value = t
    }
}

watch([page, pageSize], () => { loadPage() })

// Debounced search: trigger 1s after typing stops
const debouncedSearch = useDebounceFn(() => {
    page.value = 1
    loadPage()
}, 1000)

watch(search, () => {
    debouncedSearch()
})

const onSearch = () => {
    page.value = 1
    loadPage()
}

const resetSearch = () => {
    search.value = ''
    page.value = 1
    loadPage()
}

// Get actions for attendee row
function getAttendeeActions(row) {
    return [
        {
            type: 'label',
            label: 'Actions'
        },
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

const deleteAttendee = (attendee) => {
    attendeeToDelete.value = attendee
    isDeleteModalOpen.value = true
}

const confirmDeleteAttendee = async () => {
    if (!attendeeToDelete.value) return

    try {
        isDeleting.value = true
        const attendee = attendeeToDelete.value

        // Delete attendee from database
        await deleteAttendeeFromDb(attendee.id)

        // Remove from local attendees array
        rows.value = rows.value.filter(a => a.id !== attendee.id)

        // Update total count
        total.value = Math.max(0, total.value - 1)

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
    } finally {
        isDeleting.value = false
    }
}

const cancelDeleteAttendee = () => {
    isDeleteModalOpen.value = false
    attendeeToDelete.value = null
}

const handleAttendeeUpdated = (updatedAttendee) => {
    // Update the attendee in the local attendees array
    const index = rows.value.findIndex(a => a.id === updatedAttendee.id)
    if (index !== -1) {
        rows.value[index] = updatedAttendee
    }

    // Update attendeeToView if it's the same attendee being viewed
    if (attendeeToView.value && attendeeToView.value.id === updatedAttendee.id) {
        attendeeToView.value = updatedAttendee
    }
}

onMounted(() => {
    loadPage()
})
</script>