<template>
    <div>
        <TemplateEditor 
            v-model="template" 
            @save="handleSave"
            :loading="saving"
        />
    </div>
</template>

<script setup>
// Tvoj postojeći kod
const template = ref({
    id: 123,
    subject: 'Original subject',
    bodyHtml: '<p>Original content</p>',
    enabled: true
})

const originalTemplate = ref({ ...template.value })
const saving = ref(false)

// Koristi optimizovani update
const { updateWithPatch } = useOptimizedUpdate()

const handleSave = async (newTemplateData) => {
    try {
        saving.value = true
        
        // STARO - 2 requesta:
        // const current = await $fetch(`/api/templates/${template.value.id}`)
        // const updated = { ...current, ...newTemplateData }
        // await $fetch(`/api/templates/${template.value.id}`, { method: 'PUT', body: updated })
        
        // NOVO - 1 request, šalje samo izmene:
        const updatedTemplate = await updateWithPatch(
            `/api/templates/${template.value.id}`,
            originalTemplate.value,
            newTemplateData
        )
        
        // Ažuriraj lokalno stanje
        template.value = updatedTemplate
        originalTemplate.value = { ...updatedTemplate }

    } catch (error) {
        console.error('Update failed:', error)
    } finally {
        saving.value = false
    }
}
</script>