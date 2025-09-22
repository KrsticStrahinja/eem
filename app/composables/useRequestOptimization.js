// Globalni composable za optimizaciju Supabase requestova
export const useRequestOptimization = () => {
    // Globalni cache koji se deli između komponenti
    const globalCache = ref(new Map())
    const requestQueue = ref(new Map())
    const cacheExpiry = 5 * 60 * 1000 // 5 minuta

    const isCacheValid = (timestamp) => {
        return Date.now() - timestamp < cacheExpiry
    }

    // Deduplikacija istovremenih requestova
    const deduplicateRequest = async (key, requestFn) => {
        // Ako je request već u toku, čekaj rezultat
        if (requestQueue.value.has(key)) {
            return await requestQueue.value.get(key)
        }

        // Proveri cache
        const cached = globalCache.value.get(key)
        if (cached && isCacheValid(cached.timestamp)) {
            return cached.data
        }

        // Kreiraj novi request
        const requestPromise = requestFn().then(data => {
            // Cache rezultat
            globalCache.value.set(key, {
                data,
                timestamp: Date.now()
            })
            
            // Ukloni iz queue
            requestQueue.value.delete(key)
            
            return data
        }).catch(error => {
            // Ukloni iz queue i na error
            requestQueue.value.delete(key)
            throw error
        })

        // Dodaj u queue
        requestQueue.value.set(key, requestPromise)
        
        return await requestPromise
    }

    // Batch loading funkcija
    const batchLoad = async (requests) => {
        const results = {}
        const promises = []

        for (const [key, requestFn] of Object.entries(requests)) {
            promises.push(
                deduplicateRequest(key, requestFn).then(data => {
                    results[key] = data
                }).catch(error => {
                    console.error(`Error loading ${key}:`, error)
                    results[key] = null
                })
            )
        }

        await Promise.all(promises)
        return results
    }

    // Preload funkcija za anticipiranje potreba
    const preloadData = async (keys, requestFunctions) => {
        const preloadPromises = keys.map(key => {
            const requestFn = requestFunctions[key]
            if (requestFn) {
                return deduplicateRequest(key, requestFn).catch(() => {
                    // Ignoriši greške u preload-u
                })
            }
        })

        await Promise.allSettled(preloadPromises)
    }

    // Invalidate cache funkcija
    const invalidateCache = (pattern) => {
        if (typeof pattern === 'string') {
            globalCache.value.delete(pattern)
        } else if (pattern instanceof RegExp) {
            for (const key of globalCache.value.keys()) {
                if (pattern.test(key)) {
                    globalCache.value.delete(key)
                }
            }
        }
    }

    // Clear cache funkcija
    const clearCache = () => {
        globalCache.value.clear()
        requestQueue.value.clear()
    }

    // Cache statistics
    const getCacheStats = () => {
        const now = Date.now()
        let validEntries = 0
        let expiredEntries = 0

        for (const [key, entry] of globalCache.value.entries()) {
            if (isCacheValid(entry.timestamp)) {
                validEntries++
            } else {
                expiredEntries++
            }
        }

        return {
            totalEntries: globalCache.value.size,
            validEntries,
            expiredEntries,
            activeRequests: requestQueue.value.size
        }
    }

    // Cleanup expired entries
    const cleanupExpiredCache = () => {
        const now = Date.now()
        for (const [key, entry] of globalCache.value.entries()) {
            if (!isCacheValid(entry.timestamp)) {
                globalCache.value.delete(key)
            }
        }
    }

    // Auto cleanup svakih 10 minuta
    if (process.client) {
        setInterval(cleanupExpiredCache, 10 * 60 * 1000)
    }

    return {
        deduplicateRequest,
        batchLoad,
        preloadData,
        invalidateCache,
        clearCache,
        getCacheStats,
        cleanupExpiredCache
    }
}

// Singleton instance za globalno korišćenje
let globalOptimizer = null

export const useGlobalRequestOptimization = () => {
    if (!globalOptimizer) {
        globalOptimizer = useRequestOptimization()
    }
    return globalOptimizer
}