import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { readFile } from 'fs/promises'
import path from 'path'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { attendee, certificate, eventData } = body

    if (!attendee || !certificate) {
      throw createError({ statusCode: 400, statusMessage: 'Missing attendee or certificate data' })
    }

    // Validate required fields
    if (!attendee.first_name || !attendee.last_name) {
      throw createError({ statusCode: 400, statusMessage: 'Missing attendee name information' })
    }

    if (!certificate.certificateFilename) {
      throw createError({ statusCode: 400, statusMessage: 'Missing certificate file' })
    }

    // Load the original PDF
    // In preview/production mode, files are served from .output/public/
    const projectRoot = process.cwd()
    const isPreview = projectRoot.includes('.output')
    const actualProjectRoot = isPreview ? path.resolve(projectRoot, '..') : projectRoot
    const certificatePath = path.join(actualProjectRoot, '.output', 'public', 'certificates', certificate.certificateFilename)
    
    let pdfBytes
    try {
      pdfBytes = await readFile(certificatePath)
    } catch (error) {
      console.error('Failed to read certificate file:', error)
      throw createError({ statusCode: 404, statusMessage: 'Certificate file not found' })
    }

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes)
    
    // Get the first page (assuming single page certificate)
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    
    // Get PDF page dimensions
    const { width: pdfWidth, height: pdfHeight } = firstPage.getSize()
    
    // PDF is now shown at 100% zoom (1:1), so no scaling needed
    // Frontend uses actual PDF dimensions (595x842 for A4)
    const frontendPdfWidth = 423
    const frontendPdfHeight = 600

    const scaleX = pdfWidth / frontendPdfWidth
    const scaleY = pdfHeight / frontendPdfHeight

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
          if (eventData?.form && Array.isArray(eventData.form)) {
            const formField = eventData.form.find(f => f.id === field.formFieldId)
            
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
          if (eventData?.form && Array.isArray(eventData.form)) {
            const formField = eventData.form.find(f => f.id === field.formFieldId)
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
          // Need to get event name - will be passed from parent
          return certificate.eventName || 'Event'
        default:
          return ''
      }
    }

    // Process dynamic fields (new format)
    if (certificate.fields && Array.isArray(certificate.fields)) {
      for (const field of certificate.fields) {
        if (!field.position) continue
        
        const fieldText = getFieldText(field)
        if (!fieldText) continue
        
        const pdfFontSize = (field.fontSize || 12) * Math.min(scaleX, scaleY)
        const pdfYFromTop = (field.position.y || 0) * scaleY
        const drawY = pdfHeight - pdfYFromTop - pdfFontSize

        // Calculate text width and center it
        const textWidth = font.widthOfTextAtSize(fieldText, pdfFontSize)
        const centerX = (field.position.x || 0) * scaleX
        const pdfX = centerX - (textWidth / 2)

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
      if (certificate.name && certificate.name.position) {
        const nameText = `${attendee.first_name} ${attendee.last_name}`
        const pdfFontSize = (certificate.name.fontSize || 12) * Math.min(scaleX, scaleY)
        const pdfYFromTop = (certificate.name.position.y || 0) * scaleY
        const drawY = pdfHeight - pdfYFromTop - pdfFontSize

        // Calculate text width and center it
        const textWidth = font.widthOfTextAtSize(nameText, pdfFontSize)
        const centerX = (certificate.name.position.x || 0) * scaleX
        const pdfX = centerX - (textWidth / 2)

        firstPage.drawText(nameText, {
          x: pdfX,
          y: drawY,
          size: pdfFontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
      }
      
      // Add licence to the PDF
      if (certificate.licence && certificate.licence.position) {
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
          const pdfFontSize = (certificate.licence.fontSize || 12) * Math.min(scaleX, scaleY)
          const pdfYFromTop = (certificate.licence.position.y || 0) * scaleY
          const drawY = pdfHeight - pdfYFromTop - pdfFontSize

          // Calculate text width and center it
          const textWidth = font.widthOfTextAtSize(licenceText, pdfFontSize)
          const centerX = (certificate.licence.position.x || 0) * scaleX
          const pdfX = centerX - (textWidth / 2)

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
    
    // Generate a filename for the personalized certificate
    const timestamp = Date.now()
    const personalizedFilename = `certificate_${attendee.first_name}_${attendee.last_name}_${timestamp}.pdf`
    
    // Set appropriate headers for file download
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="${personalizedFilename}"`)
    setHeader(event, 'Content-Length', modifiedPdfBytes.length)
    
    return modifiedPdfBytes
    
  } catch (error) {
    console.error('Certificate generation failed:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({ 
      statusCode: 500, 
      statusMessage: 'Failed to generate certificate' 
    })
  }
})
