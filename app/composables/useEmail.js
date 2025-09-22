export const useEmail = () => {
    const toast = useToast()

    const sendRegistrationEmail = async (attendee, eventId) => {
        try {
            const response = await $fetch('/api/email/send-registration', {
                method: 'POST',
                body: {
                    attendee: attendee,
                    eventId: eventId
                }
            })
            return response
        } catch (error) {
            console.error('Failed to send registration email:', error)
            throw error
        }
    }

    const sendCertificateEmail = async (attendee, eventId) => {
        try {
            const loadingToast = toast.add({
                title: 'Sending certificate email...',
                description: `Sending certificate to ${attendee.first_name} ${attendee.last_name}`,
                color: 'primary',
                icon: 'i-lucide-loader-2',
                timeout: 0
            })

            const response = await $fetch('/api/email/send-certificate', {
                method: 'POST',
                body: {
                    attendee: attendee,
                    eventId: eventId
                }
            })

            toast.remove(loadingToast)
            
            toast.add({
                title: 'Certificate sent!',
                description: `Certificate has been sent to ${attendee.email}`,
                color: 'success',
                icon: 'i-lucide-mail-check',
                timeout: 4000
            })

            return response
        } catch (error) {
            console.error('Failed to send certificate email:', error)
            
            toast.add({
                title: 'Failed to send certificate!',
                description: error.message || 'Please try again.',
                color: 'error',
                icon: 'i-lucide-exclamation-triangle',
                timeout: 4000
            })
            
            throw error
        }
    }

    const sendQRCodeEmail = async (attendee, eventId) => {
        try {
            const loadingToast = toast.add({
                title: 'Sending QR Code email...',
                description: `Sending QR code to ${attendee.first_name} ${attendee.last_name}`,
                color: 'primary',
                icon: 'i-lucide-loader-2',
                timeout: 0
            })

            const response = await $fetch('/api/email/send-qr', {
                method: 'POST',
                body: {
                    attendee: attendee,
                    eventId: eventId
                }
            })

            toast.remove(loadingToast)
            
            toast.add({
                title: 'QR Code sent!',
                description: `QR code has been sent to ${attendee.email}`,
                color: 'success',
                icon: 'i-lucide-mail-check',
                timeout: 4000
            })

            return response
        } catch (error) {
            console.error('Failed to send QR code email:', error)
            
            toast.add({
                title: 'Failed to send QR code!',
                description: error.message || 'Please try again.',
                color: 'error',
                icon: 'i-lucide-exclamation-triangle',
                timeout: 4000
            })
            
            throw error
        }
    }

    return {
        sendRegistrationEmail,
        sendCertificateEmail,
        sendQRCodeEmail
    }
}
