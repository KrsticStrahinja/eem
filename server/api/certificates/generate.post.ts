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
    const projectRoot = process.cwd()
    const certificatePath = path.join(projectRoot, 'public', 'certificates', certificate.certificateFilename)
    
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
    const frontendPdfWidth = 595  // Exact PDF width in frontend
    const frontendPdfHeight = 842 // Exact PDF height in frontend
    
    const scaleX = pdfWidth / frontendPdfWidth   // Should be ~1.0 for same PDF
    const scaleY = pdfHeight / frontendPdfHeight // Should be ~1.0 for same PDF
    
    // No offset - match the new preview without offset  
    const editorOffsetX = 0

    // Fine-tuning for name
    const nameFinetuneOffsetX = -40 // Move even more left (negative = left)
    const nameFinetuneOffsetY = 25  // Move even more down (positive = down)

    // Fine-tuning for licence (different positioning)
    const licenceFinetuneOffsetX = -50 // Move even more left for licence
    const licenceFinetuneOffsetY = -5  // Move up for licence (negative = up)

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
        if (!fieldText) continue // Skip empty fields
        
        // Convert editor coordinates to PDF coordinates
        const pdfFontSize = (field.fontSize || 12) * Math.min(scaleX, scaleY)
        
        // Apply the same offset as frontend, then scale to PDF coordinates
        const editorXWithOffset = field.position.x + editorOffsetX
        const pdfX = editorXWithOffset * scaleX
        const pdfY = pdfHeight - (field.position.y * scaleY) // Convert from top-based to bottom-based

        // Apply fine-tuning adjustments based on field type
        const finetuneOffsetX = field.type === 'licence' ? licenceFinetuneOffsetX : nameFinetuneOffsetX
        const finetuneOffsetY = field.type === 'licence' ? licenceFinetuneOffsetY : nameFinetuneOffsetY
        
        const adjustedPdfX = pdfX + (finetuneOffsetX * scaleX)
        const adjustedPdfY = pdfY - (finetuneOffsetY * scaleY) // Negative because PDF Y is inverted
        
        // Calculate text width for centering
        const textWidth = font.widthOfTextAtSize(fieldText, pdfFontSize)
        const centeredPdfX = adjustedPdfX - (textWidth / 2)

        firstPage.drawText(fieldText, {
          x: centeredPdfX,
          y: adjustedPdfY,
          size: pdfFontSize,
          font: font,
          color: rgb(0, 0, 0), // Black color
        })
      }
    } else {
      // Fallback to legacy format for backward compatibility
      // Add name to the PDF
      if (certificate.name && certificate.name.position) {
        const nameText = `${attendee.first_name} ${attendee.last_name}`
        const pdfFontSize = (certificate.name.fontSize || 12) * Math.min(scaleX, scaleY)
        
        const editorXWithOffset = certificate.name.position.x + editorOffsetX
        const pdfX = editorXWithOffset * scaleX
        const pdfY = pdfHeight - (certificate.name.position.y * scaleY)

        const adjustedPdfX = pdfX + (nameFinetuneOffsetX * scaleX)
        const adjustedPdfY = pdfY - (nameFinetuneOffsetY * scaleY)
        
        const textWidth = font.widthOfTextAtSize(nameText, pdfFontSize)
        const centeredPdfX = adjustedPdfX - (textWidth / 2)

        firstPage.drawText(nameText, {
          x: centeredPdfX,
          y: adjustedPdfY,
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
          
          const editorXWithOffset = certificate.licence.position.x + editorOffsetX
          const pdfX = editorXWithOffset * scaleX
          const pdfY = pdfHeight - (certificate.licence.position.y * scaleY)

          const adjustedPdfX = pdfX + (licenceFinetuneOffsetX * scaleX)
          const adjustedPdfY = pdfY - (licenceFinetuneOffsetY * scaleY)
          
          const licenceTextWidth = font.widthOfTextAtSize(licenceText, pdfFontSize)
          const centeredPdfX = adjustedPdfX - (licenceTextWidth / 2)

          firstPage.drawText(licenceText, {
            x: centeredPdfX,
            y: adjustedPdfY,
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
