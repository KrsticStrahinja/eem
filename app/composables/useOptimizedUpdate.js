// Jednostavan composable za optimizovane update pozive
export const useOptimizedUpdate = () => {
    
    // PATCH update - šalje samo izmenjene podatke
    const updateWithPatch = async (url, originalData, newData) => {
        // Poredi staro i novo stanje i šalje samo izmene
        const changes = {}
        
        Object.keys(newData).forEach(key => {
            if (newData[key] !== originalData[key]) {
                changes[key] = newData[key]
            }
        })
        
        // Ako nema izmena, ne šalji request
        if (Object.keys(changes).length === 0) {
            return originalData
        }
        
        // Šalji samo izmenjene podatke
        return await $fetch(url, {
            method: 'PATCH',
            body: changes
        })
    }
    
    return {
        updateWithPatch
    }
}