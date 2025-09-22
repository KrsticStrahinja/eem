import { promises as fs } from 'fs'
import { join } from 'path'

// Ensure log directory exists
async function ensureLogDirectory() {
  const logDir = join(process.cwd(), 'logs')
  try {
    await fs.access(logDir)
  } catch {
    await fs.mkdir(logDir, { recursive: true })
  }
  return logDir
}

// Format timestamp
function formatTimestamp() {
  return new Date().toISOString()
}

// Get today's log filename
function getTodayLogFilename() {
  const now = new Date()
  return `${now.toISOString().split('T')[0]}.log`
}

// Create log entry for database operation
export function createDbLogEntry(data) {
  const timestamp = formatTimestamp()
  const { operation, table, userEmail, error, action, payload, result } = data
  
  const logEntry = {
    timestamp,
    operation: `DB_${operation}`,
    table: `/supabase/${table}`,
    userEmail: userEmail || 'anonymous',
    status: error ? 'ERROR' : 'SUCCESS',
    action: action || `${operation} on ${table}`,
    error: error || null,
    payload: payload || null,
    result: result || null
  }
  
  return JSON.stringify(logEntry) + '\n'
}

// Write to log file
export async function writeDbLog(logEntry) {
  try {
    const logDir = await ensureLogDirectory()
    const filename = getTodayLogFilename()
    const filepath = join(logDir, filename)
    
    await fs.appendFile(filepath, logEntry, 'utf8')
    return { success: true, filepath }
  } catch (error) {
    console.error('Error writing to log file:', error)
    return { success: false, error: error.message }
  }
}

// Main logging function
export async function logDbOperation(data) {
  const logEntry = createDbLogEntry(data)
  return await writeDbLog(logEntry)
}

// Read log files
export async function getLogFiles() {
  try {
    const logDir = await ensureLogDirectory()
    const files = await fs.readdir(logDir)
    const logFiles = files
      .filter(file => file.endsWith('.log'))
      .sort((a, b) => b.localeCompare(a)) // Newest first
    
    return logFiles
  } catch (error) {
    console.error('Error reading log files:', error)
    return []
  }
}

// Read log file content
export async function readLogFile(filename) {
  try {
    const logDir = await ensureLogDirectory()
    const filepath = join(logDir, filename)
    const content = await fs.readFile(filepath, 'utf8')
    
    // Parse JSON lines
    const lines = content.trim().split('\n').filter(line => line.trim())
    const entries = lines.map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    }).filter(Boolean)
    
    return { success: true, entries }
  } catch (error) {
    console.error('Error reading log file:', error)
    return { success: false, error: error.message }
  }
}
