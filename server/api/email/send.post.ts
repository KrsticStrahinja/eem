import nodemailer from 'nodemailer'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      recipientEmail, 
      recipientName, 
      emailType, 
      eventId, 
      attachments = [],
      eventData = {} 
    } = body

    if (!recipientEmail || !emailType || !eventId) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Missing required fields: recipientEmail, emailType, eventId' 
      })
    }

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Fetch SMTP settings from database
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('smtp')
      .eq('id', 1)
      .single()

    if (settingsError || !settingsData?.smtp) {
      throw createError({ 
        statusCode: 500, 
        statusMessage: 'SMTP configuration not found' 
      })
    }

    const smtpConfig = settingsData.smtp
    
    // Fetch event and email template
    const { data: eventResponse, error: eventError } = await supabase
      .from('events')
      .select('name, emails')
      .eq('id', eventId)
      .single()

    if (eventError || !eventResponse) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Event not found' 
      })
    }

    const emailTemplate = eventResponse.emails?.[emailType]
    
    if (!emailTemplate || !emailTemplate.enabled) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: `Email template for ${emailType} is not enabled or not found` 
      })
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtp.host,
      port: smtpConfig.smtp.port,
      secure: smtpConfig.smtp.encryption === 'ssl', // true for SSL, false for TLS
      auth: {
        user: smtpConfig.smtp.username,
        pass: smtpConfig.smtp.password,
      },
      tls: {
        rejectUnauthorized: false // For self-signed certificates
      }
    })

    // Prepare email content with variable replacements
    let subject = emailTemplate.subject || `${emailType} - ${eventResponse.name}`
    let htmlContent = emailTemplate.bodyHtml || `<p>This is your ${emailType} for ${eventResponse.name}</p>`
    
    // Replace variables in subject and content
    const replacements = {
      '{{recipientName}}': recipientName || recipientEmail.split('@')[0],
      '{{recipientEmail}}': recipientEmail,
      '{{eventName}}': eventResponse.name,
      '{{companyName}}': smtpConfig.companyName || 'Event Organization',
      '{{firstName}}': eventData.firstName || '',
      '{{lastName}}': eventData.lastName || '',
      '{{fullName}}': eventData.fullName || (eventData.firstName && eventData.lastName ? `${eventData.firstName} ${eventData.lastName}` : recipientName || ''),
      '{{email}}': eventData.email || recipientEmail,
      '{{phone}}': eventData.phone || '',
      '{{company}}': eventData.company || '',
      '{{registrationDate}}': eventData.registrationDate || new Date().toLocaleDateString('sr-RS'),
      '{{currentDate}}': new Date().toLocaleDateString('sr-RS'),
      '{{currentYear}}': new Date().getFullYear().toString(),
    }

    // Apply replacements
    Object.entries(replacements).forEach(([placeholder, value]) => {
      subject = subject.replace(new RegExp(placeholder, 'g'), value)
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value)
    })

    // Prepare mail options
    const mailOptions = {
      from: {
        name: smtpConfig.companyName || 'Event Organization',
        address: smtpConfig.adminEmail
      },
      to: recipientEmail,
      bcc: smtpConfig.silentEmail, // Silent email goes to BCC as required
      subject: subject,
      html: htmlContent,
      attachments: attachments
    }

    // Send email
    const info = await transporter.sendMail(mailOptions)

    return {
      success: true,
      messageId: info.messageId,
      recipient: recipientEmail,
      emailType: emailType,
      eventName: eventResponse.name
    }

  } catch (error) {
    console.error('Email sending failed:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Failed to send email: ${error.message}` 
    })
  }
})
