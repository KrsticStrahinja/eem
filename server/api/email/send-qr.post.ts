import QRCode from 'qrcode'
import nodemailer from 'nodemailer'
import { serverSupabaseClient } from '#supabase/server'

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

    if (!attendee.email || !attendee.id) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Missing attendee email or ID' 
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

    const emailTemplate = eventResponse.emails?.qr
    
    if (!emailTemplate || !emailTemplate.enabled) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'QR email template is not enabled or not found' 
      })
    }

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(attendee.id, {
      width: 512,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Convert data URL to buffer for attachment
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '')
    const qrCodeBuffer = Buffer.from(base64Data, 'base64')

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtp.host,
      port: smtpConfig.smtp.port,
      secure: smtpConfig.smtp.encryption === 'ssl',
      auth: {
        user: smtpConfig.smtp.username,
        pass: smtpConfig.smtp.password,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    // Prepare email content with variable replacements
    let subject = emailTemplate.subject || `QR Code - ${eventResponse.name}`
    let htmlContent = emailTemplate.bodyHtml || `<p>Your QR code for ${eventResponse.name}</p>`
    
    const replacements = {
      '{{recipientName}}': `${attendee.first_name} ${attendee.last_name}`,
      '{{recipientEmail}}': attendee.email,
      '{{eventName}}': eventResponse.name,
      '{{companyName}}': smtpConfig.companyName || 'Event Organization',
      '{{firstName}}': attendee.first_name || '',
      '{{lastName}}': attendee.last_name || '',
      '{{fullName}}': `${attendee.first_name} ${attendee.last_name}`,
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
      to: attendee.email,
      bcc: smtpConfig.silentEmail,
      subject: subject,
      html: htmlContent,
      attachments: [{
        filename: `qr_code_${attendee.first_name}_${attendee.last_name}.png`,
        content: qrCodeBuffer,
        contentType: 'image/png'
      }]
    }

    // Send email
    const info = await transporter.sendMail(mailOptions)

    return {
      success: true,
      recipient: attendee.email,
      attendeeName: `${attendee.first_name} ${attendee.last_name}`,
      emailType: 'qr',
      messageId: info.messageId
    }

  } catch (error) {
    console.error('QR email sending failed:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Failed to send QR email: ${error.message}` 
    })
  }
})
