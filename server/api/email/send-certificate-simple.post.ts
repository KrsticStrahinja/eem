import { serverSupabaseClient } from '#supabase/server'
import nodemailer from 'nodemailer'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  try {
    const body = await readBody(event)
    const { recipientEmail, eventId, attendeeId } = body

    if (!recipientEmail || !eventId || !attendeeId) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Missing required fields: recipientEmail, eventId, attendeeId' 
      })
    }

    const supabase = await serverSupabaseClient(event)

    // Fetch attendee data
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select('*')
      .eq('id', attendeeId)
      .single()

    if (attendeeError || !attendee) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Attendee not found' 
      })
    }

    // Fetch SMTP settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('smtp')
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

    // Generate PDF certificate
    const publicDir = path.join(process.cwd(), 'public')
    const certificatePath = path.join(publicDir, 'certificates', certificateData.certificateFilename)
    
    if (!fs.existsSync(certificatePath)) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Certificate template file not found on filesystem' 
      })
    }

    const pdfBytes = fs.readFileSync(certificatePath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const firstPage = pdfDoc.getPages()[0]
    const { width: pdfWidth, height: pdfHeight } = firstPage.getSize()

    // ===== NOVA JEDNOSTAVNA LOGIKA =====
    // Frontend preview dimensions (iz CertificateTemplateForm.vue)
    const previewWidth = 450  // estimatedPdfWidth iz komponente
    const previewHeight = 600 // iframeHeight iz komponente
    
    // Scale faktori: pixel → point
    const scaleX = pdfWidth / previewWidth   // 595.32 / 450 = 1.323
    const scaleY = pdfHeight / previewHeight // 841.92 / 600 = 1.403
    
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
          if (!field.formFieldId) return ''
          
          // Check if field should be accessed from top-level attendee properties
          // (email, first_name, last_name are stored at attendee level, not in data)
          if (eventResponse?.form && Array.isArray(eventResponse.form)) {
            const formField = eventResponse.form.find(f => f.id === field.formFieldId)
            
            if (formField?.name) {
              const fieldName = formField.name
              
              // Check if this is a top-level field (email, first_name, last_name, event_id)
              if (['email', 'first_name', 'last_name', 'event_id'].includes(fieldName)) {
                return attendee[fieldName] || ''
              }
            }
          }
          
          // If not top-level, try attendee.data access patterns
          if (!attendee.data) return ''
          
          // Try to find the field in the event form structure to get its name
          let fieldName = null
          if (eventResponse?.form && Array.isArray(eventResponse.form)) {
            const formField = eventResponse.form.find(f => f.id === field.formFieldId)
            if (formField?.name) {
              fieldName = formField.name
            }
          }
          
          // Try different access patterns in attendee.data:
          // 1. Direct field name if we found it in event form
          if (fieldName && attendee.data[fieldName]) {
            return attendee.data[fieldName]
          }
          
          // 2. Direct field ID access
          if (attendee.data[field.formFieldId]) {
            return attendee.data[field.formFieldId]
          }
          
          // 3. field_${id} format
          if (attendee.data[`field_${field.formFieldId}`]) {
            return attendee.data[`field_${field.formFieldId}`]
          }
          
          // 4. Search all data keys to find a match with the field ID
          for (const [key, value] of Object.entries(attendee.data)) {
            if (key.includes(field.formFieldId)) {
              return value
            }
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
        if (!fieldText) continue // Skip empty fields
        
        // Direktno mapiranje koordinata iz baze - JEDNOSTAVNO!
        const fieldX = (field.position.x || 0) * scaleX
        const fieldY = pdfHeight - ((field.position.y || 0) * scaleY) // Flip Y osa
        const fieldFontSize = (field.fontSize || 12) * scaleX

        firstPage.drawText(fieldText, {
          x: fieldX,
          y: fieldY,
          size: fieldFontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
      }
    } else {
      // Fallback to legacy format for backward compatibility
      // Draw name
      if (certificateData.name?.position) {
        const nameText = `${attendee.first_name} ${attendee.last_name}`
        const nameX = (certificateData.name.position.x || 0) * scaleX
        const nameY = pdfHeight - ((certificateData.name.position.y || 0) * scaleY)
        const nameFontSize = (certificateData.name.fontSize || 12) * scaleX

        firstPage.drawText(nameText, {
          x: nameX,
          y: nameY,
          size: nameFontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
      }
      
      // Draw licence if it exists
      if (certificateData.licence?.position) {
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
          const licenceX = (certificateData.licence.position.x || 0) * scaleX  
          const licenceY = pdfHeight - ((certificateData.licence.position.y || 0) * scaleY)
          const licenceFontSize = (certificateData.licence.fontSize || 12) * scaleX

          firstPage.drawText(licenceText, {
            x: licenceX,
            y: licenceY,
            size: licenceFontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
        }
      }
    }

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save()

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.encryption === 'ssl',
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    })

    // Prepare email content with variable replacement
    const recipientName = `${attendee.first_name} ${attendee.last_name}`
    
    const replacements = {
      '{{recipientName}}': recipientName,
      '{{recipientEmail}}': recipientEmail,
      '{{eventName}}': eventResponse.name,
      '{{companyName}}': smtpConfig.companyName || 'Event Organization',
      '{{firstName}}': attendee.first_name || '',
      '{{lastName}}': attendee.last_name || '',
      '{{fullName}}': recipientName,
      '{{email}}': attendee.email || recipientEmail,
      '{{phone}}': attendee.phone || '',
      '{{company}}': attendee.company || '',
      '{{registrationDate}}': attendee.created_at ? new Date(attendee.created_at).toLocaleDateString('sr-RS') : '',
      '{{currentDate}}': new Date().toLocaleDateString('sr-RS'),
      '{{currentYear}}': new Date().getFullYear().toString(),
    }

    let subject = emailTemplate.subject || 'Your Certificate'
    let htmlBody = emailTemplate.bodyHtml || '<p>Please find your certificate attached.</p>'

    // Replace variables in subject and body
    Object.entries(replacements).forEach(([placeholder, value]) => {
      subject = subject.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value)
      htmlBody = htmlBody.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value)
    })

    // Send email with PDF attachment
    const mailOptions = {
      from: `"${smtpConfig.companyName || 'Event Organization'}" <${smtpConfig.adminEmail}>`,
      to: recipientEmail,
      bcc: smtpConfig.silentEmail,
      subject: subject,
      html: htmlBody,
      attachments: [
        {
          filename: `certificate_${attendee.first_name}_${attendee.last_name}.pdf`,
          content: Buffer.from(modifiedPdfBytes),
          contentType: 'application/pdf'
        }
      ]
    }

    await transporter.sendMail(mailOptions)

    return { success: true, message: 'Certificate email sent successfully' }

  } catch (error) {
    console.error('Certificate email sending failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to send email: ${error.message}`
    })
  }
})
