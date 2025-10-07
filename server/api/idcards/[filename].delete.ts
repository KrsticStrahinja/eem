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
  if (!targetPath.startsWith(path.resolve(baseDir))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid filename' })
  }

  try {
    await fsp.unlink(targetPath)
    return { ok: true }
  } catch (e: any) {
    if (e?.code === 'ENOENT') throw createError({ statusCode: 404, statusMessage: 'File not found' })
    console.error('Failed to delete identification card', e)
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete identification card' })
  }
})


