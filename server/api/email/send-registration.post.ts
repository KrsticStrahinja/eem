export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { attendee, eventId } = body

    if (!attendee || !eventId) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Missing attendee or eventId' 
      })
    }

    if (!attendee.email || !attendee.first_name || !attendee.last_name) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Missing attendee email, first name, or last name' 
      })
    }

    // Send email using the main email API
    const emailResponse = await $fetch('/api/email/send', {
      method: 'POST',
      body: {
        recipientEmail: attendee.email,
        recipientName: `${attendee.first_name} ${attendee.last_name}`,
        emailType: 'registration',
        eventId: eventId,
        attachments: [], // No attachments for registration email
        eventData: {
          firstName: attendee.first_name,
          lastName: attendee.last_name,
          fullName: `${attendee.first_name} ${attendee.last_name}`,
          email: attendee.email,
          phone: attendee.phone || '',
          company: attendee.company || '',
          registrationDate: new Date().toLocaleDateString('sr-RS')
        }
      }
    })

    return {
      success: true,
      recipient: attendee.email,
      attendeeName: `${attendee.first_name} ${attendee.last_name}`,
      emailType: 'registration',
      messageId: emailResponse.messageId
    }

  } catch (error) {
    console.error('Registration email sending failed:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Failed to send registration email: ${error.message}` 
    })
  }
})
