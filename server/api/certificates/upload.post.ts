import { readMultipartFormData } from 'h3'
import { promises as fsp } from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)
    if (!form || form.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No form data received' })
    }

    const filePart = form.find((p) => p.name === 'certificate' && p.filename)
    if (!filePart || !filePart.data) {
      throw createError({ statusCode: 400, statusMessage: 'Missing certificate file' })
    }

    const runtime = useRuntimeConfig()
    const projectRoot = process.cwd()
    const publicDir = path.join(projectRoot, 'public', 'certificates')

    await fsp.mkdir(publicDir, { recursive: true })

    const timestamp = Date.now()
    const safeName = filePart.filename?.replace(/[^a-zA-Z0-9_.-]/g, '_') || `certificate_${timestamp}.pdf`
    const filename = `${timestamp}_${safeName}`
    const filePath = path.join(publicDir, filename)

    await fsp.writeFile(filePath, filePart.data)

    const publicUrl = `/certificates/${filename}`

    return { ok: true, url: publicUrl, filename }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Certificate upload failed:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to upload certificate' })
  }
})


