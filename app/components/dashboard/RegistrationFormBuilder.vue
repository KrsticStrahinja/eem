<template>
    <div>
        <div>
            <h2 class="text-lg font-semibold">Rules</h2>
            <div class="flex flex-wrap gap-2 mb-4">
                <UBadge color="secondary" variant="soft">Required: first_name</UBadge>
                <UBadge color="secondary" variant="soft">Required: last_name</UBadge>
                <UBadge color="secondary" variant="soft">Required: email</UBadge>
            </div>
        </div>

        <UButton color="primary" variant="solid" class="w-full flex justify-center mt-4" icon="i-lucide-plus" @click="addField">
            Add Field
        </UButton>

        <UCard
            v-for="(field, index) in fields"
            :key="field.id"
            class="mt-6 shadow-sm"
        >
            <template #header>
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-6">
                        <p>{{ field.name || `Field ${field.order + 1}` }}</p>
                        <div class="flex items-center gap-4">
                            <p class="text-sm text-gray-400"> ID: {{ field.id }} | Order: {{ field.order }}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <UButton
                            color="secondary"
                            variant="soft"
                            size="xs"
                            icon="i-lucide-arrow-up"
                            @click="moveField(index, 'up')"
                            :disabled="index === 0"
                        />
                        <UButton
                            color="secondary"
                            variant="soft"
                            size="xs"
                            icon="i-lucide-arrow-down"
                            @click="moveField(index, 'down')"
                            :disabled="index === fields.length - 1"
                        />
                        <UButton
                            color="error"
                            variant="soft"
                            size="xs"
                            icon="i-lucide-trash-2"
                            @click="deleteField(index)"
                        />
                    </div>
                </div>
            </template>

            <div class="flex flex-col gap-4">
                <div class="flex items-center gap-4">
                    <UInput v-model="field.name" placeholder="" :ui="{ base: 'peer' }" class="w-2/5">
                        <label
                            class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                            <span class="inline-flex bg-default px-1">Field name</span>
                        </label>
                    </UInput>
                    <UInput v-model="field.placeholder" placeholder="" :ui="{ base: 'peer' }" class="w-2/5">
                        <label
                            class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                            <span class="inline-flex bg-default px-1">Placeholder</span>
                        </label>
                    </UInput>
                    <USelect
                        v-model="field.type"
                        :items="fieldTypes"
                        placeholder="Select field type"
                        class="w-1/5"
                    />
                </div>

                <div class="flex flex-2 items-center gap-4">
                    <div class="flex gap-4">
                        <USwitch v-model="field.required" label="Required" />
                        <USwitch v-model="field.hasConditions" label="Conditional" @change="toggleConditions(field)" />
                    </div>
                </div>
            </div>

            <div v-if="['checkbox', 'select', 'radio'].includes(field.type)" class="mt-4">
                <label class="text-sm text-gray-500">Options</label>
                <UInputTags v-model="field.options" class="w-full" />
            </div>

            <div v-if="field.conditions && field.conditions.length > 0" class="mt-4">
                <label class="text-sm text-gray-500">Conditions</label>
                <div v-for="(condition, conditionIndex) in field.conditions" :key="conditionIndex" class="mb-2">
                    <div class="flex items-center gap-4">
                        <USelect
                            v-model="condition.field_id"
                            :items="conditionalFieldItems"
                            placeholder="Select field"
                            class="w-2/5"
                        />

                        <div v-if="condition.field_id" class="w-2/5">
                            <USelect
                                v-model="condition.value"
                                :items="getConditionalFieldOptions(condition.field_id)"
                                placeholder="Select value"
                                class="w-full"
                            />
                        </div>

                        <div class="flex flex-1 justify-end gap-2">
                            <UButton
                                color="primary"
                                variant="solid"
                                size="sm"
                                icon="i-lucide-plus"
                                @click="addCondition(field)"
                            />
                            <UButton
                                v-if="field.conditions.length > 1"
                                color="error"
                                variant="soft"
                                size="sm"
                                icon="i-lucide-minus"
                                @click="removeCondition(field, conditionIndex)"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </UCard>

        <UButton color="primary" variant="solid" class="w-full flex justify-center mt-4" icon="i-lucide-plus" @click="addField">
            Add Field
        </UButton>

        <!-- Debug prikaz JSON-a -->
        <div v-if="fields.length > 0" class="mt-6">
            <UCard class="shadow-sm">
                <template #header>
                    <h3 class="text-lg font-semibold">Form Schema (JSON)</h3>
                </template>
                <pre class="text-xs bg-gray-100 p-4 rounded overflow-x-auto">{{ fieldsJSON }}</pre>
            </UCard>
        </div>
    </div>
</template>

<script setup>
import { useEvents } from '~/composables/database/useEvents'

// Props
const props = defineProps({
    event: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['refreshEvents'])

// Reactive array za čuvanje svih polja
const fields = ref([])

// Globalni counter za ID-jeve polja (ne resetuje se)
let globalFieldCounter = 1

// Funkcija za inicijalizaciju polja iz postojeće forme
const initializeFieldsFromEvent = () => {
    if (props.event && props.event.form && Array.isArray(props.event.form) && props.event.form.length > 0) {
        try {
            // Validiraj i parsiraj form array
            const validFields = props.event.form.filter(field =>
                field &&
                typeof field === 'object' &&
                field.id !== undefined &&
                field.name !== undefined
            )

            if (validFields.length === 0) {
                console.warn('No valid fields found in event form, initializing empty form')
                fields.value = []
                globalFieldCounter = 1
                return
            }

            // Postavi validna polja
            fields.value = validFields.map((field, index) => ({
                id: field.id || index + 1,
                name: field.name || '',
                placeholder: field.placeholder || '',
                type: field.type || 'text',
                required: field.required || false,
                hasConditions: field.hasConditions || (field.conditions && field.conditions.length > 0) || false,
                conditions: field.conditions || [],
                order: field.order !== undefined ? field.order : index,
                options: field.options || []
            }))

            // Pronađi najveći ID da bi globalFieldCounter bio veći
            const maxId = Math.max(...validFields.map(field => field.id || 0), 0)
            globalFieldCounter = maxId + 1

        } catch (error) {
            console.error('Error parsing existing form data:', error)
            // Ako dođe do greške, inicijalizuj praznu formu
            fields.value = []
            globalFieldCounter = 1
        }
    } else {
        // Ako nema forme ili je prazna, inicijalizuj praznu formu
        fields.value = []
        globalFieldCounter = 1
    }
}


const fieldTypes = [
    { label: 'Text', value: 'text' },
    { label: 'Email', value: 'email' },
    { label: 'Date', value: 'date' },
    { label: 'Select', value: 'select' },
    { label: 'Checkbox', value: 'checkbox' },
    { label: 'Radio', value: 'radio' },
]

// Computed property za JSON export svih polja
const fieldsJSON = computed(() => {
    return JSON.stringify(fields.value, null, 2)
})

// Computed property za items u USelect za conditional
const conditionalFieldItems = computed(() => {
    return fields.value
        .filter(f => f.type === 'select')
        .map(f => ({
            label: f.name || `Field ${f.order + 1}`,
            value: f.id
        }))
})

// Funkcija koja vraća opcije za selektovani conditional field
const getConditionalFieldOptions = (conditionalFieldId) => {
    if (!conditionalFieldId) return []

    const conditionalField = fields.value.find(field => field.id === conditionalFieldId)
    if (!conditionalField || !conditionalField.options || !Array.isArray(conditionalField.options)) {
        return []
    }

    return conditionalField.options.map(option => ({
        label: option,
        value: option
    }))
}

// Funkcija za dodavanje novog polja
const addField = () => {
    const newField = {
        id: globalFieldCounter,
        name: '',
        placeholder: '',
        type: 'text',
        required: false,
        hasConditions: false,
        conditions: [],
        order: fields.value.length,
        options: []
    }
    fields.value.push(newField)
    globalFieldCounter++
}

// Funkcija za brisanje polja
const deleteField = (index) => {
    fields.value.splice(index, 1)
    // Ažuriraj order za preostala polja
    fields.value.forEach((field, idx) => {
        field.order = idx
    })
}

const moveField = (index, direction) => {
    if (direction === 'up' && index > 0) {
        const temp = fields.value[index]
        fields.value[index] = fields.value[index - 1]
        fields.value[index - 1] = temp
    } else if (direction === 'down' && index < fields.value.length - 1) {
        const temp = fields.value[index]
        fields.value[index] = fields.value[index + 1]
        fields.value[index + 1] = temp
    }

    fields.value.forEach((field, idx) => {
        field.order = idx
    })
}


// Funkcija za export JSON-a pojedinačnog polja
const exportFieldJSON = (field) => {
    const fieldJSON = JSON.stringify(field, null, 2)

    // Copy to clipboard
    navigator.clipboard.writeText(fieldJSON).then(() => {
    }).catch(err => {
        console.error('Failed to copy field JSON:', err)
    })
}

// Funkcija za export svih polja kao JSON
const exportAllFieldsJSON = () => {
    navigator.clipboard.writeText(fieldsJSON.value).then(() => {
    }).catch(err => {
        console.error('Failed to copy all fields JSON:', err)
    })
}

// Metoda koja se poziva kada se klikne Save dugme u parent komponenti
const handleFormSave = async () => {
    try {

        // Proveri da li postoji event
        if (!props.event || !props.event.id) {
            console.error('No event data available for saving form')
            return
        }

        // Koristi useEvents composable
        const { updateEvent, isLoading, errorMessage } = useEvents()

        // Pripremi form schema sa filtriranim conditions
        const formSchema = fields.value.map(field => {
            const filteredField = { ...field }

            // Filtriraj samo validne conditions
            if (filteredField.conditions && Array.isArray(filteredField.conditions)) {
                filteredField.conditions = filteredField.conditions.filter(condition =>
                    condition.field_id !== null &&
                    condition.value !== null &&
                    condition.field_id !== undefined &&
                    condition.value !== undefined
                )
            }

            return filteredField
        })

        await updateEvent(props.event.id, {
            form: formSchema
        })

        // Pokaži success toast
        const toast = useToast()
        toast.add({
            title: 'Form Saved!',
            description: 'Registration form has been successfully saved.',
            icon: 'i-heroicons-check-circle',
            color: 'success',
            timeout: 5000
        })

        // Emituj event za refresh events
        emit('refreshEvents')

    } catch (error) {
        console.error('Error saving form to database:', error)

        // Pokaži error toast
        const toast = useToast()
        toast.add({
            title: 'Save Failed!',
            description: 'There was an error saving the registration form.',
            icon: 'i-heroicons-exclamation-triangle',
            color: 'error',
            timeout: 5000
        })
    }
}

// Funkcija za toggle conditions
const toggleConditions = (field) => {
    if (field.hasConditions) {
        // Dodaj prvi condition ako nema nijedan
        if (!field.conditions || field.conditions.length === 0) {
            field.conditions = [{ field_id: null, value: null }]
        }
    } else {
        // Očisti conditions
        field.conditions = []
    }
}

// Funkcija za dodavanje novog condition-a
const addCondition = (field) => {
    if (!field.conditions) {
        field.conditions = []
    }
    field.conditions.push({ field_id: null, value: null })
}

// Funkcija za brisanje condition-a
const removeCondition = (field, conditionIndex) => {
    field.conditions.splice(conditionIndex, 1)
    // Ako nema više conditions, isključi hasConditions
    if (field.conditions.length === 0) {
        field.hasConditions = false
    }
}

// Expose metoda za parent komponentu
defineExpose({
    handleFormSave
})

// Watcher za automatsku transformaciju field name-a
watch(() => fields.value.map(f => f.name), (newNames, oldNames) => {
    newNames.forEach((name, index) => {
        if (name !== oldNames[index] && name) {
            // Transformiši ime: mala slova, razmaci u donje crte
            const transformedName = name.toLowerCase().replace(/\s+/g, '_')
            if (transformedName !== name) {
                fields.value[index].name = transformedName
            }
        }
    })
}, { deep: true })

// Inicijalizuj polja kada se komponenta montira
onMounted(() => {
    initializeFieldsFromEvent()
})

</script>