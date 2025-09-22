// PATCH endpoint za optimizovane update pozive
export default defineEventHandler(async (event) => {
    try {
        const supabase = useSupabaseClient()
        const id = getRouterParam(event, 'id')
        const changes = await readBody(event) // Samo izmenjeni podaci
        
        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Template ID is required'
            })
        }
        
        // Dodaj updated_at timestamp
        const updateData = {
            ...changes,
            updated_at: new Date().toISOString()
        }
        
        // Update samo prosleđene podatke
        const { data, error } = await supabase
            .from('email_templates') // ili kako se zove tvoja tabela
            .update(updateData)
            .eq('id', id)
            .select('*')
            .single()
        
        if (error) throw error
        
        return data
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to update template',
            data: { error: error.message }
        })
    }
})