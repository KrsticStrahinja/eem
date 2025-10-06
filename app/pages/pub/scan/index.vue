<template>
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div class="w-full max-w-lg">
            <UCard class="shadow-sm">
                <template #header>
                    <div class="text-center">
                        <h1 class="text-xl font-semibold text-gray-900">QR Code Scanner</h1>
                        <p class="text-sm text-gray-500 mt-1">Scan attendee QR codes for check-in</p>
                    </div>
                </template>

                <!-- Video Scanner -->
                <div class="relative bg-black rounded-lg overflow-hidden" style="aspect-ratio: 1;">
                    <video
                        ref="videoRef"
                        class="w-full h-full object-cover"
                        autoplay
                        muted
                        playsinline
                    ></video>

                    <!-- Scan overlay -->
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div class="w-64 h-64 border-4 border-green-400 rounded-lg opacity-50 animate-pulse"></div>
                    </div>

                    <!-- Loading -->
                    <div v-if="isLoading" class="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <div class="text-white text-center">
                            <UIcon name="i-lucide-loader-2" class="animate-spin h-10 w-10 mx-auto mb-2" />
                            <p class="text-sm">Initializing camera...</p>
                        </div>
                    </div>

                    <!-- Processing -->
                    <div v-if="isProcessing" class="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center">
                        <div class="bg-white rounded-lg p-4 shadow-lg">
                            <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-primary mx-auto" />
                        </div>
                    </div>
                </div>

                <template #footer>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div :class="[isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-400']" class="w-2 h-2 rounded-full"></div>
                            <span class="text-sm text-gray-600">
                                {{ isScanning ? 'Ready to scan' : 'Camera off' }}
                            </span>
                        </div>
                        
                        <UButton
                            v-if="hasMultipleCameras"
                            @click="switchCamera"
                            size="xs"
                            variant="ghost"
                            :disabled="isLoading || !isScanning"
                            icon="i-lucide-rotate-cw"
                        >
                            Switch
                        </UButton>
                    </div>
                </template>
            </UCard>

            <!-- Error -->
            <div v-if="error" class="mt-4">
                <UAlert
                    color="red"
                    variant="soft"
                    :title="error"
                    :close-button="{ icon: 'i-lucide-x', color: 'gray', variant: 'link' }"
                    @close="clearError"
                />
            </div>
        </div>

        <!-- Success Popup (Centered Overlay) -->
        <div v-if="showSuccessModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div class="w-full max-w-md">
                <UCard class="rounded-md">
                    <div class="space-y-4 py-2">
                        <div class="flex justify-center">
                            <UIcon name="i-lucide-check" class="w-12 h-12 text-green-600" />
                        </div>
                        <div v-if="attendee" class="text-center">
                            <p class="text-2xl font-bold text-gray-900">
                                {{ attendee.first_name }} {{ attendee.last_name }}
                            </p>
                        </div>
                        <p class="text-xs text-gray-500 text-center">Closing in {{ autoCloseCountdown }}...</p>
                    </div>
                </UCard>
            </div>
        </div>
    </div>
</template>

<script setup>
// Meta
definePageMeta({
    layout: 'public'
})

// Imports
import QrScanner from 'qr-scanner'
import QRCode from 'qrcode'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { useSettings } from '~/composables/database/useSettings'
import { useEvents } from '~/composables/database/useEvents'

// Refs
const videoRef = ref(null)
const qrScanner = ref(null)

// Reactive state
const isLoading = ref(false)
const isScanning = ref(false)
const isProcessing = ref(false)
const scanResult = ref('')
const error = ref('')
const hasMultipleCameras = ref(false)
const currentCameraIndex = ref(0)
const availableCameras = ref([])
const attendee = ref(null)
const eventId = ref(null)
const showSuccessModal = ref(false)
const autoCloseCountdown = ref(3)
const autoCloseTimer = ref(null)
const wasAlreadyAttended = ref(false)

const cachedEvent = ref(null)

// Composables
const supabase = useSupabaseClient()
const { fetchSettings } = useSettings()
const { updateEventAttended, getEventById } = useEvents()

const PREVIEW_BASE = {
    width: 423,
    height: 600
}

const getEditorScale = (pageWidth, pageHeight) => {
    const baseWidth = PREVIEW_BASE.width
    const baseHeight = PREVIEW_BASE.height
    return {
        scaleX: pageWidth / baseWidth,
        scaleY: pageHeight / baseHeight
    }
}

const normalizeValue = value => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (Array.isArray(value)) return value.map(item => normalizeValue(item)).filter(Boolean).join(', ')
    if (typeof value === 'object') return Object.values(value).map(item => normalizeValue(item)).filter(Boolean).join(', ')
    return ''
}

const getFormDefinition = eventData => (Array.isArray(eventData?.form) ? eventData.form : [])

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

const resolveFieldText = async (field, attendeeData, eventData, scannedUuid) => {
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
            if (!scannedUuid) return ''
            try {
                const dataUrl = await QRCode.toDataURL(scannedUuid, {
                    margin: 0,
                    scale: 4,
                    errorCorrectionLevel: 'H'
                })
                return dataUrl
            } catch (err) {
                console.error('Failed to generate QR code:', err)
                return normalizeValue(scannedUuid)
            }
        }
        default:
            return ''
    }
}

const matchesCardCondition = (card, attendeeData, eventData) => {
    if (!card?.condition?.field_id) return true
    const value = getAttendeeFieldValue(card.condition.field_id, attendeeData, eventData)
    if (!value) return false
    return normalizeValue(value) === normalizeValue(card.condition.value)
}

const pickIdentificationCard = (eventData, attendeeData) => {
    const cards = Array.isArray(eventData?.idcard) ? eventData.idcard : []
    if (!cards.length) return null
    const matched = cards.find(card => matchesCardCondition(card, attendeeData, eventData))
    return matched || cards[0]
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

    const baseSize = field.fontSize || 64
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

const printPdfBytes = async pdfBytes => {
    if (typeof window === 'undefined') return

    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(blob)
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = blobUrl
    document.body.appendChild(iframe)

    const cleanup = () => {
        setTimeout(() => {
            document.body.removeChild(iframe)
            URL.revokeObjectURL(blobUrl)
        }, 1000)
    }

    iframe.onload = async () => {
        try {
            if (window.electronAPI?.printSilent) {
                await window.electronAPI.printSilent()
            } else {
                iframe.contentWindow?.focus()
                iframe.contentWindow?.print()
            }
        } catch (err) {
            console.error('Failed to trigger print dialog:', err)
        } finally {
            cleanup()
        }
    }
}

const renderIdentificationCard = async (attendeeData, eventData, scannedUuid) => {
    if (typeof window === 'undefined') return
    const card = pickIdentificationCard(eventData, attendeeData)
    if (!card || !card.templateUrl) {
        console.warn('No identification template configured for this event')
        return
    }

    try {
        const response = await fetch(card.templateUrl)
        if (!response.ok) {
            throw new Error(`Failed to load idcard template: ${response.status}`)
        }
        const templateArrayBuffer = await response.arrayBuffer()
        const pdfDoc = await PDFDocument.load(templateArrayBuffer)
        const pages = pdfDoc.getPages()
        if (!pages.length) {
            console.warn('Identification template does not contain any pages')
            return
        }

        const firstPage = pages[0]
        const { width: pdfWidth, height: pdfHeight } = firstPage.getSize()
        const { scaleX, scaleY } = getEditorScale(pdfWidth, pdfHeight)
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        if (Array.isArray(card.fields)) {
            for (const field of card.fields) {
                if (!field?.position) continue
                const text = await resolveFieldText(field, attendeeData, eventData, scannedUuid)
                if (!text) continue

                const pdfX = (field.position.x || 0) * scaleX
                const pdfYFromTop = (field.position.y || 0) * scaleY
                const drawY = pdfHeight - pdfYFromTop

                if (field.type === 'qr_code') {
                    try {
                        await embedQrCode(firstPage, pdfDoc, text, pdfX, drawY, field, scaleX, scaleY)
                        continue
                    } catch (err) {
                        console.error('Failed to draw QR code on identification card:', err)
                        firstPage.drawText(scannedUuid, {
                            x: pdfX,
                            y: drawY - 12,
                            size: 12,
                            font,
                            color: rgb(0, 0, 0)
                        })
                        continue
                    }
                }

                const fontSize = (field.fontSize || 12) * Math.min(scaleX, scaleY)
                const adjustedDrawY = drawY - fontSize

                firstPage.drawText(text, {
                    x: pdfX,
                    y: adjustedDrawY,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0)
                })
            }
        }

        const pdfBytes = await pdfDoc.save()
        await printPdfBytes(pdfBytes)
    } catch (err) {
        console.error('Failed to generate identification card:', err)
    }
}

const getActiveEvent = async () => {
    if (!eventId.value) return null
    if (cachedEvent.value?.id === eventId.value) {
        return cachedEvent.value
    }
    try {
        const eventData = await getEventById(eventId.value)
        if (eventData) {
            cachedEvent.value = eventData
        }
        return eventData
    } catch (err) {
        console.error('Failed to fetch event details:', err)
        return null
    }
}

// Methods
const initializeScanner = async () => {
    try {
        isLoading.value = true
        error.value = ''

        if (!videoRef.value) {
            throw new Error('Video element not found')
        }

        availableCameras.value = await QrScanner.listCameras()
        hasMultipleCameras.value = availableCameras.value.length > 1

        qrScanner.value = new QrScanner(
            videoRef.value,
            result => {
                handleScanResult(result.data)
            },
            {
                highlightScanRegion: true,
                highlightCodeOutline: true,
                returnDetailedScanResult: true,
                maxScansPerSecond: 5
            }
        )

        await startScanning()

    } catch (err) {
        console.error('Failed to initialize scanner:', err)
        error.value = err.message || 'Failed to initialize camera. Please check camera permissions.'
    } finally {
        isLoading.value = false
    }
}

const startScanning = async () => {
    if (!qrScanner.value) {
        console.error('Scanner not initialized')
        return
    }

    try {
        error.value = ''
        await qrScanner.value.start()
        isScanning.value = true
        console.log('Scanner started successfully')
    } catch (err) {
        console.error('Failed to start scanning:', err)
        error.value = err.message || 'Failed to start camera. Please allow camera access.'
        isScanning.value = false
    }
}

const stopScanning = async () => {
    if (qrScanner.value && isScanning.value) {
        await qrScanner.value.stop()
        isScanning.value = false
        console.log('Scanner stopped')
    }
}

const switchCamera = async () => {
    if (!hasMultipleCameras.value || availableCameras.value.length === 0) {
        console.log('No multiple cameras available')
        return
    }

    try {
        isLoading.value = true

        currentCameraIndex.value = (currentCameraIndex.value + 1) % availableCameras.value.length
        const nextCamera = availableCameras.value[currentCameraIndex.value]

        console.log('Switching to camera:', nextCamera)

        await qrScanner.value.setCamera(nextCamera.id)

    } catch (err) {
        console.error('Failed to switch camera:', err)
        error.value = 'Failed to switch camera'
    } finally {
        isLoading.value = false
    }
}

const handleScanResult = async (scannedUuid) => {
    if (isProcessing.value) {
        console.log('Already processing a scan, ignoring...')
        return
    }

    if (scanResult.value === scannedUuid) {
        console.log('Same UUID scanned, ignoring duplicate...')
        return
    }

    isProcessing.value = true
    error.value = ''
    attendee.value = null
    scanResult.value = scannedUuid

    try {
        if (!eventId.value) {
            throw new Error('No event configured for scanning')
        }

        const { data: attendeeData, error: attendeeError } = await supabase
            .from('attendees')
            .select('id, first_name, last_name, email, events, data')
            .eq('id', scannedUuid)
            .single()

        if (attendeeError || !attendeeData) {
            throw new Error('Attendee not found in database')
        }

        if (!Array.isArray(attendeeData.events) || !attendeeData.events.includes(eventId.value)) {
            throw new Error(`${attendeeData.first_name || ''} ${attendeeData.last_name || ''} is not registered for this event`)
        }

        const currentEvent = await getActiveEvent()
        if (!currentEvent) {
            throw new Error('Event not found')
        }

        await renderIdentificationCard(attendeeData, currentEvent, scannedUuid)

        const currentAttended = currentEvent.attended || []
        if (currentAttended.includes(scannedUuid)) {
            attendee.value = attendeeData
            wasAlreadyAttended.value = true
            showSuccessModal.value = true
            await stopScanning()
            startAutoCloseCountdown()
            return
        }

        const newAttended = [...currentAttended, scannedUuid]
        await updateEventAttended(eventId.value, newAttended)
        cachedEvent.value = { ...currentEvent, attended: newAttended }

        attendee.value = attendeeData
        wasAlreadyAttended.value = false
        showSuccessModal.value = true
        await stopScanning()
        startAutoCloseCountdown()

        console.log('Successfully marked attendance for:', attendeeData.first_name, attendeeData.last_name)

    } catch (err) {
        console.error('Error processing scan:', err)
        error.value = err.message || 'Failed to process QR code'
    } finally {
        isProcessing.value = false
    }
}

const startAutoCloseCountdown = () => {
    if (autoCloseTimer.value) {
        clearInterval(autoCloseTimer.value)
        autoCloseTimer.value = null
    }

    autoCloseCountdown.value = 3

    autoCloseTimer.value = setInterval(() => {
        autoCloseCountdown.value--

        if (autoCloseCountdown.value <= 0) {
            clearInterval(autoCloseTimer.value)
            autoCloseTimer.value = null
            window.location.reload()
        }
    }, 1000)
}

const clearResult = () => {
    if (autoCloseTimer.value) {
        clearInterval(autoCloseTimer.value)
        autoCloseTimer.value = null
    }

    scanResult.value = ''
    attendee.value = null
    showSuccessModal.value = false
    autoCloseCountdown.value = 3
    wasAlreadyAttended.value = false
    startScanning()
}

const clearError = () => {
    error.value = ''
}

// Lifecycle
onMounted(async () => {
    console.log('Component mounted, initializing scanner...')

    showSuccessModal.value = false
    attendee.value = null
    scanResult.value = ''
    autoCloseCountdown.value = 3
    if (autoCloseTimer.value) {
        clearInterval(autoCloseTimer.value)
        autoCloseTimer.value = null
    }

    await nextTick()

    try {
        const settings = await fetchSettings()
        if (!settings?.registration?.event_id) {
            error.value = 'No event configured in settings. Please configure an event first.'
            console.error('No event_id in settings.registration')
            return
        }

        eventId.value = settings.registration.event_id
        console.log('Event ID loaded from settings:', eventId.value)

        cachedEvent.value = await getActiveEvent()

        const hasCamera = await QrScanner.hasCamera()
        if (!hasCamera) {
            error.value = 'No camera found on this device'
            console.error('No camera detected')
            return
        }

        await initializeScanner()
    } catch (err) {
        console.error('Failed to initialize:', err)
        error.value = err.message || 'Failed to initialize scanner'
    }
})

onBeforeUnmount(async () => {
    console.log('Component unmounting, cleaning up scanner...')

    if (autoCloseTimer.value) {
        clearInterval(autoCloseTimer.value)
        autoCloseTimer.value = null
    }

    if (qrScanner.value) {
        try {
            await qrScanner.value.destroy()
            qrScanner.value = null
            console.log('Scanner destroyed successfully')
        } catch (err) {
            console.error('Error destroying scanner:', err)
        }
    }
})
</script>