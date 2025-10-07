<template>
    <USlideover
        v-model:open="isOpen"
        side="right"
        :title="slideoverTitle"
        class="max-w-2xl"
    >
        <template #body>
            <div class="flex flex-col gap-y-6">
                <div v-if="props.loading" class="flex items-center justify-center py-12">
                    <div class="flex items-center gap-2 text-gray-500">
                        <UIcon name="i-lucide-loader-2" class="h-5 w-5 animate-spin" />
                        <span>Loading identification configuration...</span>
                    </div>
                </div>

                <div v-else-if="!props.event">
                    <UAlert
                        title="No event selected"
                        description="Select an event before configuring identification templates."
                        icon="i-lucide-info"
                        color="warning"
                        variant="soft"
                    />
                </div>

                <div v-else>
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-base font-medium text-gray-900">Identification templates</h3>
                            <p class="text-sm text-gray-500">
                                Manage identification cards that will be generated for attendees.
                            </p>
                        </div>
                        <UButton
                            color="primary"
                            icon="i-lucide-plus"
                            @click="openCreate"
                        >
                            New identification
                        </UButton>
                    </div>

                    <div class="mt-6">
                        <div v-if="!idcards.length" class="rounded-lg border border-dashed border-gray-200 py-12 text-center">
                            <UIcon name="i-lucide-badge-check" class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                            <p class="text-sm text-gray-500">No identification templates yet. Create one to get started.</p>
                        </div>

                        <div v-else class="grid grid-cols-1 gap-4">
                            <UCard
                                v-for="card in idcards"
                                :key="card.id"
                                class="shadow-sm"
                            >
                                <template #header>
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-3">
                                            <UIcon name="i-lucide-badge-check" class="h-4 w-4 text-primary" />
                                            <p class="font-medium">{{ card.title || 'Untitled identification' }}</p>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <UButton
                                                size="xs"
                                                color="primary"
                                                variant="solid"
                                                icon="i-lucide-pencil"
                                                @click="openEdit(card.id)"
                                            >
                                                Edit
                                            </UButton>
                                            <UTooltip text="Generate preview using sample attendee">
                                                <UButton
                                                    size="xs"
                                                    color="neutral"
                                                    variant="outline"
                                                    icon="i-lucide-printer"
                                                    :loading="isTestGenerating"
                                                    @click="handleTestPrint(card)"
                                                >
                                                    Test
                                                </UButton>
                                            </UTooltip>
                                            <UButton
                                                size="xs"
                                                color="error"
                                                variant="soft"
                                                icon="i-lucide-trash-2"
                                                @click="openDelete(card)"
                                            >
                                                Delete
                                            </UButton>
                                        </div>
                                    </div>
                                </template>

                                <div class="space-y-3 text-sm text-gray-600">
                                    <div class="flex items-center gap-2">
                                        <UIcon name="i-lucide-file" class="h-4 w-4 text-gray-400" />
                                        <span>{{ card.templateFilename || 'No template file' }}</span>
                                    </div>

                                    <div v-if="card.condition" class="flex flex-wrap items-center gap-2">
                                        <span class="text-xs uppercase tracking-wide text-gray-400">Condition:</span>
                                        <UBadge variant="soft" color="secondary">
                                            {{ card.condition.field_name || card.condition.field_id }} = {{ card.condition.value }}
                                        </UBadge>
                                    </div>
                                </div>
                            </UCard>
                        </div>
                    </div>
                </div>

                <IdentificationSettingsCreate
                    v-model:open="isCreateOpen"
                    :event="props.event"
                    :form-fields="props.formFields"
                    @saved="handleCardSaved"
                    @refresh-event="emitRefreshEvent"
                />

                <IdentificationSettingsEdit
                    v-model:open="isEditOpen"
                    :event="props.event"
                    :form-fields="props.formFields"
                    :card-id="cardToEditId"
                    @saved="handleCardSaved"
                    @refresh-event="emitRefreshEvent"
                />

                <DeleteIdentificationConfirmation
                    v-model="isDeleteOpen"
                    :card="cardToDelete"
                    :is-loading="isDeleting"
                    @confirm="confirmDelete"
                    @cancel="closeDelete"
                />
            </div>
        </template>

        <template #footer>
            <div class="flex gap-2">
                <UButton color="neutral" variant="outline" @click="close">
                    Close
                </UButton>
            </div>
        </template>
    </USlideover>
</template>

<script setup>
import IdentificationSettingsCreate from '@/components/dashboard/slideover/IdentificationSettingsCreate.vue'
import IdentificationSettingsEdit from '@/components/dashboard/slideover/IdentificationSettingsEdit.vue'
import DeleteIdentificationConfirmation from '@/components/dashboard/modal/DeleteIdentificationConfirmation.vue'
import { useEvents } from '@/composables/database/useEvents'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

const props = defineProps({
    event: {
        type: Object,
        default: null
    },
    loading: {
        type: Boolean,
        default: false
    },
    formFields: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['refresh-event'])

const isOpen = defineModel('open', { default: false })

const { updateEventIdcards } = useEvents()
const toast = useToast()

const isCreateOpen = ref(false)
const isEditOpen = ref(false)
const isDeleteOpen = ref(false)
const isDeleting = ref(false)
const cardToEditId = ref(null)
const cardPendingDelete = ref(null)
const isTestGenerating = ref(false)
const TEST_UUID = 'sample-uuid-1234-5678'

const DEFAULT_PREVIEW_DIMENSIONS = {
    width: 423,
    height: 600,
    a4WidthPt: 423,
    a4HeightPt: 600
}

const slideoverTitle = computed(() => {
    if (!props.event?.name) return 'Configure Identification'
    return `${props.event.name} Identification`
})

const idcards = computed(() => {
    if (!props.event?.idcard) return []
    return Array.isArray(props.event.idcard) ? props.event.idcard : []
})

const getFormDefinition = (eventData) => (Array.isArray(eventData?.form) ? eventData.form : [])

const normalizeValue = (value) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (Array.isArray(value)) return value.map(item => normalizeValue(item)).filter(Boolean).join(', ')
    if (typeof value === 'object') return Object.values(value).map(item => normalizeValue(item)).filter(Boolean).join(', ')
    return ''
}

const getAttendeeFieldValue = (formFieldId, attendeeData, eventData) => {
    if (!formFieldId) return ''
    const formDefinition = getFormDefinition(eventData)
    const formField = formDefinition.find(field => field.id === formFieldId)
    const candidateKeys = []

    if (formField?.name) {
        candidateKeys.push(formField.name)
    }

    candidateKeys.push(formFieldId, `field_${formFieldId}`)

    const dataSources = [attendeeData, attendeeData?.data || {}]

    for (const source of dataSources) {
        if (!source) continue
        for (const key of candidateKeys) {
            if (key in source && source[key] !== undefined) {
                return normalizeValue(source[key])
            }
        }
    }

    const fallbackEntry = Object.entries(attendeeData?.data || {}).find(([key]) => String(key).includes(String(formFieldId)))
    if (fallbackEntry) {
        return normalizeValue(fallbackEntry[1])
    }

    return ''
}

const resolveFieldText = async (field, attendeeData, eventData, uuid) => {
    switch (field.type) {
        case 'name':
            return normalizeValue(`${attendeeData.first_name || ''} ${attendeeData.last_name || ''}`.trim())
        case 'licence': {
            const licenceCandidates = ['licence', 'license', 'certificate_number', 'license_number', 'licence_number']
            for (const key of licenceCandidates) {
                const value = attendeeData?.data?.[key]
                if (value) return normalizeValue(value)
            }
            return ''
        }
        case 'custom_text':
            return normalizeValue(field.customText)
        case 'form_field':
            return getAttendeeFieldValue(field.formFieldId, attendeeData, eventData)
        case 'current_date':
            return new Date().toLocaleDateString('sr-RS')
        case 'event_name':
            return normalizeValue(eventData?.name)
        case 'qr_code': {
            if (!uuid) return ''
            try {
                const dataUrl = await QRCode.toDataURL(uuid, {
                    margin: 0,
                    scale: 4,
                    errorCorrectionLevel: 'H'
                })
                return dataUrl
            } catch (err) {
                console.error('Failed to generate QR code for preview:', err)
                return normalizeValue(uuid)
            }
        }
        default:
            return ''
    }
}

const embedQrCode = async (page, pdfDoc, dataUrl, topLeftX, topLeftY, field, scaleX, scaleY) => {
    if (!dataUrl?.startsWith('data:image')) {
        throw new Error('Invalid QR code data URL')
    }

    const base64 = dataUrl.split(',')[1]
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i += 1) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    const image = await pdfDoc.embedPng(bytes)

    const baseSize = field.fontSize || 120
    const size = baseSize * Math.min(scaleX, scaleY)
    const drawY = topLeftY - size

    page.drawImage(image, {
        x: topLeftX,
        y: drawY,
        width: size,
        height: size
    })

    return { width: size, height: size }
}

const renderIdentificationCardPreview = async (card, attendeeData, eventData, uuid) => {
    if (!card?.templateUrl) {
        throw new Error('Identification card template is missing')
    }

    // Convert relative URL to API endpoint if needed
    let templateUrl = card.templateUrl
    if (templateUrl.startsWith('/idcards/')) {
        const filename = templateUrl.split('/').pop()
        templateUrl = `/api/idcards/${filename}`
    }

    const response = await fetch(templateUrl)
    if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`)
    }
    const templateArrayBuffer = await response.arrayBuffer()
    const pdfDoc = await PDFDocument.load(templateArrayBuffer)
    const pages = pdfDoc.getPages()
    if (!pages.length) {
        throw new Error('Identification template has no pages')
    }

    const firstPage = pages[0]
    const { width: pdfWidth, height: pdfHeight } = firstPage.getSize()
    const scaleX = pdfWidth / DEFAULT_PREVIEW_DIMENSIONS.width
    const scaleY = pdfHeight / DEFAULT_PREVIEW_DIMENSIONS.height
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    if (Array.isArray(card.fields)) {
        for (const field of card.fields) {
            if (!field?.position) continue
            const text = await resolveFieldText(field, attendeeData, eventData, uuid)
            if (!text) continue

            const pdfX = (field.position.x || 0) * scaleX
            const pdfYFromTop = (field.position.y || 0) * scaleY
            const drawY = pdfHeight - pdfYFromTop

            if (field.type === 'qr_code') {
                await embedQrCode(firstPage, pdfDoc, text, pdfX, drawY, field, scaleX, scaleY)
                continue
            }

            const fontSize = (field.fontSize || 12) * Math.min(scaleX, scaleY)
            const adjustedDrawY = drawY - fontSize

            // Calculate text width and center it
            const textWidth = font.widthOfTextAtSize(text, fontSize)
            const centerX = (field.position.x || 0) * scaleX
            const centeredPdfX = centerX - (textWidth / 2)

            firstPage.drawText(text, {
                x: centeredPdfX,
                y: adjustedDrawY,
                size: fontSize,
                font,
                color: rgb(0, 0, 0)
            })
        }
    }

    return pdfDoc.save()
}

const handleTestPrint = async (card) => {
    if (!props.event || !card) {
        toast.add({
            title: 'No template available',
            description: 'Create an identification template before running a test print.',
            color: 'warning'
        })
        return
    }


    try {
        isTestGenerating.value = true
        const mockAttendee = {
            id: TEST_UUID,
            first_name: 'Test',
            last_name: 'Attendee',
            email: 'test@example.com',
            data: {
                licence: 'LIC-001',
                badge_id: 'BADGE-1234',
                registration_number: 'REG-5678'
            }
        }

        const eventData = {
            ...props.event,
            form: Array.isArray(props.event?.form) && props.event.form.length
                ? props.event.form
                : [
                    { id: 'badge_id', name: 'badge_id', type: 'text' },
                    { id: 'registration_number', name: 'registration_number', type: 'text' }
                ]
        }


        const pdfBytes = await renderIdentificationCardPreview(card, mockAttendee, eventData, TEST_UUID)
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })
        const blobUrl = URL.createObjectURL(blob)
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = blobUrl
        document.body.appendChild(iframe)

        iframe.onload = () => {
            try {
                iframe.contentWindow?.focus()
                iframe.contentWindow?.print()
            } catch (err) {
                console.error('Failed to trigger print dialog for test preview:', err)
            } finally {
                setTimeout(() => {
                    document.body.removeChild(iframe)
                    URL.revokeObjectURL(blobUrl)
                }, 1000)
            }
        }
    } catch (error) {
        console.error('Failed to generate test identification preview:', error)
        toast.add({
            title: 'Preview failed',
            description: 'Could not generate a test identification card.',
            color: 'error'
        })
    } finally {
        isTestGenerating.value = false
    }
}

const cardToDelete = computed(() => {
    if (!cardPendingDelete.value) return null
    const existing = idcards.value.find((card) => card.id === cardPendingDelete.value.id)
    return existing || cardPendingDelete.value
})

const openCreate = () => {
    if (!props.event) {
        toast.add({
            title: 'No event selected',
            description: 'Select an event before creating identification templates.',
            color: 'warning'
        })
        return
    }
    isCreateOpen.value = true
}

const openEdit = (cardId) => {
    cardToEditId.value = cardId
    isEditOpen.value = true
}

const openDelete = (card) => {
    cardPendingDelete.value = card
    isDeleteOpen.value = true
}

const close = () => {
    isOpen.value = false
}

const closeDelete = () => {
    isDeleteOpen.value = false
    cardPendingDelete.value = null
}

const emitRefreshEvent = () => {
    emit('refresh-event')
}

const handleCardSaved = () => {
    toast.add({
        title: 'Saved',
        description: 'Identification template has been saved.',
        color: 'success',
        icon: 'i-lucide-check'
    })
}

const confirmDelete = async () => {
    if (!props.event?.id || !cardToDelete.value) return

    try {
        isDeleting.value = true

        const remaining = idcards.value.filter((card) => card.id !== cardToDelete.value.id)
        await updateEventIdcards(props.event.id, remaining)

        if (cardToDelete.value.templateFilename) {
            try {
                await $fetch(`/api/idcards/${encodeURIComponent(cardToDelete.value.templateFilename)}`, { method: 'DELETE' })
            } catch (err) {
                // Don't fail the whole operation if file deletion fails
            }
        }

        toast.add({
            title: 'Deleted',
            description: 'Identification template has been removed.',
            color: 'success',
            icon: 'i-lucide-check'
        })

        emitRefreshEvent()
    } catch (error) {
        console.error('Failed to delete identification template:', error)
        toast.add({
            title: 'Error',
            description: 'Failed to delete identification template.',
            color: 'error',
            icon: 'i-lucide-x'
        })
    } finally {
        isDeleting.value = false
        closeDelete()
    }
}
</script>

