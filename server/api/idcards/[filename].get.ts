import { promises as fsp } from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  const { filename } = event.context.params || {}
  if (!filename) throw createError({ statusCode: 400, statusMessage: 'Missing filename' })

  // In preview/production mode, files are served from .output/public/
  const projectRoot = process.cwd()
  const isPreview = projectRoot.includes('.output')
  const actualProjectRoot = isPreview ? path.resolve(projectRoot, '..') : projectRoot
  const baseDir = path.join(actualProjectRoot, '.output', 'public', 'idcards')
  const targetPath = path.resolve(baseDir, String(filename))


  // Security check - ensure the resolved path is within the base directory
  if (!targetPath.startsWith(path.resolve(baseDir))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid filename' })
  }

  try {
    let fileContent = await fsp.readFile(targetPath)
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Cache-Control', 'public, max-age=604800')
    // Remove X-Frame-Options to allow embedding in iframes
    return fileContent
  } catch (e: any) {
    if (e?.code === 'ENOENT') {
      // Try to find the file in certificates folder as fallback
      const certificatesBaseDir = path.join(process.cwd(), '.output', 'public', 'certificates')
      const certificatesTargetPath = path.resolve(certificatesBaseDir, String(filename))

      try {
        const fileContent = await fsp.readFile(certificatesTargetPath)
        setHeader(event, 'Content-Type', 'application/pdf')
        setHeader(event, 'Cache-Control', 'public, max-age=604800')
        return fileContent
      } catch (certError: any) {
        throw createError({ statusCode: 404, statusMessage: 'File not found' })
      }
    }
    throw createError({ statusCode: 500, statusMessage: 'Failed to read file' })
  }
})
