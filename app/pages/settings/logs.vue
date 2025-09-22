<template>
  <div class="w-full">
    <UDashboardNavbar title="Database Monitor" class="sticky top-0 z-50 bg-white/80 backdrop-blur-md">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>

      <template #trailing>
        <UBadge v-if="logFiles.length" :label="logFiles.length.toString()" variant="subtle" />
      </template>

      <template #right>
        <div class="flex gap-2">
          <UButton
            @click="refreshLogs"
            :loading="loading"
            color="primary"
            variant="solid"
            size="sm"
          >
            <template #leading>
              <UIcon name="i-lucide-refresh-cw" />
            </template>
            Refresh
          </UButton>

          <UButton
            @click="autoRefresh = !autoRefresh"
            :color="autoRefresh ? 'green' : 'gray'"
            variant="solid"
            size="sm"
          >
            <template #leading>
              <UIcon :name="autoRefresh ? 'i-lucide-play' : 'i-lucide-pause'" />
            </template>
            {{ autoRefresh ? 'Auto: ON' : 'Auto: OFF' }}
          </UButton>
        </div>
      </template>
    </UDashboardNavbar>

    <!-- Filters -->
    <div class="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div class="flex gap-3 items-end">
        <div v-if="selectedFile" class="flex-1 max-w-sm">
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Search:</label>
          <UInput
            v-model="searchQuery"
            @input="filterLogs"
            placeholder="Search operations..."
            icon="i-lucide-search"
          />
        </div>
      </div>
    </div>

    <!-- Log Files List -->
    <div v-if="!selectedFile" class="p-4">
      <div v-if="logFiles.length === 0" class="text-center text-gray-500 py-8">
        <UIcon name="i-lucide-database" class="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p class="text-lg font-medium">No database logs found</p>
        <p class="text-sm mt-2">Database operations will be logged here</p>
      </div>
      
      <div v-else class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <UCard 
          v-for="file in logFiles" 
          :key="file"
          @click="selectFile(file)"
          class="cursor-pointer transition-all hover:shadow-lg"
        >
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-database" class="h-5 w-5 text-primary" />
              <span class="font-medium text-gray-900 dark:text-white">{{ file }}</span>
            </div>
            <span class="text-sm text-gray-500">{{ formatFileDate(file) }}</span>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Log Content -->
    <div v-if="selectedFile" class="p-4">
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-database" class="h-5 w-5 text-primary" />
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ selectedFile }}</h3>
          <UBadge v-if="logEntries.length" :label="`${logEntries.length} operations`" variant="soft" />
        </div>
        <UButton 
          @click="clearSelection"
          color="neutral"
          variant="soft"
          size="sm"
        >
          <template #leading>
            <UIcon name="i-lucide-arrow-left" />
          </template>
          Back to files
        </UButton>
      </div>

      <div v-if="loadingContent" class="text-center py-8">
        <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 mx-auto mb-2 text-primary" />
        <p class="text-sm text-gray-600">Loading database operations...</p>
      </div>

      <div v-else-if="displayedEntries.length === 0" class="text-center text-gray-500 py-8">
        <UIcon name="i-lucide-search-x" class="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p class="text-lg font-medium">No operations found</p>
        <p class="text-sm mt-1" v-if="searchQuery">Try adjusting your search query</p>
      </div>

      <div v-else class="space-y-2">
        <UCard 
          v-for="(entry, index) in displayedEntries" 
          :key="index"
          :ui="{ body: 'p-0' }"
        >
          <div class="">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <!-- Operation Badge -->
                <UBadge
                  :label="formatOperation(entry.operation)"
                  :color="getOperationBadgeColor(entry.operation)"
                  variant="soft"
                  size="sm"
                />
                
                <!-- Table -->
                <span class="text-sm font-mono text-gray-700 dark:text-gray-300">{{ entry.table }}</span>
                
                <!-- User -->
                <UBadge 
                  v-if="entry.userEmail" 
                  :label="entry.userEmail"
                  color="blue"
                  variant="soft"
                  size="sm"
                />
              </div>

              <div class="flex items-center gap-2">
                <!-- Expand Button -->
                <UButton
                  v-if="entry.payload || entry.result"
                  @click="toggleExpanded(index)"
                  color="neutral"
                  variant="soft"
                  size="xs"n
                  square
                >
                  <UIcon 
                    name="i-lucide-chevron-down" 
                    class="w-3 h-3 transition-transform" 
                    :class="{ 'rotate-180': expandedEntries.has(index) }" 
                  />
                </UButton>
                
                <!-- Status -->
                <UBadge 
                  :label="entry.status"
                  :color="entry.status === 'SUCCESS' ? 'green' : 'red'"
                  variant="solid"
                  size="sm"
                />
                
                <!-- Timestamp -->
                <span class="text-xs text-gray-400 font-mono">{{ formatTime(entry.timestamp) }}</span>
              </div>
            </div>
            
            <!-- Action Description -->
            <div v-if="entry.action" class="mt-2 flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <UIcon :name="getActionIcon(entry.operation)" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span class="text-sm text-blue-700 dark:text-blue-300">{{ entry.action }}</span>
            </div>
            
            <!-- Error -->
            <div v-if="entry.error" class="mt-2 flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md border-l-4 border-red-500">
              <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-red-600 dark:text-red-400" />
              <span class="text-sm text-red-700 dark:text-red-300">{{ entry.error }}</span>
            </div>
          </div>

          <!-- Expanded Details -->
          <div v-if="expandedEntries.has(index)" class="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-3">
            <!-- Payload (what was sent) -->
            <div v-if="entry.payload" class="mb-3">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  {{ getPayloadTitle(entry.operation) }}
                </h4>
                <UButton
                  @click="copyToClipboard(formatJson(entry.payload))"
                  color="neutral"
                  variant="soft"
                  size="xs"
                >
                  <template #leading>
                    <UIcon name="i-lucide-copy" />
                  </template>
                  Copy
                </UButton>
              </div>
              <pre class="bg-gray-800 text-green-400 p-3 rounded-md text-xs overflow-x-auto max-h-48 overflow-y-auto">{{ formatJson(entry.payload) }}</pre>
            </div>

            <!-- Result (what was returned) -->
            <div v-if="entry.result">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  {{ getResultTitle(entry.operation) }}
                </h4>
                <UButton
                  @click="copyToClipboard(formatJson(entry.result))"
                  color="neutral"
                  variant="soft"
                  size="xs"
                >
                  <template #leading>
                    <UIcon name="i-lucide-copy" />
                  </template>
                  Copy
                </UButton>
              </div>
              <pre class="bg-gray-800 text-blue-400 p-3 rounded-md text-xs overflow-x-auto max-h-48 overflow-y-auto">{{ formatJson(entry.result) }}</pre>
            </div>

            <!-- Update Diff (special for UPDATE operations) -->
            <div v-if="isUpdateOperation(entry.operation) && entry.payload" class="mt-3">
              <div class="flex items-center gap-2 mb-2">
                <UIcon name="i-lucide-git-compare" class="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <h4 class="font-medium text-gray-900 dark:text-gray-100 text-sm">Update Data Sent</h4>
              </div>
              <div class="space-y-1 text-xs">
                <div v-for="[field, value] in Object.entries(entry.payload)" :key="field" class="flex items-center gap-2">
                  <span class="font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">{{ field }}:</span>
                  <span class="text-blue-600 dark:text-blue-400">{{ formatValue(value) }}</span>
                </div>
              </div>

              <!-- Show result if available -->
              <div v-if="entry.result && Object.keys(entry.result).length > 1" class="mt-3">
                <div class="flex items-center gap-2 mb-2">
                  <UIcon name="i-lucide-check-circle" class="w-4 h-4 text-green-600 dark:text-green-400" />
                  <h4 class="font-medium text-gray-900 dark:text-gray-100 text-sm">Result</h4>
                </div>
                <div class="space-y-1 text-xs">
                  <div v-for="[field, value] in Object.entries(entry.result)" :key="field" class="flex items-center gap-2">
                    <span class="font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">{{ field }}:</span>
                    <span class="text-green-600 dark:text-green-400">{{ formatValue(value) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-4 flex justify-center">
        <UPagination
          v-model="currentPage"
          :page-count="totalPages"
          :total="filteredEntries.length"
          :max="7"
          @update:modelValue="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Meta
definePageMeta({
  layout: 'default'
})

// Reactive state
const logFiles = ref([])
const selectedFile = ref('')
const logEntries = ref([])
const searchQuery = ref('')
const loading = ref(false)
const loadingContent = ref(false)
const autoRefresh = ref(false)
const currentPage = ref(1)
const itemsPerPage = 20
const expandedEntries = ref(new Set())
const toast = useToast()

let refreshInterval = null

// Computed for log file options
const logFileOptions = computed(() => [
  { label: 'Select a log file...', value: '' },
  ...logFiles.value.map(file => ({ label: file, value: file }))
])

// Filter and pagination
const filteredEntries = computed(() => {
  if (!searchQuery.value) return logEntries.value
  
  const query = searchQuery.value.toLowerCase()
  return logEntries.value.filter(entry => 
    entry.action?.toLowerCase().includes(query) ||
    entry.userEmail?.toLowerCase().includes(query) ||
    entry.operation?.toLowerCase().includes(query) ||
    entry.table?.toLowerCase().includes(query) ||
    entry.error?.toLowerCase().includes(query)
  )
})

const totalPages = computed(() => 
  Math.ceil(filteredEntries.value.length / itemsPerPage)
)

const displayedEntries = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredEntries.value.slice(start, end)
})

// Methods
async function fetchLogFiles() {
  try {
    loading.value = true
    const { data } = await $fetch('/api/logs')
    logFiles.value = data.files || []
  } catch (error) {
    console.error('Error fetching log files:', error)
    logFiles.value = []
    toast.add({
      title: 'Error loading log files',
      description: 'Failed to fetch log files',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function loadLogContent() {
  if (!selectedFile.value) return
  
  try {
    loadingContent.value = true
    const { data } = await $fetch(`/api/logs?file=${selectedFile.value}`)
    // Sort entries by timestamp (newest first)
    logEntries.value = (data.entries || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    currentPage.value = 1
    expandedEntries.value = new Set()
  } catch (error) {
    console.error('Error loading log content:', error)
    logEntries.value = []
    toast.add({
      title: 'Error loading log content',
      description: 'Failed to load log entries',
      color: 'error'
    })
  } finally {
    loadingContent.value = false
  }
}

function selectFile(file) {
  selectedFile.value = file
  loadLogContent()
}

function clearSelection() {
  selectedFile.value = ''
  logEntries.value = []
  searchQuery.value = ''
  expandedEntries.value = new Set()
}

function filterLogs() {
  currentPage.value = 1
}

function handlePageChange(page) {
  currentPage.value = page
  // Close all expanded entries when changing pages
  expandedEntries.value = new Set()
}

function refreshLogs() {
  if (selectedFile.value) {
    loadLogContent()
  } else {
    fetchLogFiles()
  }
}

function formatFileDate(filename) {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/)
  if (match) {
    return new Date(match[1]).toLocaleDateString()
  }
  return ''
}

function formatOperation(operation) {
  return operation?.replace('DB_', '') || ''
}

function getActionIcon(operation) {
  if (!operation) return 'i-lucide-activity'

  const op = operation.replace('DB_', '')
  switch (op) {
    case 'SELECT': return 'i-lucide-eye'
    case 'INSERT': return 'i-lucide-plus'
    case 'UPDATE': return 'i-lucide-edit'
    case 'DELETE': return 'i-lucide-trash-2'
    case 'RPC': return 'i-lucide-zap'
    default: return 'i-lucide-activity'
  }
}

function getOperationBadgeColor(operation) {
  if (!operation) return 'gray'

  const op = operation.replace('DB_', '')
  switch (op) {
    case 'SELECT': return 'secondary'
    case 'INSERT': return 'primary'
    case 'UPDATE': return 'warning'
    case 'DELETE': return 'error'
    case 'RPC': return 'purple'
    default: return 'gray'
  }
}

function getOperationColor(operation) {
  if (!operation) return 'gray'

  const op = operation.replace('DB_', '')
  switch (op) {
    case 'SELECT': return 'blue'
    case 'INSERT': return 'green'
    case 'UPDATE': return 'yellow'
    case 'DELETE': return 'red'
    case 'RPC': return 'purple'
    default: return 'gray'
  }
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('sr-RS', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

function toggleExpanded(index) {
  const current = expandedEntries.value
  if (current.has(index)) {
    current.delete(index)
  } else {
    current.add(index)
  }
  expandedEntries.value = new Set(current)
}

function formatJson(obj) {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({
      title: 'Copied to clipboard!',
      description: 'Content has been copied to your clipboard.',
      color: 'success',
      icon: 'i-lucide-check',
      timeout: 3000
    })
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    toast.add({
      title: 'Copy failed',
      description: 'Failed to copy content to clipboard.',
      color: 'error',
      icon: 'i-lucide-x',
      timeout: 3000
    })
  }
}

function getPayloadTitle(operation) {
  const op = operation?.replace('DB_', '') || ''
  switch (op) {
    case 'SELECT': return 'Query Filters'
    case 'INSERT': return 'Data to Insert'
    case 'UPDATE': return 'Data to Update'
    case 'DELETE': return 'Delete Criteria'
    default: return 'Request Data'
  }
}

function getResultTitle(operation) {
  const op = operation?.replace('DB_', '') || ''
  switch (op) {
    case 'SELECT': return 'Query Results'
    case 'INSERT': return 'Created Record'
    case 'UPDATE': return 'Updated Record'
    case 'DELETE': return 'Deletion Result'
    default: return 'Response Data'
  }
}

function isUpdateOperation(operation) {
  return operation?.includes('UPDATE')
}

function getUpdateChanges(payload, result) {
  if (!payload || !result) return []

  const changes = []

  // For UPDATE operations, we assume payload contains new values
  // and result contains the updated object returned by Supabase
  // Since we don't have old values, we'll show what was sent vs what was returned

  for (const [key, newValue] of Object.entries(payload)) {
    if (key === 'id') continue // Skip ID field

    // If result has the same field, compare them
    if (result.hasOwnProperty(key)) {
      const resultValue = result[key]
      if (JSON.stringify(resultValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          old: resultValue,
          new: newValue
        })
      }
    } else {
      // If result doesn't have this field, it means the update was successful
      // and the new value was applied (but result only contains selected fields)
      changes.push({
        field: key,
        old: 'N/A',
        new: newValue
      })
    }
  }

  return changes
}

function formatValue(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 47) + '...'
  }
  return String(value)
}

// Lifecycle
onMounted(() => {
  fetchLogFiles()
  
  // Auto refresh
  refreshInterval = setInterval(() => {
    if (autoRefresh.value) {
      refreshLogs()
    }
  }, 10000) // Every 10 seconds
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>