<template>
    <div class="w-full">
        <UDashboardNavbar title="Registration Form" class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
            <template #leading>
                <UDashboardSidebarCollapse />
            </template>

            <template #right>
                <div class="flex gap-2">
                    <UButton
                        icon="i-lucide-arrow-left"
                        variant="outline"
                        size="sm"
                        color="neutral"
                        @click="$router.back()"
                    >
                        Back to Events
                    </UButton>
    
                </div>
            </template>
        </UDashboardNavbar>
    </div>
    <div class="w-full max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <div v-if="isLoading" class="text-gray-500">Loading...</div>
        <div v-else-if="errorMessage" class="text-red-600">{{ errorMessage }}</div>
        <div v-else-if="!eventData">Nothing to show.</div>

        <UCard v-else class="shadow-sm w-full">
            <template #header>
                <div>
                    <h1 class="font-semibold" v-if="eventData">{{ eventData.name }} registration</h1>
                    <p class="text-gray-500 text-sm" v-if="eventData">{{ eventData.location }}</p>
                </div>
            </template>

            <form @submit.prevent="handleSubmit" class="flex flex-col gap-y-6">
                <div v-if="!formSchema?.length" class="text-gray-500">
                    Registration form is not configured for this event.
                </div>

                <!-- Regular form fields -->
                <div v-for="field in visibleRegularFields" :key="field.id" class="flex flex-col gap-2">
                    <FormField :field="field" v-model="formValues[field.id]" :error="errors[field.id]" />
                </div>

                <!-- Accommodation section -->
                <div v-if="hasAccommodations" class="pt-4">
                    <h3 class="text-sm font-medium text-gray-700 mb-4">Accommodation</h3>
                    
                    <div class="flex flex-col gap-4">
                        <USelect v-model="needAccommodation"
                            :items="[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]"
                            placeholder="Need accommodation?" class="w-full" required />
                        <div v-if="errors.accommodation" class="text-red-500 text-sm">{{ errors.accommodation }}</div>

                        <template v-if="needAccommodation === 'yes'">
                            <!-- Accommodation Dates Selection - Show immediately when Yes is selected -->
                            <div v-if="hasEventDates" class=" pt-4 mt-4">
                                <h4 class="text-sm font-medium text-gray-700 mb-3">Accommodation Dates</h4>
                                <p class="text-xs text-gray-500 mb-4">Select which days you need accommodation ({{
                                    formatDateRange() }})</p>

                                <div class="space-y-3">
                                    <!-- Quick selection buttons -->
                                    <div class="flex flex-col sm:flex-row gap-2 mb-3">
                                        <UButton size="xs" variant="soft" color="secondary" @click="selectAllDates"
                                            :disabled="selectedEventDates.length === availableEventDates.length" class="w-full sm:w-auto">
                                            Select All
                                        </UButton>
                                        <UButton size="xs" variant="soft" color="error" @click="clearAllDates"
                                            :disabled="selectedEventDates.length === 0" class="w-full sm:w-auto">
                                            Clear All
                                        </UButton>
                                    </div>

                                    <div class="grid grid-cols-1">
                                        <div v-for="date in availableEventDates" :key="date.toISOString()"
                                            class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                                            <input :id="`date-${date.toISOString()}`" type="checkbox"
                                                :value="date.toISOString()" v-model="selectedEventDates"
                                                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                                            <label :for="`date-${date.toISOString()}`"
                                                class="text-sm text-gray-700 cursor-pointer flex-1">
                                                {{ formatEventDate(date) }}
                                            </label>
                                        </div>
                                    </div>

                                    <div v-if="selectedEventDates.length > 0"
                                        class="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p class="text-sm text-blue-700">
                                            <UIcon name="i-lucide-bed" class="h-4 w-4 inline mr-1" />
                                            Accommodation needed for {{ selectedEventDates.length }} night{{
                                                selectedEventDates.length !== 1 ? 's' : '' }} out of {{
                                                availableEventDates.length }}
                                        </p>
                                    </div>

                                    <div v-else class="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <p class="text-sm text-yellow-700">
                                            <UIcon name="i-lucide-calendar-x" class="h-4 w-4 inline mr-1" />
                                            Please select which nights you need accommodation
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Accommodation Selection -->
                            <USelect v-model="selectedAccommodation" :items="accommodationOptions"
                                placeholder="Select accommodation" class="w-full" />

                            <!-- Room Selection - Show when accommodation is selected -->
                            <div v-if="selectedAccommodation">
                                <USelect v-if="roomOptions.length > 0" v-model="selectedRoom" :items="roomOptions"
                                    placeholder="Select room" class="w-full" />
                                <div v-else class="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <div class="flex items-center">
                                        <UIcon name="i-lucide-bed-single" class="h-4 w-4 text-orange-600 mr-2" />
                                        <p class="text-sm text-orange-700">
                                            All rooms in this accommodation are fully booked.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Preferred Roommate Email - Show only if room has more than 1 bed -->
                            <UInput v-if="showRoommateField" v-model="roommateEmailGeneral"
                                placeholder="Preferred roommate email (optional)" class="w-full" />
                        </template>
                    </div>
                </div>
                
                <!-- No accommodations available warning -->
                <div v-else-if="eventAccommodations.length > 0" class="pt-4">
                    <h3 class="text-sm font-medium text-gray-700 mb-4">Accommodation</h3>
                    <div class="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div class="flex items-center">
                            <UIcon name="i-lucide-alert-triangle" class="h-5 w-5 text-yellow-600 mr-2" />
                            <div>
                                <p class="text-sm font-medium text-yellow-800">No Accommodations Available</p>
                                <p class="text-sm text-yellow-700 mt-1">
                                    All accommodation options for this event are currently fully booked or disabled.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end pt-4">
                    <UButton type="submit" color="primary" :loading="isSubmitting"
                        :disabled="isSubmitting || !formSchema?.length" class="w-full sm:w-auto">
                        Submit
                    </UButton>
                </div>
            </form>
        </UCard>
    </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useEvents } from '@/composables/database/useEvents'
import { useAccommodations } from '@/composables/database/useAccommodations'

const route = useRoute()
const { getEventById, updateEvent, checkExistingAttendee, saveAttendee, updateAttendeeEvents, isLoading, errorMessage } = useEvents()
const { getAccommodationsByEventId, createReservation, getAvailableAccommodations, getAvailableRooms } = useAccommodations()

// State
const eventData = ref(null)
const formSchema = ref([])
const formValues = ref({})
const errors = ref({})
const isSubmitting = ref(false)

// Accommodation state
const eventAccommodations = ref([])
const needAccommodation = ref('')
const selectedAccommodation = ref('')
const selectedRoom = ref('')
const roommateEmailGeneral = ref('')

// Calendar state
const selectedEventDates = ref([])

// Computed
const hasAccommodations = computed(() => {
    const availableAccommodations = getAvailableAccommodations(eventAccommodations.value)
    return availableAccommodations.length > 0
})

const visibleRegularFields = computed(() => {
    return formSchema.value.filter(field => {
        if (!field.hasConditions || !Array.isArray(field.conditions) || field.conditions.length === 0) {
            return true
        }

        // Group conditions by field_id to support OR within the same field,
        // and AND across different fields
        const fieldIdToAllowedValues = field.conditions.reduce((acc, cond) => {
            const key = cond.field_id
            if (!acc[key]) acc[key] = new Set()
            acc[key].add(cond.value)
            return acc
        }, {})

        // For each field_id, the condition is satisfied if the current value
        // matches ANY of the allowed values (OR). All field_ids must be satisfied (AND).
        return Object.entries(fieldIdToAllowedValues).every(([fieldId, allowedValuesSet]) => {
            const currentVal = formValues.value[fieldId]
            const allowedValues = Array.from(allowedValuesSet)

            if (Array.isArray(currentVal)) {
                return currentVal.some(v => allowedValues.includes(v))
            }
            return allowedValues.includes(currentVal)
        })
    })
})

const accommodationOptions = computed(() => {
    const availableAccommodations = getAvailableAccommodations(eventAccommodations.value)
    return availableAccommodations.map(acc => ({
        label: acc?.data?.name || acc?.data?.data?.name || 'Accommodation',
        value: acc?.data?.name || acc?.data?.data?.name || 'Accommodation'
    }))
})

const roomOptions = computed(() => {
    if (!selectedAccommodation.value) return []

    const acc = eventAccommodations.value.find(a =>
        (a?.data?.name || a?.data?.data?.name) === selectedAccommodation.value
    )

    if (!acc?.data?.rooms) return []

    // Dobijamo samo dostupne sobe (one koje nisu potpuno rezervisane)
    const availableRooms = getAvailableRooms(acc)

    return availableRooms.map(room => ({
        label: `${room.name} (${room.beds} beds) - ${room.capacity.available}/${room.capacity.total} available`,
        value: `${room.name} (${room.beds} beds)`,
        beds: room.beds,
        capacity: room.capacity
    }))
})

const showRoommateField = computed(() => {
    if (!selectedRoom.value) return false
    const room = roomOptions.value.find(r => r.value === selectedRoom.value)
    return room && room.beds > 1
})

// Helper functions for date formatting
const formatEventDate = (date) => {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }
    return date.toLocaleDateString('en-US', options)
}

const formatDateRange = () => {
    if (!eventDateRange.value) return ''

    const startOptions = { month: 'short', day: 'numeric' }
    const endOptions = { month: 'short', day: 'numeric', year: 'numeric' }

    const startFormatted = eventDateRange.value.start.toLocaleDateString('en-US', startOptions)
    const endFormatted = eventDateRange.value.end.toLocaleDateString('en-US', endOptions)

    return `${startFormatted} - ${endFormatted}`
}

const selectAllDates = () => {
    selectedEventDates.value = availableEventDates.value.map(date => date.toISOString())
}

const clearAllDates = () => {
    selectedEventDates.value = []
}

// Watch for accommodation changes to reset calendar and fields
watch(needAccommodation, (newValue) => {
    if (newValue !== 'yes') {
        selectedEventDates.value = []
        selectedAccommodation.value = ''
        selectedRoom.value = ''
        roommateEmailGeneral.value = ''
    }
})

// Calendar computed properties
const eventDateRange = computed(() => {
    if (!eventData.value?.date) return null

    const startDate = eventData.value.date.start
    const endDate = eventData.value.date.end

    if (!startDate || !endDate) return null

    // Convert from event date format {day, month, year} to Date objects
    const start = new Date(startDate.year, startDate.month - 1, startDate.day)
    const end = new Date(endDate.year, endDate.month - 1, endDate.day)

    return { start, end }
})

const availableEventDates = computed(() => {
    if (!eventDateRange.value) return []

    const dates = []
    const currentDate = new Date(eventDateRange.value.start)
    const endDate = new Date(eventDateRange.value.end)

    while (currentDate <= endDate) {
        dates.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
    }

    return dates
})

const hasEventDates = computed(() => {
    return availableEventDates.value.length > 0
})

// Methods
const loadEvent = async () => {
    try {
        const ev = await getEventById(route.params.id)
        eventData.value = ev
        formSchema.value = Array.isArray(ev?.form) ? [...ev.form].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : []

        eventAccommodations.value = await getAccommodationsByEventId(ev.id)
        initializeValues()
    } catch (e) {
        console.error('Error loading event:', e)
    }
}

const initializeValues = () => {
    const initial = {}
    formSchema.value.forEach(field => {
        initial[field.id] = field.type === 'checkbox' ? [] : ''
    })
    formValues.value = initial
}

const addAttendeeToEvent = async (eventId, attendeeId) => {
    const currentEvent = await getEventById(eventId)
    const currentAttendees = Array.isArray(currentEvent.attendees) ? currentEvent.attendees : []

    if (!currentAttendees.includes(attendeeId)) {
        await updateEvent(eventId, { attendees: [...currentAttendees, attendeeId] })
    }
}

const createAccommodationReservation = async (attendee) => {
    // Find the selected accommodation and room details
    const selectedAcc = eventAccommodations.value.find(a =>
        (a?.data?.name || a?.data?.data?.name) === selectedAccommodation.value
    )

    if (!selectedAcc) return

    // Extract room name from the selected room string (e.g., "Room A (2 beds)" -> "Room A")
    const roomName = selectedRoom.value.split(' (')[0]
    const selectedRoomData = selectedAcc.data.rooms?.find(r => r.name === roomName)

    if (!selectedRoomData) return

    // Build reservation data without null values
    const reservationData = {
        guest_name: `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim(),
        guest_email: attendee.email,
        first_name: attendee.first_name || '',
        last_name: attendee.last_name || '',
        accommodation_id: selectedAcc.id,
        room_type: selectedRoomData.name,
        event_id: eventData.value.id
    }

    // Only add non-empty values

    if (roommateEmailGeneral.value) {
        reservationData.roommate_email = roommateEmailGeneral.value
    }
    if (roommateEmailGeneral.value || attendee.data?.roommate_preference) {
        reservationData.roommate_preference = roommateEmailGeneral.value || attendee.data?.roommate_preference
    }
    if (attendee.data?.notes || formValues.value.notes) {
        reservationData.notes = attendee.data?.notes || formValues.value.notes
    }

    // Add accommodation dates if selected
    if (selectedEventDates.value.length > 0) {
        reservationData.accommodation_dates = selectedEventDates.value
        reservationData.accommodation_nights = selectedEventDates.value.length
    }

    await createReservation(selectedAcc.id, reservationData)
}

const validate = () => {
    const errs = {}

    visibleRegularFields.value.forEach(field => {
        if (field.required) {
            const val = formValues.value[field.id]
            const isEmpty = Array.isArray(val) ? val.length === 0 : !val
            if (isEmpty) errs[field.id] = `${field.name} is required`
        }
    })

    // Check if we have email field in the form - this is always required
    const hasEmailField = visibleRegularFields.value.some(field => {
        const fieldName = field.name || `field_${field.id}`
        return fieldName === 'email' || 
               field.placeholder?.toLowerCase().includes('email') ||
               fieldName.toLowerCase().includes('email')
    })

    if (!hasEmailField) {
        errs.email = 'Email field is required for registration'
    } else {
        // Check if email field has a value
        const emailField = visibleRegularFields.value.find(field => {
            const fieldName = field.name || `field_${field.id}`
            return fieldName === 'email' || 
                   field.placeholder?.toLowerCase().includes('email') ||
                   fieldName.toLowerCase().includes('email')
        })
        
        if (emailField) {
            const emailValue = formValues.value[emailField.id]
            if (!emailValue || emailValue.trim() === '') {
                errs[emailField.id] = 'Email is required'
            } else {
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailRegex.test(emailValue.trim())) {
                    errs[emailField.id] = 'Please enter a valid email address'
                }
            }
        }
    }

    // Validate accommodation selection (required)
    if (hasAccommodations.value && !needAccommodation.value) {
        errs.accommodation = 'Please specify if you need accommodation'
    }

    // Validate accommodation dates selection
    if (needAccommodation.value === 'yes' && hasEventDates.value && selectedEventDates.value.length === 0) {
        // This is just a warning, not a blocking error
        console.warn('Accommodation requested but no dates selected')
    }

    errors.value = errs
    return Object.keys(errs).length === 0
}

const handleSubmit = async () => {
    if (!eventData.value || !validate()) return

    isSubmitting.value = true

    try {
        const userData = { events: [eventData.value.id] }
        const data = {}

        // Process regular form fields
        visibleRegularFields.value.forEach(field => {
            const fieldName = field.name || `field_${field.id}`
            const fieldValue = formValues.value[field.id]

            // Debug logging
            console.log('Processing field:', { fieldName, fieldValue, fieldId: field.id, field })

            // Check if this is a core field (email, first_name, last_name) by name or by placeholder/pattern
            const isEmailField = fieldName === 'email' || 
                                field.placeholder?.toLowerCase().includes('email') ||
                                fieldName.toLowerCase().includes('email')
            
            const isFirstNameField = fieldName === 'first_name' ||
                                   field.placeholder?.toLowerCase().includes('first name') ||
                                   fieldName.toLowerCase().includes('first')
                                   
            const isLastNameField = fieldName === 'last_name' ||
                                  field.placeholder?.toLowerCase().includes('last name') ||
                                  fieldName.toLowerCase().includes('last')

            if (isEmailField) {
                userData.email = fieldValue ? fieldValue.trim() : ''
            } else if (isFirstNameField) {
                userData.first_name = fieldValue ? fieldValue.trim() : ''
            } else if (isLastNameField) {
                userData.last_name = fieldValue ? fieldValue.trim() : ''
            } else if (fieldName === 'event_id') {
                userData.event_id = fieldValue
            } else {
                data[fieldName] = fieldValue
            }
        })

        // Debug: log final userData before submission
        console.log('Final userData before submission:', userData)

        // Final safety check for email
        if (!userData.email || userData.email.trim() === '') {
            throw new Error('Email is required for registration. Please ensure the email field is filled out.')
        }

        // Add selected accommodation dates
        if (needAccommodation.value === 'yes' && selectedEventDates.value.length > 0) {
            data.accommodation_dates = selectedEventDates.value.map(dateStr => {
                const date = new Date(dateStr)
                return {
                    date: dateStr,
                    formatted: formatEventDate(date),
                    day: date.getDate(),
                    month: date.getMonth() + 1,
                    year: date.getFullYear()
                }
            })
            data.accommodation_nights = selectedEventDates.value.length
        }

        // Add accommodation data if needed
        if (needAccommodation.value === 'yes') {
            data.need_accommodation = 'Yes'
            data.accommodation_name = selectedAccommodation.value
            data.accommodation_room = selectedRoom.value

            if (roommateEmailGeneral.value) {
                data.preferred_roommate_email = roommateEmailGeneral.value
            }

        }

        if (Object.keys(data).length > 0) {
            userData.data = data
        }

        // Check if attendee already exists
        console.log('Checking existing attendee for email:', userData.email)
        const existingCheck = await checkExistingAttendee(userData.email, eventData.value.id)
        console.log('Existing check result:', existingCheck)

        if (existingCheck.exists && existingCheck.isRegisteredForEvent) {
            throw new Error('You are already registered for this event')
        }

        let savedAttendee

        if (existingCheck.exists && !existingCheck.isRegisteredForEvent) {
            console.log('Updating existing attendee events')
            const newEvents = [...(existingCheck.attendeeData.events || []), eventData.value.id]
            savedAttendee = await updateAttendeeEvents(existingCheck.attendeeData.id, newEvents)
            await addAttendeeToEvent(eventData.value.id, existingCheck.attendeeData.id)
        } else {
            console.log('Creating new attendee with userData:', userData)
            try {
                savedAttendee = await saveAttendee(userData)
                console.log('Successfully created attendee:', savedAttendee)
                await addAttendeeToEvent(eventData.value.id, savedAttendee.id)
            } catch (saveError) {
                console.error('Error saving attendee:', saveError)
                throw saveError
            }
        }

        // Create accommodation reservation if needed
        if (needAccommodation.value === 'yes' && selectedAccommodation.value && selectedRoom.value) {
            await createAccommodationReservation(savedAttendee)
        }

        // Send registration email
        try {
            console.log('Attempting to send email to:', savedAttendee.email)
            await $fetch('/api/email/send-registration', {
                method: 'POST',
                body: {
                    attendee: savedAttendee,
                    eventId: eventData.value.id
                }
            })
            console.log('Registration email sent successfully!')
        } catch (emailError) {
            console.error('Failed to send registration email:', emailError)
            // Don't fail the registration if email fails
        }

        const toast = useToast()
        toast.add({
            title: 'Registration Successful!',
            description: 'Your registration has been submitted successfully.',
            icon: 'i-heroicons-check-circle',
            color: 'success',
            timeout: 5000
        })

        // Reset form
        initializeValues()
        selectedEventDates.value = []
        needAccommodation.value = ''
        selectedAccommodation.value = ''
        selectedRoom.value = ''
        roommateEmailGeneral.value = ''

    } catch (e) {
        console.error('Error submitting form:', e)

        const toast = useToast()
        toast.add({
            title: 'Registration Failed!',
            description: e.message || 'There was an error submitting your registration. Please try again.',
            icon: 'i-heroicons-exclamation-triangle',
            color: 'error',
            timeout: 5000
        })
    } finally {
        isSubmitting.value = false
    }
}

onMounted(loadEvent)
</script>

<style scoped></style>