import { promises as fsp } from 'fs'
import path from 'path'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { filename } = event.context.params || {}
  if (!filename) throw createError({ statusCode: 400, statusMessage: 'Missing filename' })

  // Build absolute path and ensure it's within public/certificates
  // In preview/production mode, files are served from .output/public/
  const projectRoot = process.cwd()
  const isPreview = projectRoot.includes('.output')
  const actualProjectRoot = isPreview ? path.resolve(projectRoot, '..') : projectRoot
  const baseDir = path.join(actualProjectRoot, '.output', 'public', 'certificates')
  const targetPath = path.resolve(baseDir, String(filename))
  if (!targetPath.startsWith(path.resolve(baseDir))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid filename' })
  }

  try {
    await fsp.unlink(targetPath)
    
    // Also remove DB rows in certificates table that reference this file in data.certificateFilename
    try {
      const supabase = await serverSupabaseClient(event)
      // Delete any rows whose data JSON has certificateFilename equal to provided filename
      await supabase
        .from('certificates')
        .delete()
        .eq('data->>certificateFilename', String(filename))
    } catch (dbErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete certificate DB row:', dbErr)
      // Do not fail the whole request if file deletion succeeded
    }

    return { ok: true }
  } catch (e: any) {
    if (e?.code === 'ENOENT') throw createError({ statusCode: 404, statusMessage: 'File not found' })
    // eslint-disable-next-line no-console
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete certificate' })
  }
})


