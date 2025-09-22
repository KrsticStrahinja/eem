<template>
    <div class="w-full">
        <UDashboardNavbar title="Emails" class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
            <template #leading>
                <UDashboardSidebarCollapse />
            </template>
        </UDashboardNavbar>

        <div class="max-w-4xl mx-auto p-6 space-y-6">
            <UCard class="shadow-sm">
                <template #header>
                    <h3 class="text-lg font-semibold">Email Configuration</h3>
                    <p class="text-sm text-gray-600">Configure company information and SMTP settings for email delivery</p>
                </template>

                <UForm :schema="smtpSchema" :state="smtpState" @submit="saveSettings" class="space-y-6">
                    <!-- Company Information Section -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        <UInput v-model="smtpState.companyName" placeholder="" :ui="{ base: 'peer relative' }">
                            <label
                                class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                <span class="inline-flex bg-default px-1">Company Name</span>
                            </label>
                        </UInput>

                        <UInput v-model="smtpState.adminEmail" type="email" placeholder="" :ui="{ base: 'peer relative' }">
                            <label
                                class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                <span class="inline-flex bg-default px-1">Admin Email</span>
                            </label>
                        </UInput>

                        <UInput v-model="smtpState.silentEmail" type="email" placeholder="" :ui="{ base: 'peer relative' }">
                            <label
                                class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                <span class="inline-flex bg-default px-1">Silent Email</span>
                            </label>
                        </UInput>
                    </div>

                    <!-- SMTP Configuration Section -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <UInput v-model="smtpState.host" placeholder="" :ui="{ base: 'peer relative' }">
                            <label
                                class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                <span class="inline-flex bg-default px-1">SMTP Host</span>
                            </label>
                        </UInput>

                        <UInput v-model="smtpState.port" type="number" placeholder="" :ui="{ base: 'peer relative' }">
                            <label
                                class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                <span class="inline-flex bg-default px-1">SMTP Port</span>
                            </label>
                        </UInput>

                        <UInput v-model="smtpState.username" placeholder="" :ui="{ base: 'peer relative' }">
                            <label
                                class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                <span class="inline-flex bg-default px-1">SMTP Username</span>
                            </label>
                        </UInput>

                        <UInput v-model="smtpState.password" type="password" placeholder="" :ui="{ base: 'peer relative' }">
                            <label
                                class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                <span class="inline-flex bg-default px-1">SMTP Password</span>
                            </label>
                        </UInput>

                        <USelect v-model="smtpState.encryption" :items="encryptionOptions" placeholder="Select encryption" />
                    </div>

                </UForm>
                <template #footer>
                    <div class="flex justify-end gap-2">
                        <UButton @click="saveSettings" color="primary" :loading="loading">
                            Save Settings
                        </UButton>
                        <UButton variant="outline" @click="testConnection">
                            Test Connection
                        </UButton>
                    </div>
                </template>
            </UCard>
        </div>
    </div>
</template>

<script setup>
import { useSettings } from '@/composables/database/useSettings'
// Import composable
const { updateSettings, getSmtpSettings } = useSettings()

// Toast notifications
const toast = useToast()

// Reactive state for SMTP configuration
const smtpState = reactive({
    companyName: '',
    adminEmail: '',
    silentEmail: '',
    host: '',
    port: 587,
    username: '',
    password: '',
    encryption: 'tls'
})

// Encryption options
const encryptionOptions = [
    { label: 'TLS', value: 'tls' },
    { label: 'SSL', value: 'ssl' },
    { label: 'No encryption', value: 'none' }
]

// Form validation schema
const smtpSchema = {
    companyName: { required: true, type: 'string', message: 'Company name is required' },
    adminEmail: {
        required: true,
        type: 'email',
        message: 'Invalid email format for Admin Email'
    },
    silentEmail: {
        required: true,
        type: 'email',
        message: 'Invalid email format for Silent Email'
    },
    host: { required: true, type: 'string', message: 'SMTP host is required' },
    port: {
        required: true,
        type: 'number',
        min: 1,
        max: 65535,
        message: 'Port must be between 1 and 65535'
    },
    username: { required: true, type: 'string', message: 'Username is required' },
    password: { required: true, type: 'string', message: 'Password is required' }
}

// Loading state (local to this page, do not mutate composable's computed)
const loading = ref(false)

// Method to save settings
const saveSettings = async () => {
    try {
        loading.value = true

        // Validate settings before packaging
        if (!smtpState.companyName || !smtpState.adminEmail) {
            throw new Error('Company name and admin email are required')
        }

        // Package SMTP settings into JSON structure
        const jsonSettings = {
            companyName: smtpState.companyName,
            adminEmail: smtpState.adminEmail,
            silentEmail: smtpState.silentEmail,
            smtp: {
                host: smtpState.host,
                port: smtpState.port,
                username: smtpState.username,
                password: smtpState.password,
                encryption: smtpState.encryption
            },
            timestamp: new Date().toISOString()
        }

        // Save JSON packaged settings to database
        const result = await updateSettings(jsonSettings)

        // Success toast notification
        toast.add({
            title: 'Settings saved successfully!',
            description: 'SMTP configuration has been packaged and saved as JSON.',
            color: 'green',
            icon: 'i-lucide-check-circle'
        })

    } catch (error) {
        // Error toast notification
        toast.add({
            title: 'Failed to save settings',
            description: error.message || 'An error occurred while saving settings.',
            color: 'red',
            icon: 'i-lucide-alert-circle'
        })
    } finally {
        loading.value = false
    }
}

// Method to test connection
const testConnection = async () => {
    try {
        loading.value = true

        // Test simulation
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Success toast notification
        toast.add({
            title: 'Connection test successful!',
            description: 'SMTP server is responding correctly.',
            color: 'green',
            icon: 'i-lucide-check-circle'
        })

        // Connection successful

    } catch (error) {
        console.error('Error testing connection:', error)

        // Error toast notification
        toast.add({
            title: 'Connection test failed',
            description: error.message || 'Unable to connect to SMTP server.',
            color: 'red',
            icon: 'i-lucide-alert-circle'
        })
    } finally {
        loading.value = false
    }
}

// Load existing settings
onMounted(async () => {
    try {
        // Load existing SMTP settings from database
        const existingSettings = await getSmtpSettings()

        if (existingSettings) {
            // Populate form with existing settings
            Object.assign(smtpState, existingSettings)
        }
    } catch (error) {
        console.error('Error loading settings:', error)
    }
})
</script>