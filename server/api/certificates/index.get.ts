import { promises as fsp } from 'fs'
import path from 'path'

export default defineEventHandler(async () => {
  // In preview/production mode, files are served from .output/public/
  const projectRoot = process.cwd()
  const isPreview = projectRoot.includes('.output')
  const actualProjectRoot = isPreview ? path.resolve(projectRoot, '..') : projectRoot
  const dir = path.join(actualProjectRoot, '.output', 'public', 'certificates')

  try {
    await fsp.mkdir(dir, { recursive: true })
    const entries = await fsp.readdir(dir)
    const files = await Promise.all(entries.map(async (name) => {
      const full = path.join(dir, name)
      const stat = await fsp.stat(full)
      if (!stat.isFile()) return null
      return {
        filename: name,
        url: `/certificates/${name}`,
        size: stat.size,
        modifiedAt: stat.mtimeMs
      }
    }))

    return (files.filter(Boolean) as Array<{ filename: string; url: string; size: number; modifiedAt: number }>)
      .sort((a, b) => b.modifiedAt - a.modifiedAt)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to list certificates', e)
    throw createError({ statusCode: 500, statusMessage: 'Failed to list certificates' })
  }
})


