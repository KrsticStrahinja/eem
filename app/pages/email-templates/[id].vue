<template>
    <div class="w-full">
        <UDashboardNavbar title="Email Templates" class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
            <template #leading>
                <UDashboardSidebarCollapse />
            </template>
        </UDashboardNavbar>
        <div class="max-w-4xl mx-auto p-6 space-y-6">
            <TemplateEditor
                :title="'Registration Email'"
                :description="'Subject and content for the registration confirmation email'"
                v-model="registrationModel"
                :loading="loadingByKey.registration"
                @save="(state) => saveTemplate('registration', state)"
            />

            <TemplateEditor
                :title="'Certificate Email'"
                :description="'Subject and content for the certificate email'"
                v-model="certificateModel"
                :loading="loadingByKey.certificate"
                @save="(state) => saveTemplate('certificate', state)"
            />

            <TemplateEditor
                :title="'QR Code Email'"
                :description="'Subject and content for the QR code email'"
                v-model="qrModel"
                :loading="loadingByKey.qr"
                @save="(state) => saveTemplate('qr', state)"
            />
        </div>
    </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import TemplateEditor from '@/components/email/TemplateEditor.vue'
import { useEvents } from '@/composables/database/useEvents'

const route = useRoute()
const toast = useToast()
const supabase = useSupabaseClient()
const { getEventById, updateEventEmails } = useEvents()

const loadingByKey = reactive({ registration: false, certificate: false, qr: false })

// Form state for metadata and v-model for editor
const formState = reactive({
    id: null
})
const registrationModel = ref({ enabled: true, subject: '', bodyHtml: '' })
const certificateModel = ref({ enabled: false, subject: '', bodyHtml: '' })
const qrModel = ref({ enabled: false, subject: '', bodyHtml: '' })

// No inline editor logic; handled by TemplateEditor component

// Load template by id (or create default)
onMounted(async () => {
    try {
        loadingByKey.registration = true
        loadingByKey.certificate = true
        loadingByKey.qr = true
        const idParam = route.params.id
        if (idParam) {
            const event = await getEventById(idParam)
            formState.id = event?.id || null
            const emails = event?.emails || {}
            const reg = emails['registration'] || {}
            registrationModel.value.enabled = reg.enabled ?? true
            registrationModel.value.subject = reg.subject || ''
            registrationModel.value.bodyHtml = reg.bodyHtml || reg.body_html || ''

            const cert = emails['certificate'] || {}
            certificateModel.value.enabled = cert.enabled ?? false
            certificateModel.value.subject = cert.subject || ''
            certificateModel.value.bodyHtml = cert.bodyHtml || cert.body_html || ''

            const qr = emails['qr'] || {}
            qrModel.value.enabled = qr.enabled ?? false
            qrModel.value.subject = qr.subject || ''
            qrModel.value.bodyHtml = qr.bodyHtml || qr.body_html || ''
        }
    } catch (err) {
        console.error('Failed to load template', err)
        toast.add({ title: 'Failed to load template', description: 'Please try refreshing the page or check your connection', color: 'error', icon: 'i-lucide-alert-circle' })
    } finally {
        loadingByKey.registration = false
        loadingByKey.certificate = false
        loadingByKey.qr = false
    }
})

const saveTemplate = async (key, state) => {
    try {
        loadingByKey[key] = true
        // Save into events.emails under the selected key
        await updateEventEmails(formState.id, key, {
            enabled: state.enabled,
            subject: state.subject,
            bodyHtml: state.bodyHtml
        })

        toast.add({ title: 'Template saved', description: 'Your email template has been successfully saved', color: 'success', icon: 'i-lucide-check-circle' })
    } catch (err) {
        toast.add({ title: 'Failed to save template', description: err?.message, color: 'error', icon: 'i-lucide-alert-circle' })
    } finally {
        loadingByKey[key] = false
    }
}
</script>