// Database monitoring logger
export const useSupabaseLogger = () => {
  const user = useSupabaseUser()

  // Log database operation for monitoring
  const logDbOperation = async (operation, table, error = null, payload = null, result = null) => {
    try {
      const userEmail = user.value?.email || null
      
      const logData = {
        operation,
        table,
        userEmail,
        error: error?.message || error,
        payload,
        result: result?.data || result
      }

      // Send to server for logging (non-blocking)
      $fetch('/api/logs/db', {
        method: 'POST',
        body: logData
      }).catch(() => {
        // Silent fail - don't break app if logging fails
        console.warn('Database logging failed')
      })
    } catch (logError) {
      // Don't break execution if logging fails
      console.warn('Failed to log database operation:', logError)
    }
  }

  // Wrapper function that logs database queries
  const loggedQuery = async (queryBuilder, operation, table, payload = null) => {
    try {
      const result = await queryBuilder
      
      // Log successful operation with result
      await logDbOperation(operation, table, null, payload, result)
      
      return result
    } catch (err) {
      // Log error
      await logDbOperation(operation, table, err, payload, null)
      
      throw err
    }
  }

  // Helper functions for different operations
  const logSelect = (queryBuilder, table, payload = null) => {
    return loggedQuery(queryBuilder, 'SELECT', table, payload)
  }

  const logInsert = (queryBuilder, table, payload = null) => {
    return loggedQuery(queryBuilder, 'INSERT', table, payload)
  }

  const logUpdate = (queryBuilder, table, payload = null) => {
    return loggedQuery(queryBuilder, 'UPDATE', table, payload)
  }

  const logDelete = (queryBuilder, table, payload = null) => {
    return loggedQuery(queryBuilder, 'DELETE', table, payload)
  }

  const logRpc = (queryBuilder, functionName, payload = null) => {
    return loggedQuery(queryBuilder, 'RPC', functionName, payload)
  }

  return {
    logSelect,
    logInsert,
    logUpdate,
    logDelete,
    logRpc
  }
}