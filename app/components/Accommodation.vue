<template>
    <USlideover v-model="isOpen" :ui="{ width: 'w-screen max-w-md' }">
        <UCard class="flex flex-col flex-1 shadow-sm" :ui="{ body: { base: 'flex-1' }, ring: '', divide: 'divide-y divide-gray-200' }">
            <template #header>
                <div class="flex items-center justify-between">
                    <h3 class="text-base font-semibold leading-6 text-gray-900">
                        {{ isEditing ? 'Edit Accommodation' : 'Create Accommodation' }}
                    </h3>
                    <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="close" />
                </div>
            </template>

            <div class="flex-1 overflow-y-auto">
                <form @submit.prevent="handleSubmit" class="space-y-6">
                    <!-- Basic Information -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-medium text-gray-900">Basic Information</h4>
                        
                        <UFormGroup label="Accommodation Name" required>
                            <UInput v-model="form.name" placeholder="Enter accommodation name" />
                        </UFormGroup>

                        <UFormGroup label="Description">
                            <UTextarea v-model="form.description" placeholder="Enter description" rows="3" />
                        </UFormGroup>

                        <UFormGroup label="Location">
                            <UInput v-model="form.location" placeholder="Enter location" />
                        </UFormGroup>

                        <UFormGroup label="Contact Information">
                            <UInput v-model="form.contact" placeholder="Phone, email, or contact person" />
                        </UFormGroup>
                    </div>

                    <!-- Rooms Configuration -->
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h4 class="text-sm font-medium text-gray-900">Rooms</h4>
                            <UButton size="xs" variant="soft" @click="addRoom" icon="i-heroicons-plus">
                                Add Room
                            </UButton>
                        </div>

                        <div v-if="form.rooms.length === 0" class="text-sm text-gray-500 text-center py-4">
                            No rooms configured. Click "Add Room" to get started.
                        </div>

                        <div v-for="(room, index) in form.rooms" :key="index" 
                             class="border border-gray-200 rounded-lg p-4 space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-medium text-gray-700">Room {{ index + 1 }}</span>
                                <UButton size="xs" color="red" variant="ghost" 
                                         @click="removeRoom(index)" icon="i-heroicons-trash">
                                    Remove
                                </UButton>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <UFormGroup label="Room Name" required>
                                    <UInput v-model="room.name" placeholder="e.g., Room A" />
                                </UFormGroup>

                                <UFormGroup label="Number of Beds" required>
                                    <UInput v-model.number="room.beds" type="number" min="1" max="10" placeholder="1" />
                                </UFormGroup>
                            </div>

                            <UFormGroup label="Room Description">
                                <UTextarea v-model="room.description" placeholder="Room details, amenities, etc." rows="2" />
                            </UFormGroup>
                        </div>
                    </div>

                    <!-- Additional Information -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-medium text-gray-900">Additional Information</h4>
                        
                        <UFormGroup label="Check-in Instructions">
                            <UTextarea v-model="form.checkin_instructions" 
                                       placeholder="Instructions for guests on check-in process" rows="3" />
                        </UFormGroup>

                        <UFormGroup label="House Rules">
                            <UTextarea v-model="form.house_rules" 
                                       placeholder="Rules and guidelines for guests" rows="3" />
                        </UFormGroup>

                        <UFormGroup label="Amenities">
                            <UTextarea v-model="form.amenities" 
                                       placeholder="WiFi, parking, kitchen access, etc." rows="2" />
                        </UFormGroup>
                    </div>
                </form>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <UButton color="neutral" variant="ghost" @click="close">
                        Cancel
                    </UButton>
                    <UButton @click="handleSubmit" :loading="isSubmitting" :disabled="!isFormValid">
                        {{ isEditing ? 'Update' : 'Create' }} Accommodation
                    </UButton>
                </div>
            </template>
        </UCard>
    </USlideover>
</template>

<script setup>
import { useAccommodations } from '@/composables/database/useAccommodations'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    accommodation: {
        type: Object,
        default: null
    },
    eventId: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['update:modelValue', 'created', 'updated'])

const { createAccommodation, updateAccommodation } = useAccommodations()

// State
const isSubmitting = ref(false)
const form = ref({
    name: '',
    description: '',
    location: '',
    contact: '',
    rooms: [],
    checkin_instructions: '',
    house_rules: '',
    amenities: ''
})

// Computed
const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

const isEditing = computed(() => !!props.accommodation)

const isFormValid = computed(() => {
    return form.value.name.trim() && 
           form.value.rooms.length > 0 && 
           form.value.rooms.every(room => room.name.trim() && room.beds > 0)
})

// Methods
const resetForm = () => {
    form.value = {
        name: '',
        description: '',
        location: '',
        contact: '',
        rooms: [],
        checkin_instructions: '',
        house_rules: '',
        amenities: ''
    }
}

const loadAccommodation = () => {
    if (props.accommodation) {
        form.value = {
            name: props.accommodation.data?.name || '',
            description: props.accommodation.data?.description || '',
            location: props.accommodation.data?.location || '',
            contact: props.accommodation.data?.contact || '',
            rooms: props.accommodation.data?.rooms || [],
            checkin_instructions: props.accommodation.data?.checkin_instructions || '',
            house_rules: props.accommodation.data?.house_rules || '',
            amenities: props.accommodation.data?.amenities || ''
        }
    } else {
        resetForm()
    }
}

const addRoom = () => {
    form.value.rooms.push({
        name: '',
        beds: 1,
        description: ''
    })
}

const removeRoom = (index) => {
    form.value.rooms.splice(index, 1)
}

const close = () => {
    isOpen.value = false
    resetForm()
}

const handleSubmit = async () => {
    if (!isFormValid.value) return

    isSubmitting.value = true

    try {
        const accommodationData = {
            name: form.value.name,
            data: {
                name: form.value.name,
                description: form.value.description,
                location: form.value.location,
                contact: form.value.contact,
                rooms: form.value.rooms,
                checkin_instructions: form.value.checkin_instructions,
                house_rules: form.value.house_rules,
                amenities: form.value.amenities,
                event: [{ id: props.eventId }],
                event_id: props.eventId
            }
        }

        let result
        if (isEditing.value) {
            result = await updateAccommodation(props.accommodation.id, accommodationData)
            emit('updated', result)
        } else {
            result = await createAccommodation(accommodationData)
            emit('created', result)
        }

        const toast = useToast()
        toast.add({
            title: `Accommodation ${isEditing.value ? 'Updated' : 'Created'}!`,
            description: `${form.value.name} has been ${isEditing.value ? 'updated' : 'created'} successfully.`,
            icon: 'i-heroicons-check-circle',
            color: 'success'
        })

        close()
    } catch (error) {
        console.error('Error saving accommodation:', error)
        
        const toast = useToast()
        toast.add({
            title: 'Error',
            description: error.message || `Failed to ${isEditing.value ? 'update' : 'create'} accommodation.`,
            icon: 'i-heroicons-exclamation-triangle',
            color: 'error'
        })
    } finally {
        isSubmitting.value = false
    }
}

// Watchers
watch(() => props.accommodation, loadAccommodation, { immediate: true })
watch(() => props.modelValue, (newValue) => {
    if (newValue) {
        loadAccommodation()
    }
})
</script>
</template>