import { serverSupabaseClient } from '#supabase/server'
import nodemailer from 'nodemailer'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { readFile } from 'fs/promises'
import path from 'path'

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
      .select('name, emails, form')
      .eq('id', eventId)
      .single()

    if (eventError || !eventResponse) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Event not found' 
      })
    }

    const emailTemplate = eventResponse.emails?.certificate
    
    if (!emailTemplate || !emailTemplate.enabled) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Certificate email template is not enabled or not found' 
      })
    }
    
    // Get certificate data for this event

    // First, let's see ALL certificates for this event
    const { data: allCertificates, error: allError } = await supabase
      .from('certificates')
      .select('id, event, data, created_at')
      .eq('event', eventId)
      .order('id', { ascending: false })
    
    const { data: certificateRows, error: certificateError } = await supabase
      .from('certificates')
      .select('id, event, data, created_at')
      .eq('event', eventId)
      .order('id', { ascending: false })
      .limit(1)
    
    if (certificateError || !certificateRows || certificateRows.length === 0) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Certificate template not found for this event' 
      })
    }

    const certificateData = certificateRows[0].data

    if (!certificateData || !certificateData.certificateFilename) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Certificate template file not found' 
      })
    }

    // Form field data is correctly structured and accessible

    // Generate personalized certificate (inline PDF generation)
    const projectRoot = process.cwd()
    const certificatePath = path.join(projectRoot, 'public', 'certificates', certificateData.certificateFilename)
    
    let pdfBytes
    try {
      pdfBytes = await readFile(certificatePath)
    } catch (error) {
      console.error('Failed to read certificate file:', error)
      throw createError({ statusCode: 404, statusMessage: 'Certificate file not found' })
    }

    // Load and modify PDF (EXACT COPY FROM generate.post.ts)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    
    // Get PDF page dimensions
    const { width: pdfWidth, height: pdfHeight } = firstPage.getSize()
    
    // Use exact same scaling logic as generate.post.ts and builder
    const PREVIEW_BASE_WIDTH = 423
    const PREVIEW_BASE_HEIGHT = 600
    
    const scaleX = pdfWidth / PREVIEW_BASE_WIDTH
    const scaleY = pdfHeight / PREVIEW_BASE_HEIGHT

    // Load a standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Helper function to get field text content
    const getFieldText = (field) => {
      switch (field.type) {
        case 'name':
          return `${attendee.first_name} ${attendee.last_name}`
        case 'custom_text':
          return field.customText || ''
        case 'form_field':
          // Form fields are stored with field.name or field_${field.id} as keys
          if (!field.formFieldId) {
            return ''
          }

          // Find the form field definition
          let formField = null
          if (eventResponse?.form && Array.isArray(eventResponse.form)) {
            formField = eventResponse.form.find(f => f.id === field.formFieldId)
          }
          
          if (!formField?.name) {
            return ''
          }
          
          const fieldName = formField.name

          // Check if this is a top-level field (email, first_name, last_name, event_id)
          if (['email', 'first_name', 'last_name', 'event_id'].includes(fieldName)) {
            const value = attendee[fieldName] || ''
            return value
          }
          
          // Try attendee.data access
          if (!attendee.data) {
            return ''
          }
          
          // Direct field name access
          if (attendee.data[fieldName]) {
            const value = attendee.data[fieldName]
            return value
          }

          return ''
        case 'current_date':
          return new Date().toLocaleDateString('sr-RS')
        case 'event_name':
          return eventResponse.name || 'Event'
        default:
          return ''
      }
    }

    // Process dynamic fields (new format)
    if (certificateData.fields && Array.isArray(certificateData.fields)) {
      for (const field of certificateData.fields) {
        if (!field.position) continue
        
        const fieldText = getFieldText(field)
        if (!fieldText) continue
        
        const pdfFontSize = (field.fontSize || 12) * Math.min(scaleX, scaleY)
        const pdfX = (field.position.x || 0) * scaleX
        const pdfYFromTop = (field.position.y || 0) * scaleY
        const drawY = pdfHeight - pdfYFromTop - pdfFontSize

        firstPage.drawText(fieldText, {
          x: pdfX,
          y: drawY,
          size: pdfFontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
      }
    } else {
      // Fallback to legacy format for backward compatibility
      // Add name to the PDF
      if (certificateData.name && certificateData.name.position) {
        const nameText = `${attendee.first_name} ${attendee.last_name}`
        const pdfFontSize = (certificateData.name.fontSize || 12) * Math.min(scaleX, scaleY)
        const pdfX = (certificateData.name.position.x || 0) * scaleX
        const pdfYFromTop = (certificateData.name.position.y || 0) * scaleY
        const drawY = pdfHeight - pdfYFromTop - pdfFontSize

        firstPage.drawText(nameText, {
          x: pdfX,
          y: drawY,
          size: pdfFontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
      }
      
      // Add licence to the PDF
      if (certificateData.licence && certificateData.licence.position) {
        let licenceText = ''
        
        if (attendee.data) {
          const licenceFields = ['licence', 'license', 'certificate_number', 'license_number', 'licence_number']
          for (const field of licenceFields) {
            if (attendee.data[field]) {
              licenceText = attendee.data[field]
              break
            }
          }
        }
        
        if (licenceText) {
          const pdfFontSize = (certificateData.licence.fontSize || 12) * Math.min(scaleX, scaleY)
          const pdfX = (certificateData.licence.position.x || 0) * scaleX
          const pdfYFromTop = (certificateData.licence.position.y || 0) * scaleY
          const drawY = pdfHeight - pdfYFromTop - pdfFontSize

          firstPage.drawText(licenceText, {
            x: pdfX,
            y: drawY,
            size: pdfFontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
        }
      }
    }
    
    // Serialize the PDF
    const modifiedPdfBytes = await pdfDoc.save()

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
    let subject = emailTemplate.subject || `Certificate - ${eventResponse.name}`
    let htmlContent = emailTemplate.bodyHtml || `<p>Your certificate for ${eventResponse.name}</p>`
    
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
        filename: `certificate_${attendee.first_name}_${attendee.last_name}.pdf`,
        content: Buffer.from(modifiedPdfBytes),
        contentType: 'application/pdf'
      }]
    }

    // Send email
    const info = await transporter.sendMail(mailOptions)

    return {
      success: true,
      recipient: attendee.email,
      attendeeName: `${attendee.first_name} ${attendee.last_name}`,
      emailType: 'certificate',
      messageId: info.messageId
    }

  } catch (error) {
    console.error('Certificate email sending failed:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Failed to send certificate email: ${error.message}` 
    })
  }
})
