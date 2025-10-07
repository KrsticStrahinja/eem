import { readMultipartFormData } from 'h3'
import { promises as fsp } from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)
    if (!form || form.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No form data received' })
    }

    const filePart = form.find((p) => p.name === 'idcard' && p.filename)
    if (!filePart || !filePart.data) {
      throw createError({ statusCode: 400, statusMessage: 'Missing identification card file' })
    }

    // In preview/production mode, files are served from .output/public/
    // But uploads should go to the actual project public folder
    const projectRoot = process.cwd()
    const isPreview = projectRoot.includes('.output')
    const actualProjectRoot = isPreview ? path.resolve(projectRoot, '..') : projectRoot
    const publicDir = path.join(actualProjectRoot, '.output', 'public', 'idcards')

    await fsp.mkdir(publicDir, { recursive: true })

    const timestamp = Date.now()
    const safeName = filePart.filename?.replace(/[^a-zA-Z0-9_.-]/g, '_') || `idcard_${timestamp}.pdf`
    const filename = `${timestamp}_${safeName}`
    const filePath = path.join(publicDir, filename)

    await fsp.writeFile(filePath, filePart.data)

    const publicUrl = `/idcards/${filename}`


    return { ok: true, url: publicUrl, filename }
  } catch (err) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to upload identification card' })
  }
})


