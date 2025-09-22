<template>
    <div class="w-full">
        <UDashboardNavbar title="Export" class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
            <template #leading>
                <UDashboardSidebarCollapse />
            </template>
        </UDashboardNavbar>

        <div class="max-w-4xl mx-auto p-6 space-y-6">
            <UCard class="shadow-sm">
                <template #header>
                    <h3 class="text-lg font-semibold">Export Settings</h3>
                    <p class="text-sm text-gray-600">Configure export options and settings</p>
                </template>

                <!-- Export Options -->
                <div class="space-y-6">
                    <!-- Data Selection Section -->
                    <div>
                        <h4 class="text-base font-medium mb-4">Data Selection</h4>
                        <div class="flex items-center gap-6">
                            <USelect
                                v-model="selectedEvent"
                                :items="eventOptions"
                                :loading="eventsLoading"
                                placeholder="Select event to export"
                                label="Select Event"
                                option-attribute="label"
                                value-attribute="value"
                                class="w-1/3"
                            />

                            <div class="flex items-center gap-6">
                                <div class="flex items-center gap-3">
                                    <span class="text-sm font-medium text-gray-600">Attended</span>
                                    <UTabs
                                        v-model="filterAttended"
                                        :items="attendedTabItems"
                                        size="md"
                                    />
                                </div>

                                <div class="flex items-center gap-3">
                                    <span class="text-sm font-medium text-gray-600">Paid</span>
                                    <UTabs
                                        v-model="filterPaid"
                                        :items="paidTabItems"
                                        size="md"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Fields Selection Section -->
                    <div class="flex items-center gap-6 w-full">
                        <USelectMenu
                            v-model="selectedFields"
                            :items="fieldOptions"
                            multiple
                            searchable
                            placeholder="Select fields to include"
                            option-attribute="label"
                            value-attribute="value"
                            class="w-1/2"
                        />
                        <USwitch
                            v-model="filterCyrillic"
                            label="Cyrillic (Ћирилица)"
                            size="md"
                        />
                    </div>
                </div>

                <!-- Attendees Preview -->
                <div v-if="selectedEvent" class="mt-6">
                    <h4 class="text-base font-medium mb-4">Attendees for Selected Event</h4>

                    <div v-if="attendeesLoading" class="flex justify-center py-8">
                        <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6" />
                        <span class="ml-2">Loading attendees...</span>
                    </div>

                    <div v-else-if="eventAttendees.length === 0" class="text-center py-8 text-gray-500">
                        No attendees found for this event
                    </div>

                    <div v-else-if="filteredAttendees.length === 0" class="text-center py-8 text-gray-500">
                        No attendees match the selected filters
                    </div>

                    <div v-else class="bg-gray-50 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
                        <div class="mb-2 text-sm text-gray-600">
                            Showing {{ filteredAttendees.length }} of {{ eventAttendees.length }} attendees
                        </div>
                        <pre class="text-sm text-gray-800 whitespace-pre-wrap">{{ JSON.stringify(filteredAttendees, null, 2) }}</pre>
                    </div>
                </div>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <UButton color="primary" @click="exportSelectedToCsv">
                            Export Data
                        </UButton>
                    </div>
                </template>
            </UCard>
        </div>
    </div>


</template>

<script setup>
import { useEvents } from '@/composables/database/useEvents'

// Import composable
const { getAllEventsForAutocomplete, getEventById, getAttendeesByIds } = useEvents()

// Toast notifications
const toast = useToast()

// Reactive state
const selectedEvent = ref('')
const eventOptions = ref([])
const eventsLoading = ref(false)
const eventAttendees = ref([])
const attendeesLoading = ref(false)
// Tabs-based filters: 'all' | 'yes' | 'no'
const filterAttended = ref('all')
const filterPaid = ref('all')
const filterCyrillic = ref(false)
const selectedEventDetails = ref(null)
const fieldOptions = ref([])
const selectedFields = ref([])

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

// Computed property to filter attendees based on tab selections
const filteredAttendees = computed(() => {
    const currentEvent = selectedEventDetails.value
    let filtered = eventAttendees.value

    if (!currentEvent) {
        return filtered
    }

    // Attended filter
    if (filterAttended.value !== 'all') {
        const attendedSet = new Set(currentEvent.attended || [])
        filtered = filtered.filter(attendee => {
            const isAttended = attendedSet.has(attendee.id)
            return filterAttended.value === 'yes' ? isAttended : !isAttended
        })
    }

    // Paid filter
    if (filterPaid.value !== 'all') {
        const paidSet = new Set(currentEvent.paid || [])
        filtered = filtered.filter(attendee => {
            const isPaid = paidSet.has(attendee.id)
            return filterPaid.value === 'yes' ? isPaid : !isPaid
        })
    }

    return filtered
})


// Load events on mount
onMounted(async () => {
    try {
        eventsLoading.value = true
        const events = await getAllEventsForAutocomplete()

        // Format events for USelect component
        eventOptions.value = events.map(event => ({
            label: event.name,
            value: event.id
        }))
    } catch (error) {
        console.error('Error loading events:', error)
    } finally {
        eventsLoading.value = false
    }
})

// Load attendees when event is selected
const loadAttendeesForEvent = async (eventId) => {
    if (!eventId) {
        eventAttendees.value = []
        selectedEventDetails.value = null
        return
    }

    try {
        attendeesLoading.value = true

        // Get event with attendees array
        const event = await getEventById(eventId)
        selectedEventDetails.value = event || null

        if (event && event.attendees && event.attendees.length > 0) {
            // Get attendee details by IDs
            const attendees = await getAttendeesByIds(event.attendees)
            eventAttendees.value = attendees
            buildFieldOptions(attendees)
        } else {
            eventAttendees.value = []
            fieldOptions.value = []
            selectedFields.value = []
        }
    } catch (error) {
        console.error('Error loading attendees:', error)
        eventAttendees.value = []
        selectedEventDetails.value = null
        fieldOptions.value = []
        selectedFields.value = []
    } finally {
        attendeesLoading.value = false
    }
}

// CSV export of currently filtered attendees with only selected fields
const exportSelectedToCsv = () => {
    try {
        const fields = selectedFields.value
        if (!fields || fields.length === 0) {
            toast.add({
                title: 'No fields selected',
                description: 'Please select at least one field to export.',
                color: 'warning',
                icon: 'i-lucide-alert-triangle'
            })
            return
        }
        if (!filteredAttendees.value || filteredAttendees.value.length === 0) {
            toast.add({
                title: 'No attendees to export',
                description: 'No attendees match the selected filters.',
                color: 'warning',
                icon: 'i-lucide-alert-triangle'
            })
            return
        }

        // Normalize field value to string (handles when component returns objects)
        const toFieldPathString = (val) => {
            if (typeof val === 'string') return val
            if (val && typeof val === 'object') {
                if (typeof val.value === 'string') return val.value
            }
            return String(val ?? '')
        }

        // Build header labels from selected field labels (do NOT transliterate headers)
        const headerLabels = fields.map(val => {
            const path = toFieldPathString(val)
            const opt = fieldOptions.value.find(o => o.value === path)
            const label = opt ? opt.label : (path.startsWith('data.') ? path.replace('data.', '') : path)
            return label
        })

        // Helper to get nested value by path (e.g., data.company)
        const getByPath = (obj, path) => {
            if (!obj || !path) return ''
            const segs = path.split('.')
            let cur = obj
            for (const s of segs) {
                if (cur == null) return ''
                cur = cur[s]
            }
            return cur == null ? '' : cur
        }

        // Escape for CSV
        const escapeCsv = (val, fieldPath = '') => {
            let str = val
            if (typeof str !== 'string') {
                if (str === null || str === undefined) str = ''
                else if (typeof str === 'object') str = JSON.stringify(str)
                else str = String(str)
            }
            if (filterCyrillic.value && shouldTransliterateField(fieldPath)) {
                if (shouldApplySurnameFix(fieldPath)) {
                    str = fixLatinSurnameIc(str)
                }
                str = latinToCyrillicSerbian(str)
            }
            str = str.replace(/\r?\n/g, '\\n')
            if (/[",\n]/.test(str)) {
                str = '"' + str.replace(/"/g, '""') + '"'
            }
            return str
        }

        const rows = []
        rows.push(headerLabels.map(escapeCsv).join(','))

        for (const attendee of filteredAttendees.value) {
            const rowValues = fields.map(fieldPath => {
                const path = toFieldPathString(fieldPath)
                // If field is data.key use nested read, else top-level
                const value = path.includes('.') ? getByPath(attendee, path) : attendee[path]
                return escapeCsv(value, path)
            })
            rows.push(rowValues.join(','))
        }

        const csvContent = rows.join('\n')
        // Prepend UTF-8 BOM for better Excel compatibility
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const eventName = selectedEventDetails.value?.name || 'event'
        const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
        a.href = url
        a.download = `${eventName}_export_${dateStr}.csv`
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.add({
            title: 'Export completed',
            description: 'CSV file has been downloaded successfully.',
            color: 'success',
            icon: 'i-lucide-check-circle'
        })
    } catch (err) {
        toast.add({
            title: 'Export failed',
            description: 'An error occurred while exporting the data.',
            color: 'error',
            icon: 'i-lucide-alert-circle'
        })
    }
}

// Heuristic: decide if surname-specific fix should be applied based on field name
const shouldApplySurnameFix = (path) => {
    if (!path) return false
    const last = String(path).split('.').pop() || ''
    return /^(prezime|surname|last[_-]?name|lastname|last|family[_-]?name|familyname)$/i.test(last)
}

// Only transliterate these fields: first_name and last_name (and common variants)
const shouldTransliterateField = (path) => {
    if (!path) return false
    const last = String(path).split('.').pop() || ''
    return /^(first[_-]?name|firstname|last[_-]?name|lastname)$/i.test(last)
}

// Replace Latin surname ending "ic" with "ić" preserving common casings
const fixLatinSurnameIc = (input) => {
    if (!input || typeof input !== 'string') return input
    let s = input
    // Title case: Novakovic -> Novaković
    s = s.replace(/\b([A-ZŠĐČĆŽ][a-zšđčćž]+)ic\b/g, '$1ić')
    // Uppercase: NOVAKOVIC -> NOVAKOVIĆ
    s = s.replace(/\b([A-ZŠĐČĆŽ]+)IC\b/g, '$1IĆ')
    // Mixed: NovakovIc -> NovakovIć (rare, but supported)
    s = s.replace(/\b([A-ZŠĐČĆŽ][a-zšđčćž]+)Ic\b/g, (_m, p1) => `${p1}Ić`)
    return s
}

// Transliterate Serbian Latin to Cyrillic (basic, with digraph handling)
const latinToCyrillicSerbian = (input) => {
    if (!input || typeof input !== 'string') return input

    // Handle trigraph/digraph first to preserve correctness
    const digraphs = [
        // Dž / dž / DŽ
        { latin: 'DŽ', cyr: 'Џ' },
        { latin: 'Dž', cyr: 'Џ' },
        { latin: 'dž', cyr: 'џ' },
        // Lj / lj / LJ
        { latin: 'LJ', cyr: 'Љ' },
        { latin: 'Lj', cyr: 'Љ' },
        { latin: 'lj', cyr: 'љ' },
        // Nj / nj / NJ
        { latin: 'NJ', cyr: 'Њ' },
        { latin: 'Nj', cyr: 'Њ' },
        { latin: 'nj', cyr: 'њ' }
    ]

    let result = input
    for (const { latin, cyr } of digraphs) {
        const re = new RegExp(latin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        result = result.replace(re, cyr)
    }

    // Single letters
    const map = new Map([
        ['A', 'А'], ['a', 'а'],
        ['B', 'Б'], ['b', 'б'],
        ['C', 'Ц'], ['c', 'ц'],
        ['Č', 'Ч'], ['č', 'ч'],
        ['Ć', 'Ћ'], ['ć', 'ћ'],
        ['D', 'Д'], ['d', 'д'],
        ['Đ', 'Ђ'], ['đ', 'ђ'],
        ['E', 'Е'], ['e', 'е'],
        ['F', 'Ф'], ['f', 'ф'],
        ['G', 'Г'], ['g', 'г'],
        ['H', 'Х'], ['h', 'х'],
        ['I', 'И'], ['i', 'и'],
        ['J', 'Ј'], ['j', 'ј'],
        ['K', 'К'], ['k', 'к'],
        ['L', 'Л'], ['l', 'л'],
        ['M', 'М'], ['m', 'м'],
        ['N', 'Н'], ['n', 'н'],
        ['O', 'О'], ['o', 'о'],
        ['P', 'П'], ['p', 'п'],
        ['R', 'Р'], ['r', 'р'],
        ['S', 'С'], ['s', 'с'],
        ['Š', 'Ш'], ['š', 'ш'],
        ['T', 'Т'], ['t', 'т'],
        ['U', 'У'], ['u', 'у'],
        ['V', 'В'], ['v', 'в'],
        ['Z', 'З'], ['z', 'з'],
        ['Ž', 'Ж'], ['ž', 'ж'],
        // Less common letters approximations
        ['Q', 'К'], ['q', 'к'],
        ['W', 'В'], ['w', 'в'],
        ['X', 'Кс'], ['x', 'кс'],
        ['Y', 'И'], ['y', 'и']
    ])

    let out = ''
    for (const ch of result) {
        out += map.get(ch) || ch
    }
    return out
}

// Build field options from attendees top-level and nested data keys
const buildFieldOptions = (attendees) => {
    const topLevelKeys = new Set()
    const dataKeys = new Set()

    for (const attendee of attendees) {
        if (attendee && typeof attendee === 'object') {
            // Collect top-level keys (excluding nested objects except data)
            Object.keys(attendee).forEach(key => {
                if (key === 'data') return
                topLevelKeys.add(key)
            })

            // Collect nested data keys
            if (attendee.data && typeof attendee.data === 'object') {
                Object.keys(attendee.data).forEach(dk => dataKeys.add(dk))
            }
        }
    }

    const options = [
        ...Array.from(topLevelKeys).map(k => ({ label: k, value: k })),
        ...Array.from(dataKeys).map(k => ({ label: k, value: `data.${k}` }))
    ].sort((a, b) => a.label.localeCompare(b.label))

    fieldOptions.value = options
}

// Watch for event selection changes
watch(selectedEvent, (newEventId) => {
    loadAttendeesForEvent(newEventId)
})
</script>

