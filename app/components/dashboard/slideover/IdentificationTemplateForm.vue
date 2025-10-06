<template>
    <div class="flex flex-col gap-y-6">
        <div class="space-y-4">
            <div class="flex items-center gap-4">
                <input
                    id="idcard-upload"
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
                    PDF up to 10MB
                </div>
            </div>

            <div v-if="hasPreview" class="space-y-4">
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
                            class="text-gray-900 font-semibold flex items-center justify-center"
                            :style="{
                                position: 'absolute',
                                left: `${clampPreviewX(field)}px`,
                                top: `${clampPreviewY(field)}px`,
                                width: `${getFieldPreviewWidth(field)}px`,
                                height: `${getFieldPreviewHeight(field)}px`,
                                fontSize: `${field.fontSize}px`,
                                border: field.type === 'qr_code' ? '1px dashed rgba(59,130,246,0.6)' : 'none',
                                background: field.type === 'qr_code' ? 'rgba(59,130,246,0.08)' : 'transparent',
                                transform: field.type !== 'qr_code' ? 'translateX(-50%)' : 'none'
                            }"
                        >
                            <template v-if="field.type === 'qr_code'">
                                <UIcon
                                    name="i-lucide-qr-code"
                                    :style="{
                                        fontSize: `${field.fontSize}px`,
                                        width: `${Math.max(field.fontSize, 40)}px`,
                                        height: `${Math.max(field.fontSize, 40)}px`
                                    }"
                                    class="text-primary"
                                />
                            </template>
                            <template v-else>
                                <span>
                                    [{{ getFieldDisplayText(field) }}]
                                </span>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="hasPreview" class="space-y-4">
            <h3 class="text-sm font-medium text-gray-700">Identification Card Settings</h3>

            <UInput v-model="titleModel" placeholder="" :ui="{ base: 'peer' }" class="w-full mt-6">
                <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                    <span class="inline-flex bg-default px-1">Identification Title</span>
                </label>
            </UInput>

            <div class="space-y-6 mt-6">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-gray-700">Identification Fields</h3>
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
                            <UBadge :label="getFieldTypeLabel(field.type)" size="xs" />
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

                    <div class="grid grid-cols-3 gap-4">
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-highlighted">Horizontal position</label>
                            <input
                                type="range"
                                :min="0"
                                :max="Math.max(0, pdfDisplayDimensions.width - getFieldPreviewWidth(field))"
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
                                :max="Math.max(0, pdfDisplayDimensions.height - getFieldPreviewHeight(field))"
                                step="1"
                                :value="field.position.y"
                                @input="(e) => updateFieldPosition(index, 'y', parseInt(e.target.value))"
                                class="w-full"
                            />
                            <div class="text-xs text-gray-500">{{ field.position.y }} px</div>
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-medium text-highlighted">
                                {{ field.type === 'qr_code' ? 'QR size' : 'Font size' }}
                            </label>
                            <input
                                type="range"
                                :min="field.type === 'qr_code' ? 40 : 8"
                                :max="field.type === 'qr_code' ? 240 : 48"
                                step="1"
                                :value="field.fontSize"
                                @input="(e) => updateFieldProperty(index, 'fontSize', parseInt(e.target.value))"
                                class="w-full"
                            />
                            <div class="text-xs text-gray-500">
                                {{ field.type === 'qr_code' ? `${field.fontSize}px × ${field.fontSize}px` : `${field.fontSize} px` }}
                            </div>
                        </div>
                    </div>
                </div>

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
    formFields: {
        type: Array,
        default: () => []
    },
    pdfUrl: {
        type: String,
        default: ''
    },
    title: { type: String, default: '' },
    fields: {
        type: Array,
        default: () => [
            { id: 1, type: 'name', position: { x: 100, y: 100 }, fontSize: 12 }
        ]
    },
    selectedConditionFieldId: { type: [String, Number, null], default: null },
    selectedConditionValue: { type: [String, Number, null], default: null },
    uploadedFile: { type: Object, default: null }
})

const emit = defineEmits([
    'update:pdfUrl',
    'update:title',
    'update:fields',
    'update:selectedConditionFieldId',
    'update:selectedConditionValue',
    'update:uploadedFile',
    'file-selected'
])

const UIcon = resolveComponent('UIcon')

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

const PREVIEW_DIMENSIONS = {
    width: 423,
    height: 600
}

const pdfDisplayDimensions = computed(() => {
    return {
        width: PREVIEW_DIMENSIONS.width,
        height: PREVIEW_DIMENSIONS.height,
        offsetX: 0,
        pointsPerPixel: 1,
        a4WidthPt: PREVIEW_DIMENSIONS.width,
        a4HeightPt: PREVIEW_DIMENSIONS.height
    }
})

const pdfIframe = ref(null)

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

const fieldTypeOptions = [
    { label: 'Attendee Full Name', value: 'name' },
    { label: 'Custom Text', value: 'custom_text' },
    { label: 'Form Field', value: 'form_field' },
    { label: 'Current Date', value: 'current_date' },
    { label: 'Event Name', value: 'event_name' },
    { label: 'QR Code', value: 'qr_code' }
]

const formFieldOptions = computed(() => {
    const form = props.formFields && Array.isArray(props.formFields) ? props.formFields : props.event?.form
    if (!form || !Array.isArray(form)) return []
    return form.map((field) => ({
        label: field.name || `Field ${field.order + 1}`,
        value: field.id
    }))
})

const previewScale = computed(() => 1)

const getFieldPreviewWidth = (field) => {
    if (field.type === 'qr_code') {
        return Math.max(field.fontSize || 80, 40)
    }
    return 80
}

const getFieldPreviewHeight = (field) => {
    if (field.type === 'qr_code') {
        return Math.max(field.fontSize || 80, 40)
    }
    return 20
}

const clampPreviewX = (field) => {
    const width = getFieldPreviewWidth(field)
    return pdfDisplayDimensions.value.offsetX + Math.max(0, Math.min(field.position.x || 0, pdfDisplayDimensions.value.width - width))
}

const clampPreviewY = (field) => {
    const height = getFieldPreviewHeight(field)
    return Math.max(0, Math.min(field.position.y || 0, pdfDisplayDimensions.value.height - height))
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

const updateFieldProperty = (fieldIndex, property, value) => {
    const newFields = [...fieldsModel.value]
    const updatedField = { ...newFields[fieldIndex], [property]: value }

    if (property === 'type') {
        if (value === 'qr_code') {
            updatedField.fontSize = updatedField.fontSize && updatedField.fontSize > 40 ? updatedField.fontSize : 120
            updatedField.customText = ''
            updatedField.formFieldId = null
        } else if (newFields[fieldIndex].type === 'qr_code' && value !== 'qr_code') {
            updatedField.fontSize = 12
        }
    }

    newFields[fieldIndex] = updatedField
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

const getFieldDisplayText = (field) => {
    switch (field.type) {
        case 'name':
            return 'Name'
        case 'licence':
            return 'Licence'
        case 'custom_text':
            return field.customText || 'Custom Text'
        case 'form_field': {
            const form = props.formFields && Array.isArray(props.formFields) ? props.formFields : props.event?.form
            const formField = form?.find((f) => f.id === field.formFieldId)
            return formField?.name || 'Form Field'
        }
        case 'current_date':
            return 'Date'
        case 'event_name':
            return 'Event Name'
        case 'qr_code':
            return 'QR Code'
        default:
            return 'Field'
    }
}

const getFieldTypeLabel = (type) => {
    const option = fieldTypeOptions.find((item) => item.value === type)
    return option?.label || type
}

const hasConditionOptions = computed(() => selectFieldItems.value.length > 0)

const selectFieldItems = computed(() => {
    const form = props.formFields && Array.isArray(props.formFields) ? props.formFields : props.event?.form
    if (!form || !Array.isArray(form)) return []
    return form
        .filter((field) => field.type === 'select' || field.type === 'radio' || field.type === 'checkbox')
        .map((field) => ({
            label: field.name,
            value: field.id
        }))
})

const getSelectFieldOptions = (fieldId) => {
    const form = props.formFields && Array.isArray(props.formFields) ? props.formFields : props.event?.form
    if (!form || !Array.isArray(form)) return []
    const field = form.find((item) => item.id === fieldId)
    if (!field || !Array.isArray(field.options)) return []
    return field.options.map((option) => ({
        label: option.label || option.value,
        value: option.value
    }))
}

const onFileChange = async (event) => {
    const file = event.target?.files?.[0]
    if (!file) return

    try {
        isUploading.value = true
        uploadedFileObject.value = file
        emit('update:uploadedFile', {
            name: file.name,
            size: file.size,
            type: file.type
        })
        emit('file-selected', file)

        if (objectUrl.value) {
            URL.revokeObjectURL(objectUrl.value)
            objectUrl.value = ''
        }

        objectUrl.value = URL.createObjectURL(file)
        emit('update:pdfUrl', objectUrl.value)
    } finally {
        isUploading.value = false
    }
}

watch(() => props.uploadedFile, (newValue) => {
    if (!newValue) return
    if (!objectUrl.value) {
        emit('update:pdfUrl', '')
    }
})

onBeforeUnmount(() => {
    if (objectUrl.value) {
        URL.revokeObjectURL(objectUrl.value)
        objectUrl.value = ''
    }
})
</script>

