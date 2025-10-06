<template>
    <div class="flex flex-col gap-y-6">
        <!-- PDF Upload Section -->
        <div class="space-y-4">
            <div class="flex items-center gap-4">
                <input
                    id="pdf-upload"
                    ref="fileInput"
                    type="file"
                    accept=".pdf"
                    class="hidden"
                    @change="onFileChange"
                />
                <UButton
                    color="primary"
                    variant="outline"
                    icon="i-lucide-upload"
                    @click="fileInput?.click()"
                    :loading="isUploading"
                >
                    Choose PDF File
                </UButton>
                <div class="text-sm text-gray-500">
                    PDF do 10MB
                </div>
            </div>

            <!-- PDF Preview -->
            <div v-if="hasPreview" class="space-y-4">
                <!-- PDF Preview -->
                <div class="relative bg-white">
                    <iframe
                        ref="pdfIframe"
                        :src="computedPdfSrc"
                        :style="{ 
                            width: `${pdfDisplayDimensions.width}px`,
                            height: `${pdfDisplayDimensions.height}px`
                        }"
                        title="PDF Preview"
                    ></iframe>
                    <div class="pointer-events-none absolute inset-0 overflow-hidden">
                        <div
                            v-for="field in fieldsModel"
                            :key="field.id"
                            class="text-gray-900 font-semibold"
                            :style="{ 
                                position: 'absolute', 
                                left: `${pdfDisplayDimensions.offsetX + Math.max(0, Math.min(field.position.x, pdfDisplayDimensions.width - 80))}px`, 
                                top: `${Math.max(0, Math.min(field.position.y, pdfDisplayDimensions.height - 20))}px`, 
                                fontSize: `${field.fontSize}px`,
                                transform: 'translateX(-50%)'
                            }"
                        >
                            [{{ getFieldDisplayText(field) }}]
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Certificate Settings -->
        <div v-if="hasPreview" class="space-y-4">
            <h3 class="text-sm font-medium text-gray-700">Certificate Settings</h3>
            
            <UInput v-model="titleModel" placeholder="" :ui="{ base: 'peer' }" class="w-full mt-6">
                <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                    <span class="inline-flex bg-default px-1">Certificate Title</span>
                </label>
            </UInput>

            <!-- Dynamic Fields -->
            <div class="space-y-6 mt-6">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-gray-700">Certificate Fields</h3>
                    <UButton 
                        icon="i-lucide-plus" 
                        size="xs" 
                        color="primary" 
                        variant="outline"
                        @click="addField"
                    >
                        Add Field
                    </UButton>
                </div>

                <div v-for="(field, index) in fieldsModel" :key="field.id" class="space-y-4 p-4 border border-gray-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-medium text-gray-700">Field {{ index + 1 }}</span>
                            <UBadge :label="field.type" size="xs" />
                        </div>
                        <UButton 
                            icon="i-lucide-trash-2" 
                            size="xs" 
                            color="red" 
                            variant="ghost"
                            @click="removeField(index)"
                            v-if="fieldsModel.length > 1"
                        />
                    </div>

                    <!-- Field Type Selector -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1 flex gap-2 items-center">
                            <label class="text-sm">Field Type</label>
                            <USelect
                                :model-value="field.type"
                                @update:model-value="(value) => updateFieldProperty(index, 'type', value)"
                                :items="fieldTypeOptions"
                                placeholder="Select field type"
                                size="sm"
                            />
                        </div>
                        <div class="space-y-1 flex gap-2 items-center" v-if="field.type === 'form_field'">
                            <label class="text-sm">Form Field</label>
                            <USelect
                                :model-value="field.formFieldId"
                                @update:model-value="(value) => updateFieldProperty(index, 'formFieldId', value)"
                                :items="formFieldOptions"
                                placeholder="Select form field"
                                size="sm"
                            />
                        </div>
                        <div class="space-y-1 flex gap-2 items-center" v-else-if="field.type === 'custom_text'">
                            <label class="text-sm">Custom Text</label>
                            <UInput
                                :model-value="field.customText"
                                @update:model-value="(value) => updateFieldProperty(index, 'customText', value)"
                                placeholder="Enter text to display"
                                size="sm"
                            />
                        </div>
                    </div>

                    <!-- Position Controls -->
                    <div class="grid grid-cols-3 gap-4">
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-highlighted">Horizontal position</label>
                            <input 
                                type="range" 
                                :min="0" 
                                :max="pdfDisplayDimensions.width - 80" 
                                step="1" 
                                :value="field.position.x"
                                @input="(e) => updateFieldPosition(index, 'x', parseInt(e.target.value))"
                                class="w-full" 
                            />
                            <div class="text-xs text-gray-500">{{ field.position.x }} px</div>
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-highlighted">Vertical position</label>
                            <input 
                                type="range" 
                                :min="0" 
                                :max="pdfDisplayDimensions.height - 20" 
                                step="1" 
                                :value="field.position.y"
                                @input="(e) => updateFieldPosition(index, 'y', parseInt(e.target.value))"
                                class="w-full" 
                            />
                            <div class="text-xs text-gray-500">{{ field.position.y }} px</div>
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-highlighted">Font size</label>
                            <input 
                                type="range" 
                                min="8" 
                                max="24" 
                                step="1" 
                                :value="field.fontSize"
                                @input="(e) => updateFieldProperty(index, 'fontSize', parseInt(e.target.value))"
                                class="w-full" 
                            />
                            <div class="text-xs text-gray-500">{{ field.fontSize }} px</div>
                        </div>
                    </div>
                </div>

                <!-- Condition -->
                <div v-if="hasConditionOptions">
                    <h3 class="text-sm font-medium text-gray-700">Condition</h3>
                    <div class="mt-2 space-y-3">
                        <div>
                            <label class="text-xs font-medium text-highlighted">Select field</label>
                            <USelect
                                v-model="selectedConditionFieldIdModel"
                                :items="selectFieldItems"
                                placeholder="Choose a select field from form"
                                class="w-full"
                            />
                        </div>
                        <div v-if="selectedConditionFieldId">
                            <label class="text-xs font-medium text-highlighted">Select value</label>
                            <USelect
                                v-model="selectedConditionValueModel"
                                :items="getSelectFieldOptions(selectedConditionFieldId)"
                                placeholder="Choose an option"
                                class="w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup>

const props = defineProps({
    event: {
        type: Object,
        default: null
    },
    // External preview URL (e.g., from server). Used when no local object URL exists
    pdfUrl: {
        type: String,
        default: ''
    },
    // v-model bindings
    title: { type: String, default: '' },
    fields: { 
        type: Array, 
        default: () => [
            { id: 1, type: 'name', position: { x: 100, y: 100 }, fontSize: 12 }
        ]
    },
    // Legacy props for backward compatibility
    positionX: { type: Number, default: 100 },
    positionY: { type: Number, default: 100 },
    fontSize1: { type: Number, default: 12 },
    positionX2: { type: Number, default: 200 },
    positionY2: { type: Number, default: 200 },
    fontSize2: { type: Number, default: 12 },
    selectedConditionFieldId: { type: [String, Number, null], default: null },
    selectedConditionValue: { type: [String, Number, null], default: null },
    uploadedFile: { type: Object, default: null }
})

const emit = defineEmits([
    'update:pdfUrl',
    'update:title',
    'update:fields',
    // Legacy emits for backward compatibility
    'update:positionX',
    'update:positionY',
    'update:fontSize1',
    'update:positionX2',
    'update:positionY2',
    'update:fontSize2',
    'update:selectedConditionFieldId',
    'update:selectedConditionValue',
    'update:uploadedFile',
    // Inform parent about the raw File so it can upload on save
    'file-selected'
])

const isUploading = ref(false)
const uploadedFileObject = ref(null)
const objectUrl = ref('')
const fileInput = ref(null)

const hasPreview = computed(() => {
    return !!uploadedFileObject.value || !!props.uploadedFile || !!objectUrl.value || !!props.pdfUrl
})

const computedPdfSrc = computed(() => {
    const url = objectUrl.value || props.pdfUrl || ''
    return url ? `${url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit` : ''
})

// Use A4 points as base units for precision
const pdfDisplayDimensions = computed(() => {
    // Standard A4 dimensions in points (typography units)
    const a4WidthPt = 595.32   // A4 width in points
    const a4HeightPt = 841.92  // A4 height in points
    
    // Convert points to pixels for display (72 DPI: 1 point = 1 pixel)
    const pixelsPerPoint = 1  // At 72 DPI
    
    // Scale down to fit in reasonable preview size while maintaining aspect ratio
    const maxHeightPx = 600
    const displayScale = maxHeightPx / a4HeightPt  // Scale factor for display
    
    const displayWidthPx = a4WidthPt * displayScale   // Display width in pixels
    const displayHeightPx = a4HeightPt * displayScale // Display height in pixels
    
    return {
        width: Math.round(displayWidthPx),    // Display width (~423px)
        height: Math.round(displayHeightPx),  // Display height (600px)
        offsetX: 0,                           // No offset needed
        pointsPerPixel: 1 / displayScale,     // Conversion factor: pixels to points
        a4WidthPt: a4WidthPt,                // Store A4 dimensions in points
        a4HeightPt: a4HeightPt               // Store A4 dimensions in points
    }
})

// Add a ref to potentially get iframe dimensions dynamically in the future
const pdfIframe = ref(null)

// Main computed models
const titleModel = computed({
    get: () => props.title,
    set: (v) => emit('update:title', v)
})

const fieldsModel = computed({
    get: () => props.fields,
    set: (v) => emit('update:fields', v)
})

const selectedConditionFieldIdModel = computed({
    get: () => props.selectedConditionFieldId,
    set: (v) => emit('update:selectedConditionFieldId', v)
})

const selectedConditionValueModel = computed({
    get: () => props.selectedConditionValue,
    set: (v) => emit('update:selectedConditionValue', v)
})

// Field type options
const fieldTypeOptions = [
    { label: 'Attendee Full Name', value: 'name' },
    { label: 'Custom Text', value: 'custom_text' },
    { label: 'Form Field', value: 'form_field' },
    { label: 'Current Date', value: 'current_date' },
    { label: 'Event Name', value: 'event_name' }
]

// Form field options for dropdowns - show ALL form fields regardless of type
const formFieldOptions = computed(() => {
    const form = props.event?.form
    if (!form || !Array.isArray(form)) return []
    return form.map((field) => ({ 
        label: field.name || `Field ${field.order + 1}`, 
        value: field.id 
    }))
})

// Helper methods for updating fields
const updateFieldProperty = (fieldIndex, property, value) => {
    const newFields = [...fieldsModel.value]
    newFields[fieldIndex] = { ...newFields[fieldIndex], [property]: value }
    fieldsModel.value = newFields
}

const updateFieldPosition = (fieldIndex, axis, value) => {
    const newFields = [...fieldsModel.value]
    newFields[fieldIndex] = { 
        ...newFields[fieldIndex], 
        position: { 
            ...newFields[fieldIndex].position, 
            [axis]: value 
        } 
    }
    fieldsModel.value = newFields
}

const addField = () => {
    const newField = {
        id: Date.now(),
        type: 'name',
        position: { x: 100, y: 100 },
        fontSize: 12,
        customText: '',
        formFieldId: null
    }
    fieldsModel.value = [...fieldsModel.value, newField]
}

const removeField = (index) => {
    const newFields = [...fieldsModel.value]
    newFields.splice(index, 1)
    fieldsModel.value = newFields
}

const getFieldDisplayText = (field) => {
    switch (field.type) {
        case 'name': return 'Name'
        case 'licence': return 'Licence'
        case 'custom_text': return field.customText || 'Custom Text'
        case 'form_field': 
            const formField = props.event?.form?.find(f => f.id === field.formFieldId)
            return formField?.name || 'Form Field'
        case 'current_date': return 'Date'
        case 'event_name': return 'Event Name'
        default: return 'Field'
    }
}

// Legacy compatibility computed models
const positionXModel = computed({
    get: () => props.positionX,
    set: (v) => emit('update:positionX', v)
})
const positionYModel = computed({
    get: () => props.positionY,
    set: (v) => emit('update:positionY', v)
})
const fontSize1Model = computed({
    get: () => props.fontSize1,
    set: (v) => emit('update:fontSize1', v)
})
const positionX2Model = computed({
    get: () => props.positionX2,
    set: (v) => emit('update:positionX2', v)
})
const positionY2Model = computed({
    get: () => props.positionY2,
    set: (v) => emit('update:positionY2', v)
})
const fontSize2Model = computed({
    get: () => props.fontSize2,
    set: (v) => emit('update:fontSize2', v)
})

const selectFieldItems = computed(() => {
    const form = props.event?.form
    if (!form || !Array.isArray(form)) return []
    return form
        .filter((f) => f && f.type === 'select')
        .map((f) => ({ label: f.name || `Field ${f.order + 1}` || 'Select field', value: f.id }))
})

const getSelectFieldOptions = (fieldId) => {
    const form = props.event?.form
    if (!form || !Array.isArray(form) || !fieldId) return []
    const field = form.find((f) => f.id === fieldId)
    if (!field || !Array.isArray(field.options)) return []
    return field.options.map((opt) => ({ label: opt, value: opt }))
}

const hasConditionOptions = computed(() => {
    const form = props.event?.form
    if (!form || !Array.isArray(form)) return false
    return form.some((f) => f && f.type === 'select' && Array.isArray(f.options) && f.options.length > 0)
})

const onFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
        alert('Please select a PDF file')
        return
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
    }

    isUploading.value = true
    try {
        // Simulate latency for better UX parity with previous implementation
        await new Promise(resolve => setTimeout(resolve, 300))

        uploadedFileObject.value = file
        if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
        objectUrl.value = URL.createObjectURL(file)

        const timestamp = Date.now()
        const filename = `certificate_${props.event?.id || 'event'}_${timestamp}.pdf`

        emit('update:uploadedFile', {
            name: file.name,
            size: file.size,
            filename,
            uploadedAt: new Date()
        })
        emit('file-selected', file)
    } catch (e) {
        console.error('Upload failed:', e)
        alert('Upload failed. Please try again.')
    } finally {
        isUploading.value = false
        // Clear the file input using ref instead of event.target
        if (fileInput.value) {
            fileInput.value.value = ''
        }
    }
}

onBeforeUnmount(() => {
    if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})

defineExpose({
    // For parent access if needed
    uploadedFileObject,
    objectUrl
})

</script>


